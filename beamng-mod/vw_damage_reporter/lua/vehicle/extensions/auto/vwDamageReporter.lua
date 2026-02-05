local M = {}
M.name = "VW Damage Reporter"

local CONFIG = {
    API_URL = "https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/beamng/crash-event",
    DAMAGE_THRESHOLD = 0.05,
    POLL_INTERVAL = 0.25,
    HTTP_TIMEOUT = 5.0,
    RETRY_ATTEMPTS = 3,
    RETRY_DELAY = 1.0,
    CRASH_COOLDOWN = 2.0
}

local state = {
    previousDamage = {},
    lastCrashTime = 0,
    pollTimer = 0,
    crashQueue = {},
    isProcessingQueue = false,
    lastCollision = nil
}

local function getCurrentTime()
    return os.clock()
end

local function tableToJson(tbl)
    local function serialize(val, indent)
        indent = indent or 0
        local spaces = string.rep("  ", indent)
        if type(val) == "table" then
            local isArray = #val > 0
            local result = isArray and "[\n" or "{\n"
            local items = {}
            if isArray then
                for i, v in ipairs(val) do
                    table.insert(items, spaces .. "  " .. serialize(v, indent + 1))
                end
            else
                for k, v in pairs(val) do
                    local key = type(k) == "string" and '"' .. k .. '"' or tostring(k)
                    table.insert(items, spaces .. "  " .. key .. ": " .. serialize(v, indent + 1))
                end
            end
            result = result .. table.concat(items, ",\n") .. "\n" .. spaces
            result = result .. (isArray and "]" or "}")
            return result
        elseif type(val) == "string" then
            return '"' .. val:gsub('"', '\\"'):gsub("\n", "\\n") .. '"'
        elseif type(val) == "number" then
            if val ~= val then return "null" end
            if val == math.huge or val == -math.huge then return "null" end
            return tostring(val)
        elseif type(val) == "boolean" then
            return tostring(val)
        elseif val == nil then
            return "null"
        else
            return '"' .. tostring(val) .. '"'
        end
    end
    return serialize(tbl)
end

local function getVehicleInfo()
    local info = {
        id = obj:getId() or "unknown",
        name = "Unknown",
        model = "unknown",
        brand = "Unknown",
        year = 0,
        plate = "N/A"
    }
    
    if v and v.data and v.data.information then
        info.name = v.data.information.name or info.name
        info.model = v.data.information.model or info.model
        info.brand = v.data.information.brand or info.brand
        info.year = v.data.information.year or info.year
    end
    
    if electrics and electrics.values then
        info.plate = electrics.values.licenseText or info.plate
    end
    
    return info
end

local function getVehiclePosition()
    local pos = obj:getPosition()
    return {
        x = pos.x or 0,
        y = pos.y or 0,
        z = pos.z or 0
    }
end

local function getVehicleVelocity()
    local vel = obj:getVelocity()
    local speed = math.sqrt(vel.x^2 + vel.y^2 + vel.z^2)
    return {
        x = vel.x or 0,
        y = vel.y or 0,
        z = vel.z or 0,
        speed_ms = speed,
        speed_kmh = speed * 3.6,
        speed_mph = speed * 2.237
    }
end

local function getVehicleRotation()
    local rot = obj:getRotation()
    return {
        x = rot.x or 0,
        y = rot.y or 0,
        z = rot.z or 0,
        w = rot.w or 1
    }
end

local function getPartDamage()
    local parts = {}
    if beamstate then
        local partDamage = beamstate.getPartDamageData()
        if partDamage then
            for partName, partData in pairs(partDamage) do
                -- partData is a table with {damage, name} fields
                if type(partData) == "table" then
                    parts[partName] = {
                        damage = partData.damage or 0,
                        name = partData.name or partName
                    }
                elseif type(partData) == "number" then
                    parts[partName] = {
                        damage = partData,
                        name = partName
                    }
                end
            end
        end
    end
    return parts
end

local function getTotalDamage(parts)
    local total = 0
    local count = 0
    for _, partData in pairs(parts) do
        local dmg = type(partData) == "table" and partData.damage or partData
        total = total + (dmg or 0)
        count = count + 1
    end
    return count > 0 and (total / count) or 0
end

local function buildCrashReport(vehicleInfo, allDamagedParts, totalDamage, damageDelta, totalParts)
    local report = {
        event_type = "crash_detected",
        timestamp = os.time(),
        timestamp_iso = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        vehicle = vehicleInfo,
        position = getVehiclePosition(),
        velocity = getVehicleVelocity(),
        rotation = getVehicleRotation(),
        damage = {
            total_damage = totalDamage,
            damage_delta = damageDelta,
            damaged_parts_count = #allDamagedParts,
            total_parts_count = totalParts,
            parts = allDamagedParts
        },
        metadata = {
            mod_version = "1.1.0",
            beamng_version = beamng_version or "unknown",
            damage_threshold = CONFIG.DAMAGE_THRESHOLD
        }
    }
    return report
end

local function sendHttpRequest(url, data, callback, retryCount)
    retryCount = retryCount or 0
    local jsonData = tableToJson(data)
    
    log("I", "VW Damage Reporter", string.format("Sending HTTP request to %s (attempt %d)", url, retryCount + 1))
    
    if extensions and extensions.core_http then
        extensions.core_http.request({
            url = url,
            method = "POST",
            body = jsonData,
            headers = {
                ["Content-Type"] = "application/json",
                ["Accept"] = "application/json",
                ["X-BeamNG-Mod"] = "vw_damage_reporter"
            },
            timeout = CONFIG.HTTP_TIMEOUT,
            callback = function(response)
                if response.ok then
                    log("I", "VW Damage Reporter", "Crash report sent successfully!")
                    if callback then callback(true, response) end
                else
                    log("W", "VW Damage Reporter", string.format("HTTP request failed: %s", response.error or "Unknown error"))
                    if retryCount < CONFIG.RETRY_ATTEMPTS then
                        log("I", "VW Damage Reporter", string.format("Retrying in %.0f seconds...", CONFIG.RETRY_DELAY))
                        table.insert(state.crashQueue, {
                            url = url,
                            data = data,
                            callback = callback,
                            retryCount = retryCount + 1,
                            retryTime = getCurrentTime() + CONFIG.RETRY_DELAY
                        })
                    else
                        log("E", "VW Damage Reporter", "Max retries reached, giving up")
                        if callback then callback(false, response) end
                    end
                end
            end
        })
    else
        local status, socket = pcall(require, "socket.http")
        local ltn12_status, ltn12 = pcall(require, "ltn12")
        if status and ltn12_status then
            local response, code = socket.request{
                url = url,
                method = "POST",
                source = ltn12.source.string(jsonData),
                headers = {
                    ["Content-Type"] = "application/json",
                    ["Content-Length"] = #jsonData
                }
            }
            
            if code == 200 or code == 201 then
                log("I", "VW Damage Reporter", "Crash report sent successfully (socket)!")
                if callback then callback(true, {body = response}) end
            else
                log("W", "VW Damage Reporter", string.format("HTTP request failed (socket): %s", tostring(code)))
                if callback then callback(false, {error = code}) end
            end
        else
            log("E", "VW Damage Reporter", "No HTTP library available! Cannot send crash data.")
            if callback then callback(false, {error = "No HTTP library"}) end
        end
    end
end

local function processQueue()
    if state.isProcessingQueue or #state.crashQueue == 0 then
        return
    end
    state.isProcessingQueue = true
    local currentTime = getCurrentTime()
    local newQueue = {}
    for _, item in ipairs(state.crashQueue) do
        if item.retryTime <= currentTime then
            sendHttpRequest(item.url, item.data, item.callback, item.retryCount)
        else
            table.insert(newQueue, item)
        end
    end
    state.crashQueue = newQueue
    state.isProcessingQueue = false
end

local function detectCollision()
    local currentParts = getPartDamage()
    local currentTotal = getTotalDamage(currentParts)
    local previousTotal = getTotalDamage(state.previousDamage)
    
    local damageDelta = currentTotal - previousTotal
    local currentTime = getCurrentTime()
    
    if damageDelta >= CONFIG.DAMAGE_THRESHOLD then
        if currentTime - state.lastCrashTime >= CONFIG.CRASH_COOLDOWN then
            local vehicleInfo = getVehicleInfo()
            
            -- Collect ALL parts with ANY damage (not just newly damaged)
            local allDamagedParts = {}
            local totalParts = 0
            
            for partName, partData in pairs(currentParts) do
                totalParts = totalParts + 1
                local currentDmg = partData.damage or 0
                
                if currentDmg > 0 then
                    table.insert(allDamagedParts, {
                        name = partData.name or partName,
                        partId = partName,
                        damage = currentDmg
                    })
                end
            end
            
            -- Sort by damage (most damaged first)
            table.sort(allDamagedParts, function(a, b) return a.damage > b.damage end)
            
            -- Log collision details
            log("I", "VW Damage Reporter", "========================================")
            log("I", "VW Damage Reporter", "COLLISION DETECTED!")
            log("I", "VW Damage Reporter", string.format("Vehicle: %s %s (ID: %s)", 
                vehicleInfo.brand, vehicleInfo.name, tostring(vehicleInfo.id)))
            log("I", "VW Damage Reporter", string.format("Model: %s | Plate: %s", 
                vehicleInfo.model, vehicleInfo.plate))
            log("I", "VW Damage Reporter", string.format("Total damage: %.1f%% (+%.1f%%)", 
                currentTotal * 100, damageDelta * 100))
            log("I", "VW Damage Reporter", string.format("=== ALL DAMAGED PARTS (%d / %d) ===", 
                #allDamagedParts, totalParts))
            
            for i, part in ipairs(allDamagedParts) do
                log("I", "VW Damage Reporter", string.format("  %d. %s: %.2f%%", 
                    i, part.name, part.damage * 100))
            end
            
            log("I", "VW Damage Reporter", "========================================")
            
            -- Build and send report
            local report = buildCrashReport(vehicleInfo, allDamagedParts, currentTotal, damageDelta, totalParts)
            sendHttpRequest(CONFIG.API_URL, report)
            
            state.lastCrashTime = currentTime
            state.lastCollision = {
                timestamp = os.time(),
                vehicle = vehicleInfo,
                total_damage = currentTotal,
                damage_delta = damageDelta,
                damaged_count = #allDamagedParts,
                total_parts = totalParts,
                parts = allDamagedParts
            }
        end
    end
    
    state.previousDamage = currentParts
end

local function onExtensionLoaded()
    local vehicleInfo = getVehicleInfo()
    log("I", "VW Damage Reporter", "VW Damage Reporter loaded")
    log("I", "VW Damage Reporter", string.format("Vehicle: %s %s | Plate: %s", 
        vehicleInfo.brand, vehicleInfo.name, vehicleInfo.plate))
    log("I", "VW Damage Reporter", string.format("API URL: %s", CONFIG.API_URL))
    log("I", "VW Damage Reporter", string.format("Damage threshold: %.0f%%, Poll interval: %.2fs", 
        CONFIG.DAMAGE_THRESHOLD * 100, CONFIG.POLL_INTERVAL))
end

local function updateGFX(dt)
    state.pollTimer = state.pollTimer + dt
    if state.pollTimer >= CONFIG.POLL_INTERVAL then
        state.pollTimer = 0
        detectCollision()
    end
    processQueue()
end

local function onReset()
    log("I", "VW Damage Reporter", "Vehicle reset - clearing damage state")
    state.previousDamage = {}
    state.lastCrashTime = getCurrentTime()
    state.lastCollision = nil
end

local function onVehicleDestroyed()
    log("I", "VW Damage Reporter", "Vehicle destroyed")
    local vehicleInfo = getVehicleInfo()
    local currentParts = getPartDamage()
    local allDamagedParts = {}
    local totalParts = 0
    
    for partName, partData in pairs(currentParts) do
        totalParts = totalParts + 1
        local currentDmg = partData.damage or 0
        if currentDmg > 0 then
            table.insert(allDamagedParts, {
                name = partData.name or partName,
                partId = partName,
                damage = currentDmg
            })
        end
    end
    
    table.sort(allDamagedParts, function(a, b) return a.damage > b.damage end)
    
    local report = buildCrashReport(vehicleInfo, allDamagedParts, 1.0, 0, totalParts)
    report.event_type = "vehicle_destroyed"
    sendHttpRequest(CONFIG.API_URL, report)
end

local function getLastCollision()
    return state.lastCollision
end

local function getCurrentDamage()
    return getPartDamage()
end

local function getVehicle()
    return getVehicleInfo()
end

local function getStatus()
    return {
        lastCrashTime = state.lastCrashTime,
        queueLength = #state.crashQueue,
        totalDamage = getTotalDamage(state.previousDamage),
        config = CONFIG
    }
end

M.onExtensionLoaded = onExtensionLoaded
M.updateGFX = updateGFX
M.onReset = onReset
M.onVehicleDestroyed = onVehicleDestroyed
M.getLastCollision = getLastCollision
M.getCurrentDamage = getCurrentDamage
M.getVehicle = getVehicle
M.getStatus = getStatus

return M
