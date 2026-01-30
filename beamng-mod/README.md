# VW Damage Reporter - BeamNG Mod

A BeamNG.drive mod that automatically reports vehicle damage to the VW Crash-to-Repair Simulator for instant repair estimates.

## 🚀 Features

- **Automatic Crash Detection** - Detects crashes when damage exceeds configurable threshold
- **Real-time Monitoring** - Continuously monitors vehicle damage state
- **Comprehensive Data** - Sends position, velocity, rotation, and detailed damage breakdown
- **Zone Analysis** - Categorizes damage by vehicle zones (front, rear, left, right, top, bottom)
- **Broken Parts Tracking** - Identifies severely damaged parts requiring replacement
- **HTTP Integration** - Sends data via HTTP POST to your backend API
- **Retry Logic** - Automatic retry for failed HTTP requests

## 📦 Installation

### Method 1: Manual Installation

1. **Copy the mod folder:**
   ```
   vw_damage_reporter/
   ```

2. **Paste to BeamNG mods directory:**
   - **Windows:** `%USERPROFILE%\AppData\Local\BeamNG.drive\mods\`
   - **Linux:** `~/.local/share/BeamNG.drive/mods/`

3. **Restart BeamNG** (if running)

### Method 2: ZIP Installation

1. **Create a ZIP file** of the `vw_damage_reporter` folder
2. **Drag and drop** the ZIP into BeamNG's mod manager
3. **Enable the mod** in the mod manager

## ⚙️ Configuration

Edit the configuration in `lua/vehicle/extensions/vw_damage_reporter.lua`:

```lua
local CONFIG = {
    -- Backend API URL
    API_URL = "http://localhost:8000/api/v1/beamng/crash-event",
    
    -- Damage threshold (0.1 = 10% damage increase triggers crash)
    DAMAGE_THRESHOLD = 0.1,
    
    -- Check interval in seconds
    POLL_INTERVAL = 0.5,
    
    -- Cooldown between crash reports (prevents spam)
    CRASH_COOLDOWN = 5.0,
    
    -- Enable debug logging
    DEBUG = false
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `API_URL` | `http://localhost:8000/api/v1/beamng/crash-event` | Backend endpoint URL |
| `DAMAGE_THRESHOLD` | `0.1` | Minimum damage change to trigger crash (0.0-1.0) |
| `POLL_INTERVAL` | `0.5` | Seconds between damage checks |
| `CRASH_COOLDOWN` | `5.0` | Minimum seconds between crash reports |
| `HTTP_TIMEOUT` | `5.0` | HTTP request timeout |
| `RETRY_ATTEMPTS` | `3` | Number of retry attempts |
| `DEBUG` | `false` | Enable verbose logging |

## 🎮 Usage

1. **Start the VW Simulator backend:**
   ```bash
   cd vw-crash-to-repair-simulator
   docker compose up -d
   ```

2. **Start BeamNG.drive** with the mod installed

3. **Spawn any vehicle**

4. **Crash the vehicle** - the mod will automatically:
   - Detect the crash
   - Collect damage data
   - Send to your backend
   - You'll see a log message: `🚨 CRASH DETECTED!`

5. **View results** at `http://localhost:3000`

## 📊 Data Sent

The mod sends the following data on each crash:

```json
{
  "event_type": "crash_detected",
  "timestamp": 1706620800,
  "timestamp_iso": "2026-01-30T12:00:00Z",
  "vehicle": {
    "id": "vehicle_0",
    "name": "T-Cross",
    "model": "tcross",
    "brand": "Volkswagen",
    "year": 2024
  },
  "position": { "x": -717.5, "y": 101.2, "z": 118.0 },
  "velocity": {
    "speed_kmh": 45.5,
    "speed_ms": 12.6
  },
  "damage": {
    "total_damage": 0.35,
    "damage_delta": 0.25,
    "part_damage": {
      "front_bumper": 0.8,
      "hood": 0.5,
      "left_fender": 0.3
    },
    "damage_by_zone": {
      "front": 0.8,
      "rear": 0.0,
      "left": 0.2,
      "right": 0.0
    },
    "broken_parts": ["front_bumper"],
    "broken_parts_count": 1
  }
}
```

## 🔧 Console Commands

In BeamNG's Lua console, you can use:

```lua
-- Send manual damage report
extensions.vw_damage_reporter.sendManualReport()

-- Change API URL
extensions.vw_damage_reporter.setApiUrl("http://192.168.1.100:8000/api/v1/beamng/crash-event")

-- Change damage threshold
extensions.vw_damage_reporter.setDamageThreshold(0.2)  -- 20%

-- Enable debug mode
extensions.vw_damage_reporter.setDebug(true)

-- Get current status
local status = extensions.vw_damage_reporter.getStatus()
print(dumps(status))
```

## 🐛 Troubleshooting

### Mod not loading
- Check the folder structure is correct
- Look for errors in BeamNG's console (press `~`)
- Ensure the mod is enabled in mod manager

### HTTP requests failing
- Verify the backend is running: `curl http://localhost:8000/api/v1/health`
- Check firewall settings
- Try enabling DEBUG mode to see detailed logs

### No crash detection
- Lower the `DAMAGE_THRESHOLD` (e.g., to 0.05)
- Check if vehicle has damage sensors
- Reset the vehicle and crash harder

### Console logs
Look for `[VW Damage Reporter]` messages in BeamNG's console (`~` key):
```
[VW Damage Reporter] VW Damage Reporter initialized
[VW Damage Reporter] 🚨 CRASH DETECTED! Damage increased by 35.00%
[VW Damage Reporter] ✅ Crash report sent successfully!
```

## 📝 Event Types

| Event Type | Trigger |
|------------|---------|
| `crash_detected` | Damage threshold exceeded |
| `telemetry_update` | Periodic telemetry (if enabled) |
| `vehicle_spawned` | Vehicle spawned |
| `vehicle_destroyed` | Vehicle removed |
| `manual_report` | Manual trigger via console |

## 🔗 API Endpoint

The mod sends POST requests to your configured endpoint with:

- **Content-Type:** `application/json`
- **Header:** `X-BeamNG-Mod: vw_damage_reporter`
- **Body:** JSON crash data

## 📄 License

MIT License - Feel free to modify and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📞 Support

For issues, please open a GitHub issue or contact the VW Crash-to-Repair team.
