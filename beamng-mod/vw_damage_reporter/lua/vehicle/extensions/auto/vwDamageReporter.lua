local M = {}

local CONFIG = {
    API_URL = "http://127.0.0.1:8000/api/v1/beamng/crash-event",
    DAMAGE_THRESHOLD = 0.05,
    POLL_INTERVAL = 0.25,
    COOLDOWN = 2.0
}

local state = {
    previousDamage = {},
    lastCrashTime = 0,
    pollTimer = 0,
    collisionCount = 0
}

-- Simple JSON encoder
local function toJson(val)
    if type(val) == "table" then
        local isArray = #val > 0
        local parts = {}
        if isArray then
            for _, v in ipairs(val) do
                table.insert(parts, toJson(v))
            end
            return "[" .. table.concat(parts, ",") .. "]"
        else
            for k, v in pairs(val) do
                table.insert(parts, '"' .. tostring(k) .. '":' .. toJson(v))
            end
            return "{" .. table.concat(parts, ",") .. "}"
        end
    elseif type(val) == "string" then
        return '"' .. val:gsub('"', '\\"') .. '"'
    elseif type(val) == "number" then
        if val ~= val or val == math.huge or val == -math.huge then return "0" end
        return tostring(val)
    elseif type(val) == "boolean" then
        return tostring(val)
    end
    return "null"
end

local function getVehicleInfo()
    local info = { id = obj:getId() or 0, name = "Unknown", model = "unknown", brand = "Unknown", year = 0, plate = "N/A" }
    if v and v.data and v.data.information then
        local i = v.data.information
        info.name = i.name or info.name
        info.model = i.model or info.model
        info.brand = i.brand or info.brand
        info.year = i.year or info.year
    end
    if electrics and electrics.values then
        info.plate = electrics.values.licenseText or info.plate
    end
    return info
end

local function getPartDamage()
    local parts = {}
    if beamstate then
        local data = beamstate.getPartDamageData()
        if data then
            for name, part in pairs(data) do
                local dmg = type(part) == "table" and part.damage or part
                local label = type(part) == "table" and part.name or name
                parts[name] = { damage = dmg or 0, name = label or name }
            end
        end
    end
    return parts
end

local function getTotalDamage(parts)
    local total, count = 0, 0
    for _, p in pairs(parts) do
        total = total + (p.damage or 0)
        count = count + 1
    end
    return count > 0 and (total / count) or 0
end

local function sendReport(report)
    local json = toJson(report)
    log("I", "VW Damage Reporter", "Sending report to API...")
    
    -- Vehicle extensions can't use core_http directly - must go through GE Lua
    local luaCmd = string.format([[
        local http = require('socket.http')
        local ltn12 = require('ltn12')
        local response = {}
        local result, code = http.request{
            url = %q,
            method = "POST",
            source = ltn12.source.string(%q),
            sink = ltn12.sink.table(response),
            headers = {
                ["Content-Type"] = "application/json",
                ["Content-Length"] = %d
            }
        }
        if code == 200 or code == 201 then
            log("I", "VW Damage Reporter", "Report sent successfully!")
        else
            log("W", "VW Damage Reporter", "Failed to send report: " .. tostring(code))
        end
    ]], CONFIG.API_URL, json, #json)
    
    obj:queueGameEngineLua(luaCmd)
end

local function detectCollision()
    local current = getPartDamage()
    local currentTotal = getTotalDamage(current)
    local previousTotal = getTotalDamage(state.previousDamage)
    local delta = currentTotal - previousTotal
    local now = os.clock()

    if delta >= CONFIG.DAMAGE_THRESHOLD and (now - state.lastCrashTime) >= CONFIG.COOLDOWN then
        state.collisionCount = state.collisionCount + 1
        state.lastCrashTime = now
        
        -- Find parts damaged in this collision
        local newParts = {}
        for name, part in pairs(current) do
            local prev = state.previousDamage[name]
            local prevDmg = prev and prev.damage or 0
            local partDelta = part.damage - prevDmg
            if partDelta > 0.001 then
                table.insert(newParts, { name = part.name, delta = partDelta, damage = part.damage })
            end
        end
        table.sort(newParts, function(a, b) return a.delta > b.delta end)

        -- Log collision
        local info = getVehicleInfo()
        log("I", "VW Damage Reporter", "========================================")
        log("I", "VW Damage Reporter", string.format("COLLISION #%d | %s %s", state.collisionCount, info.brand, info.name))
        log("I", "VW Damage Reporter", string.format("Damage: +%.1f (Total: %.1f)", delta * 100, currentTotal * 100))
        for i, p in ipairs(newParts) do
            log("I", "VW Damage Reporter", string.format("  %d. %s: +%.1f", i, p.name, p.delta * 100))
        end
        log("I", "VW Damage Reporter", "========================================")
    end

    state.previousDamage = current
end

function M.onExtensionLoaded()
    local info = getVehicleInfo()
    log("I", "VW Damage Reporter", string.format("Loaded | %s %s | Plate: %s", info.brand, info.name, info.plate))
end

function M.updateGFX(dt)
    state.pollTimer = state.pollTimer + dt
    if state.pollTimer >= CONFIG.POLL_INTERVAL then
        state.pollTimer = 0
        detectCollision()
    end
end

function M.onReset()
    if state.collisionCount > 0 then
        local current = getPartDamage()
        local info = getVehicleInfo()
        local totalDamage = getTotalDamage(current)
        
        -- Collect all damaged parts
        local parts = {}
        local partDamage = {}
        local brokenParts = {}
        local totalParts = 0
        
        for name, part in pairs(current) do
            totalParts = totalParts + 1
            partDamage[part.name] = part.damage  -- Use human-readable name as key
            if part.damage > 0 then
                table.insert(parts, { name = part.name, partId = name, damage = part.damage })
                if part.damage >= 0.8 then
                    table.insert(brokenParts, part.name)  -- Use human-readable name
                end
            end
        end
        table.sort(parts, function(a, b) return a.damage > b.damage end)

        -- Log summary
        log("I", "VW Damage Reporter", "========================================")
        log("I", "VW Damage Reporter", string.format("RESET | %d collisions | %.1f total damage", state.collisionCount, totalDamage * 100))
        for i, p in ipairs(parts) do
            log("I", "VW Damage Reporter", string.format("  %d. %s: %.1f", i, p.name, p.damage * 100))
        end
        log("I", "VW Damage Reporter", "========================================")

        -- Send report
        local pos = obj:getPosition()
        local vel = obj:getVelocity()
        local speed = math.sqrt(vel.x^2 + vel.y^2 + vel.z^2)
        
        sendReport({
            event_type = "crash_report",
            timestamp = os.time(),
            timestamp_iso = os.date("!%Y-%m-%dT%H:%M:%SZ"),
            vehicle = info,
            position = { x = pos.x, y = pos.y, z = pos.z },
            velocity = { x = vel.x, y = vel.y, z = vel.z, speed_ms = speed, speed_kmh = speed * 3.6, speed_mph = speed * 2.237 },
            damage = {
                total_damage = totalDamage,
                previous_damage = 0,
                damage_delta = totalDamage,
                part_damage = partDamage,
                damage_by_zone = { front = 0, rear = 0, left = 0, right = 0, top = 0, bottom = 0 },
                broken_parts = brokenParts,
                broken_parts_count = #brokenParts,
                damaged_parts_count = #parts,
                total_parts_count = totalParts,
                parts = parts
            },
            metadata = { mod_version = "1.2.0", collision_count = state.collisionCount, damage_threshold = CONFIG.DAMAGE_THRESHOLD }
        })
    end

    state.previousDamage = {}
    state.lastCrashTime = 0
    state.collisionCount = 0
    log("I", "VW Damage Reporter", "State cleared")
end

return M
