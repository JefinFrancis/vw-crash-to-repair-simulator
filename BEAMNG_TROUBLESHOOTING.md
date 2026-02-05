# BeamNG Mod Connection Troubleshooting

**Current Setup**: 
- ✅ BeamNG.drive running locally
- ✅ Backend API on GCP Cloud Run: `https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app`
- ✅ Mod installed and configured with debug enabled

## Step 1: Verify Mod Installation

Mod should be at:
```
~/.local/share/BeamNG/BeamNG.drive/current/mods/unpacked/vwDamageReporter/
```

> **Important**: The `unpacked/` folder is for development mods. The `auto/` subfolder is **required** for BeamNG to automatically load the Lua script when a vehicle spawns.

Check installation:
```bash
ls -la ~/.local/share/BeamNG/BeamNG.drive/current/mods/unpacked/vwDamageReporter/
```

Expected structure:
```
damageReporter/
├── mod_info.json                           # Mod metadata
└── lua/
    └── vehicle/
        └── extensions/
            └── auto/                       # ← CRITICAL: auto/ folder for automatic loading
                └── vwDamageReporter.lua    # Main script
```

Verify full structure:
```bash
tree ~/.local/share/BeamNG/BeamNG.drive/current/mods/unpacked/vwDamageReporter/
```

## Step 2: Verify Config is Correct

Configuration is embedded in the main Lua script:
```bash
head -15 ~/.local/share/BeamNG/BeamNG.drive/current/mods/unpacked/vwDamageReporter/lua/vehicle/extensions/auto/vwDamageReporter.lua
```

Should show:
```lua
local CONFIG = {
    API_URL = "https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/beamng/crash-event",
    DAMAGE_THRESHOLD = 0.1,      -- 10% damage increase triggers report
    POLL_INTERVAL = 0.5,         -- Check damage every 0.5 seconds
    HTTP_TIMEOUT = 5.0,
    RETRY_ATTEMPTS = 3,
    RETRY_DELAY = 1.0,
    CRASH_COOLDOWN = 5.0         -- Minimum time between crash reports
}
```

## Step 3: Start BeamNG and Check Console

1. **Close BeamNG completely** (not just minimize)
2. **Open BeamNG fresh** 
3. **Press `~` to open Lua console immediately**
4. **Spawn a vehicle** (any model)
5. **Look for these messages in console:**

### ✅ Success Messages (Mod Loading)
```
[I] [VW Damage Reporter] VW Damage Reporter initialized
[I] [VW Damage Reporter] API URL: https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/beamng/crash-event
[I] [VW Damage Reporter] Damage threshold: 10%
[I] [VW Damage Reporter] Poll interval: 0.5s
```

### ✅ Crash Detection (After you crash)
```
[I] [VW Damage Reporter] CRASH DETECTED! Damage increased by 35.00% (10.00% -> 45.00%)
```

### ✅ Data Sent (Network Success)
```
[I] [VW Damage Reporter] Crash report sent successfully!
```

## Step 4: Common Issues & Fixes

### Issue 1: Mod Not Loading at All
**Symptoms**: No `[VW Damage Reporter]` messages in console

**Solutions**:
1. **Verify the `auto/` folder exists** - Scripts must be in `lua/vehicle/extensions/auto/` to auto-load:
   ```bash
   ls -la ~/.local/share/BeamNG/BeamNG.drive/current/mods/unpacked/vwDamageReporter/lua/vehicle/extensions/auto/
   ```
2. Clear BeamNG cache:
   ```bash
   rm -rf ~/.local/share/BeamNG/BeamNG.drive/current/temp/*
   ```
3. Verify mod folder structure:
   ```bash
   tree ~/.local/share/BeamNG/BeamNG.drive/current/mods/unpacked/vwDamageReporter/
   ```
4. Check for errors in main BeamNG log:
   ```bash
   tail -50 ~/.local/share/BeamNG/BeamNG.drive/current/beamng.log
   ```

### Issue 2: Initialized but Not Detecting Crashes
**Symptoms**: 
- Mod loads OK
- No crash detection when you hit things
- No messages about damage increase

**Solutions**:
1. **Lower the damage threshold** - Default is 10%, try 5%:
   ```lua
   DAMAGE_THRESHOLD = 0.05,
   ```
2. **Crash harder** - Needs significant impact for damage detection
3. **Check if vehicle has damage sensors** - Some vehicles don't report damage

### Issue 3: HTTP Request Failed
**Symptoms**:
```
❌ [VW Damage Reporter] HTTP request failed
[Retrying in 1 seconds...]
```

**Causes**:
1. **Backend is down** - Check if GCP service is running:
   ```bash
   curl https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/health/
   ```
   Should return `{"status":"healthy",...}`

2. **Network/firewall blocking** - BeamNG needs HTTPS access to GCP
   - Check your firewall allows HTTPS (port 443)
   - Try from terminal: `curl -v https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/health/`

3. **CORS headers missing** - The mod sends requests, backend must accept them
   - Check backend config allows BeamNG origin
   - Verify API endpoint accepts POST requests

### Issue 4: Check GCP Backend Status
```bash
# Check if backend is running
curl https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/health/

# Check if it accepts crash events (should be empty initially)
curl https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/beamng/latest-crash/
```

## Step 5: Adjust Configuration

If you need to tweak settings, edit the mod Lua file directly:

```bash
nano ~/.local/share/BeamNG/BeamNG.drive/current/mods/unpacked/vwDamageReporter/lua/vehicle/extensions/auto/vwDamageReporter.lua
```

Modify the CONFIG section near the top:
```lua
local CONFIG = {
    API_URL = "https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/beamng/crash-event",
    DAMAGE_THRESHOLD = 0.05,  -- ← Lower to 5% for more sensitive detection
    POLL_INTERVAL = 0.5,
    HTTP_TIMEOUT = 5.0,
    RETRY_ATTEMPTS = 3,
    RETRY_DELAY = 1.0,
    CRASH_COOLDOWN = 5.0
}
```

## Step 6: Manual Test (No BeamNG Needed)

Test the GCP backend directly:

```bash
curl -X POST https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/beamng/crash-event \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "crash_detected",
    "timestamp": 1738800000,
    "timestamp_iso": "2026-02-05T12:00:00Z",
    "vehicle": {"id": 1234, "name": "Pickup", "model": "pickup", "brand": "Ibishu", "year": 0, "plate": "ABC-1234"},
    "position": {"x": -717.5, "y": 101.2, "z": 118.0},
    "velocity": {"x": 10.5, "y": 2.3, "z": 0.1, "speed_ms": 12.6, "speed_kmh": 45.5, "speed_mph": 28.3},
    "rotation": {"x": 0, "y": 0, "z": 0, "w": 1},
    "damage": {
      "total_damage": 0.35,
      "damage_delta": 0.25,
      "damaged_parts_count": 5,
      "total_parts_count": 42,
      "parts": [
        {"name": "Front Bumper", "partId": "/pickup_frame/pickup_bumper_F", "damage": 0.8},
        {"name": "Hood", "partId": "/pickup_frame/pickup_hood", "damage": 0.5},
        {"name": "Left Headlight", "partId": "/pickup_frame/headlight_L", "damage": 0.3}
      ]
    },
    "metadata": {"mod_version": "1.1.0", "beamng_version": "0.32", "damage_threshold": 0.05}
  }'
```

If this works, the backend is accepting data. If BeamNG mod still isn't sending, the issue is in BeamNG/mod communication.

## Step 7: Check What's Being Received

Once you send a crash (from BeamNG or manual curl), check what the backend recorded:

```bash
curl https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/beamng/latest-crash/
```

Should return the crash data you just sent.

## Quick Checklist

- [ ] Mod installed at `~/.local/share/BeamNG/BeamNG.drive/current/mods/unpacked/vwDamageReporter/`
- [ ] Script is in `lua/vehicle/extensions/auto/` folder (auto/ is required!)
- [ ] `vwDamageReporter.lua` has correct GCP URL in CONFIG
- [ ] BeamNG started fresh after installing mod
- [ ] Lua console (`~` key) shows initialization messages
- [ ] Backend is accessible: `curl https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/health/`
- [ ] Crash hard enough to trigger damage (>10% increase)
- [ ] Check console for "CRASH DETECTED!" message
- [ ] Check console for "Crash report sent successfully!" message

## Logs to Check

### BeamNG Console
```
Press ~ in game
Type: extensions.auto_vwDamageReporter.getStatus()
```

### BeamNG Log File
```bash
tail -100 ~/.local/share/BeamNG/BeamNG.drive/current/beamng.log | grep -i "vw\|damage\|http"
```

### GCP Backend Logs
Check Cloud Run logs for the dev service:
```
https://console.cloud.google.com/run/detail/us-central1/vw-crash-simulator-api-dev/logs
```

---

**Last Updated**: 2026-02-04
