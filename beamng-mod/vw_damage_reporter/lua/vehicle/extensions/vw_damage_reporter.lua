-- VW Damage Reporter Extension for BeamNG.drive
-- Automatically reports vehicle damage to VW Crash-to-Repair Simulator
-- 
-- This extension monitors vehicle damage and sends crash data via HTTP
-- to the VW Simulator backend for automatic repair estimate generation.
--
-- Installation:
--   1. Copy this file to: %USERPROFILE%\AppData\Local\BeamNG.drive\mods\vw_damage_reporter\lua\vehicle\extensions\
--   2. The mod will automatically load when you spawn a vehicle
--   3. Ensure the VW Simulator backend is running on the configured URL
--
-- Author: VW Crash-to-Repair Team
-- Version: 1.0.0

local M = {}
M.name = "VW Damage Reporter"

-- ============================================================================
-- CONFIGURATION
-- ============================================================================
local CONFIG = {
    -- Backend API URL - CHANGE THIS based on your setup:
    -- 
    -- LOCAL DEVELOPMENT (Docker/localhost):
    --   API_URL = "http://localhost:8000/api/v1/beamng/crash-event"
    --
    -- GCP CLOUD (Development):
    --   API_URL = "https://vw-crash-simulator-api-dev-XXXXXX.us-central1.run.app/api/v1/beamng/crash-event"
    --
    -- GCP CLOUD (Production):
    --   API_URL = "https://vw-crash-simulator-api-prod-XXXXXX.us-central1.run.app/api/v1/beamng/crash-event"
    --
    -- Replace XXXXXX with your actual Cloud Run project number after deployment
    
    API_URL = "http://localhost:8000/api/v1/beamng/crash-event",
    
    -- Minimum damage change to trigger a crash event (0.0 - 1.0)
    -- 0.1 = 10% damage increase triggers event
    DAMAGE_THRESHOLD = 0.1,
    
    -- How often to check damage state (seconds)
    POLL_INTERVAL = 0.5,
    
    -- HTTP request timeout (seconds)
    HTTP_TIMEOUT = 5.0,
    
    -- Number of retry attempts for failed HTTP requests
    RETRY_ATTEMPTS = 3,
    
    -- Delay between retries (seconds)
    RETRY_DELAY = 1.0,
    
    -- Minimum time between crash reports (seconds) - prevents spam
    CRASH_COOLDOWN = 5.0,
    
    -- Enable debug logging
    DEBUG = false,
    
    -- Send telemetry even without crash (for testing)
    SEND_PERIODIC_TELEMETRY = false,
    TELEMETRY_INTERVAL = 10.0
}

-- ============================================================================
-- STATE VARIABLES
-- ============================================================================
local state = {
    previousDamage = 0,
    lastCrashTime = 0,
    lastTelemetryTime = 0,
    pollTimer = 0,
    vehicleId = nil,
    crashQueue = {},
    isProcessingQueue = false,
    initialized = false
}

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

local function log(message, ...)
    if CONFIG.DEBUG then
        print(string.format("[VW Damage Reporter] " .. message, ...))
    end
end

local function logAlways(message, ...)
    print(string.format("[VW Damage Reporter] " .. message, ...))
end

local function getCurrentTime()
    return os.clock()
end

local function tableToJson(tbl)
    -- Simple JSON serialization for Lua tables
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
            if val ~= val then return "null" end  -- NaN check
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

-- ============================================================================
-- DAMAGE DATA COLLECTION
-- ============================================================================

local function getVehicleInfo()
    local info = {
        id = state.vehicleId or "unknown",
        name = v.data.information.name or "Unknown Vehicle",
        model = v.data.information.model or "unknown",
        brand = v.data.information.brand or "Unknown",
        year = v.data.information.year or 0,
        config = v.data.information.config or "default"
    }
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

local function getDamageData()
    local damageData = {
        total_damage = 0,
        part_damage = {},
        deformation = {},
        broken_parts = {},
        damage_by_zone = {
            front = 0,
            rear = 0,
            left = 0,
            right = 0,
            top = 0,
            bottom = 0
        }
    }
    
    -- Get part damage from beamstate
    if beamstate then
        local partDamage = beamstate.getPartDamageData()
        if partDamage then
            local totalDamage = 0
            local partCount = 0
            
            for partName, damage in pairs(partDamage) do
                damageData.part_damage[partName] = damage
                totalDamage = totalDamage + damage
                partCount = partCount + 1
                
                -- Track broken parts (damage > 0.8)
                if damage > 0.8 then
                    table.insert(damageData.broken_parts, partName)
                end
                
                -- Categorize by zone based on part name
                local partLower = string.lower(partName)
                if string.find(partLower, "front") or string.find(partLower, "hood") or string.find(partLower, "bumper_f") then
                    damageData.damage_by_zone.front = damageData.damage_by_zone.front + damage
                elseif string.find(partLower, "rear") or string.find(partLower, "trunk") or string.find(partLower, "bumper_r") then
                    damageData.damage_by_zone.rear = damageData.damage_by_zone.rear + damage
                elseif string.find(partLower, "_l") or string.find(partLower, "left") then
                    damageData.damage_by_zone.left = damageData.damage_by_zone.left + damage
                elseif string.find(partLower, "_r") or string.find(partLower, "right") then
                    damageData.damage_by_zone.right = damageData.damage_by_zone.right + damage
                elseif string.find(partLower, "roof") then
                    damageData.damage_by_zone.top = damageData.damage_by_zone.top + damage
                elseif string.find(partLower, "floor") or string.find(partLower, "underbody") then
                    damageData.damage_by_zone.bottom = damageData.damage_by_zone.bottom + damage
                end
            end
            
            if partCount > 0 then
                damageData.total_damage = totalDamage / partCount
            end
        end
    end
    
    -- Get deformation data if available
    if beamstate and beamstate.getDeformationStats then
        damageData.deformation = beamstate.getDeformationStats() or {}
    end
    
    return damageData
end

local function buildCrashReport(eventType)
    local damageData = getDamageData()
    
    local report = {
        event_type = eventType or "crash_detected",
        timestamp = os.time(),
        timestamp_iso = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        
        vehicle = getVehicleInfo(),
        position = getVehiclePosition(),
        velocity = getVehicleVelocity(),
        rotation = getVehicleRotation(),
        
        damage = {
            total_damage = damageData.total_damage,
            previous_damage = state.previousDamage,
            damage_delta = damageData.total_damage - state.previousDamage,
            part_damage = damageData.part_damage,
            damage_by_zone = damageData.damage_by_zone,
            broken_parts = damageData.broken_parts,
            broken_parts_count = #damageData.broken_parts
        },
        
        metadata = {
            mod_version = "1.0.0",
            beamng_version = beamng_version or "unknown",
            damage_threshold = CONFIG.DAMAGE_THRESHOLD
        }
    }
    
    return report
end

-- ============================================================================
-- HTTP COMMUNICATION
-- ============================================================================

local function sendHttpRequest(url, data, callback, retryCount)
    retryCount = retryCount or 0
    
    local jsonData = tableToJson(data)
    log("Sending HTTP request to %s (attempt %d)", url, retryCount + 1)
    log("Payload: %s", jsonData)
    
    -- Use BeamNG's HTTP extension if available
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
                    log("HTTP request successful: %s", response.body or "")
                    if callback then callback(true, response) end
                else
                    logAlways("HTTP request failed: %s", response.error or "Unknown error")
                    
                    -- Retry logic
                    if retryCount < CONFIG.RETRY_ATTEMPTS then
                        log("Retrying in %d seconds...", CONFIG.RETRY_DELAY)
                        -- Queue retry
                        table.insert(state.crashQueue, {
                            url = url,
                            data = data,
                            callback = callback,
                            retryCount = retryCount + 1,
                            retryTime = getCurrentTime() + CONFIG.RETRY_DELAY
                        })
                    else
                        logAlways("Max retries reached, giving up")
                        if callback then callback(false, response) end
                    end
                end
            end
        })
    else
        -- Fallback: Use Lua socket if available
        local status, socket = pcall(require, "socket.http")
        if status then
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
                log("HTTP request successful (socket)")
                if callback then callback(true, {body = response}) end
            else
                logAlways("HTTP request failed (socket): %s", code)
                if callback then callback(false, {error = code}) end
            end
        else
            logAlways("No HTTP library available! Cannot send crash data.")
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

-- ============================================================================
-- CRASH DETECTION
-- ============================================================================

local function checkForCrash()
    local damageData = getDamageData()
    local currentDamage = damageData.total_damage
    local damageDelta = currentDamage - state.previousDamage
    local currentTime = getCurrentTime()
    
    -- Check if damage threshold exceeded
    if damageDelta >= CONFIG.DAMAGE_THRESHOLD then
        -- Check cooldown
        if currentTime - state.lastCrashTime >= CONFIG.CRASH_COOLDOWN then
            logAlways("🚨 CRASH DETECTED! Damage increased by %.2f%% (%.2f%% -> %.2f%%)", 
                damageDelta * 100, state.previousDamage * 100, currentDamage * 100)
            
            -- Build and send crash report
            local report = buildCrashReport("crash_detected")
            sendHttpRequest(CONFIG.API_URL, report, function(success, response)
                if success then
                    logAlways("✅ Crash report sent successfully!")
                else
                    logAlways("❌ Failed to send crash report")
                end
            end)
            
            state.lastCrashTime = currentTime
        else
            log("Crash detected but cooldown active (%.1fs remaining)", 
                CONFIG.CRASH_COOLDOWN - (currentTime - state.lastCrashTime))
        end
    end
    
    -- Periodic telemetry (if enabled)
    if CONFIG.SEND_PERIODIC_TELEMETRY then
        if currentTime - state.lastTelemetryTime >= CONFIG.TELEMETRY_INTERVAL then
            log("Sending periodic telemetry")
            local report = buildCrashReport("telemetry_update")
            sendHttpRequest(CONFIG.API_URL, report)
            state.lastTelemetryTime = currentTime
        end
    end
    
    state.previousDamage = currentDamage
end

-- ============================================================================
-- BEAMNG EXTENSION HOOKS
-- ============================================================================

-- Called when the extension is loaded
function M.onInit()
    logAlways("VW Damage Reporter initialized")
    logAlways("  API URL: %s", CONFIG.API_URL)
    logAlways("  Damage threshold: %.0f%%", CONFIG.DAMAGE_THRESHOLD * 100)
    logAlways("  Poll interval: %.1fs", CONFIG.POLL_INTERVAL)
    
    state.initialized = true
    state.vehicleId = obj:getId()
    state.previousDamage = 0
    state.lastCrashTime = 0
    state.lastTelemetryTime = 0
end

-- Called every frame
function M.updateGFX(dt)
    if not state.initialized then return end
    
    state.pollTimer = state.pollTimer + dt
    
    -- Check for crashes at configured interval
    if state.pollTimer >= CONFIG.POLL_INTERVAL then
        state.pollTimer = 0
        checkForCrash()
    end
    
    -- Process retry queue
    processQueue()
end

-- Called when vehicle is reset
function M.onReset()
    log("Vehicle reset detected")
    state.previousDamage = 0
    state.lastCrashTime = getCurrentTime() -- Prevent immediate crash report
end

-- Called when vehicle takes damage
function M.onBeamBroken(id, energy)
    log("Beam broken: id=%s, energy=%.2f", id, energy)
end

-- Called on collision
function M.onCollision(...)
    log("Collision detected")
end

-- Called when vehicle is spawned
function M.onVehicleSpawned()
    log("Vehicle spawned")
    state.previousDamage = 0
    
    -- Send initial telemetry
    if CONFIG.SEND_PERIODIC_TELEMETRY then
        local report = buildCrashReport("vehicle_spawned")
        sendHttpRequest(CONFIG.API_URL, report)
    end
end

-- Called when vehicle is destroyed
function M.onVehicleDestroyed()
    log("Vehicle destroyed")
    
    -- Send final damage report
    local report = buildCrashReport("vehicle_destroyed")
    sendHttpRequest(CONFIG.API_URL, report)
end

-- Public API for external scripts
function M.sendManualReport()
    logAlways("Manual report requested")
    local report = buildCrashReport("manual_report")
    sendHttpRequest(CONFIG.API_URL, report, function(success, response)
        if success then
            logAlways("Manual report sent successfully")
        else
            logAlways("Failed to send manual report")
        end
    end)
end

function M.setApiUrl(url)
    CONFIG.API_URL = url
    logAlways("API URL updated to: %s", url)
end

function M.setDamageThreshold(threshold)
    CONFIG.DAMAGE_THRESHOLD = threshold
    logAlways("Damage threshold updated to: %.0f%%", threshold * 100)
end

function M.setDebug(enabled)
    CONFIG.DEBUG = enabled
    logAlways("Debug mode: %s", enabled and "enabled" or "disabled")
end

function M.getStatus()
    return {
        initialized = state.initialized,
        vehicleId = state.vehicleId,
        previousDamage = state.previousDamage,
        lastCrashTime = state.lastCrashTime,
        queueLength = #state.crashQueue,
        config = CONFIG
    }
end

return M
