-- VW Damage Reporter - User Configuration
-- 
-- Edit this file to configure the mod for your environment.
-- This file is loaded by the main extension if present.
--
-- ============================================================================
-- BACKEND SERVER URL
-- ============================================================================
-- 
-- Choose ONE of the following based on your setup:

-- OPTION 1: Local Development (Docker on your machine)
-- Use this when running the VW Simulator locally with Docker Compose
-- local BACKEND_URL = "http://localhost:8000"

-- OPTION 2: GCP Cloud - Development Environment
-- Uncomment and update with your actual Cloud Run URL after deployment
local BACKEND_URL = "https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app"

-- OPTION 3: GCP Cloud - Production Environment
-- Uncomment and update with your actual Cloud Run URL
-- local BACKEND_URL = "https://vw-crash-simulator-api-prod-XXXXXX.us-central1.run.app"

-- ============================================================================
-- EXPORTED CONFIGURATION
-- ============================================================================
return {
    -- Full API endpoint URL (don't change the path unless you know what you're doing)
    API_URL = BACKEND_URL .. "/api/v1/beamng/crash-event",
    
    -- Damage threshold (0.0 - 1.0) - how much damage triggers a crash event
    -- 0.1 = 10% damage increase, 0.05 = 5%, etc.
    DAMAGE_THRESHOLD = 0.1,
    
    -- Polling interval in seconds - how often to check for damage
    POLL_INTERVAL = 0.5,
    
    -- Cooldown between crash reports in seconds - prevents spam
    CRASH_COOLDOWN = 5.0,
    
    -- Enable debug mode for troubleshooting
    DEBUG = false,
}
