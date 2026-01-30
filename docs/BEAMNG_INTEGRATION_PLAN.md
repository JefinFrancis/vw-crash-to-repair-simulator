# BeamNG Integration Plan - VW Crash-to-Repair Simulator

## 📋 Overview

This document outlines the strategy for integrating BeamNG.tech with the VW Crash-to-Repair Simulator using a **Hybrid Approach** combining a Lua mod for real-time crash detection with BeamNGpy as a fallback for manual extraction.

---

## 🎯 Integration Approaches Comparison

| Aspect | **1. BeamNGpy Library** | **2. WebSocket API** | **3. BeamNG Lua Mod** | **4. HTTP Polling** |
|--------|------------------------|---------------------|----------------------|---------------------|
| **How it Works** | Python library connects directly to BeamNG via TCP (port 25252) | Backend maintains WebSocket connection to BeamNG | Lua script inside BeamNG sends HTTP requests to our API | Our app periodically requests data from BeamNG |
| **Real-time Data** | ⚠️ On-demand polling | ✅ True real-time streaming | ✅ Event-driven (crash triggers send) | ❌ Delayed (depends on poll interval) |
| **Setup Complexity** | 🟡 Medium - Install beamngpy, configure paths | 🔴 High - Custom WebSocket server needed | 🟢 Low - Drop Lua file in mods folder | 🟢 Low - Simple HTTP endpoints |
| **Docker Compatibility** | ⚠️ Tricky - BeamNG runs on host, not in container | ✅ Good - Just network ports | ✅ Excellent - Mod calls Docker network | ✅ Excellent - Standard HTTP |
| **Cross-Platform** | ✅ Windows + Linux | ✅ Any platform | ✅ Any platform | ✅ Any platform |
| **Network Mode** | TCP socket (localhost only by default) | WebSocket (can be remote) | HTTP (can be remote) | HTTP (can be remote) |
| **Auto-detection** | ❌ Manual trigger needed | ✅ Can detect events | ✅ Best - crash events trigger automatically | ❌ Must poll continuously |
| **Resource Usage** | 🟡 Medium | 🔴 Higher (persistent connection) | 🟢 Low (event-driven) | 🔴 High (continuous polling) |
| **Latency** | ~100-500ms per request | ~10-50ms | ~50-100ms | Depends on interval (1-5s typical) |
| **Scalability** | ❌ 1:1 connection | ✅ Multiple clients possible | ✅ Multiple backends can receive | ⚠️ Limited by poll rate |
| **Maintenance** | 🟡 Library updates needed | 🔴 Custom code to maintain | 🟢 Simple Lua script | 🟢 Simple |
| **Offline Support** | ❌ Requires running connection | ❌ Requires connection | ✅ Can queue & retry | ❌ Requires connection |

---

## 🏆 Chosen Approach: Hybrid (Lua Mod + BeamNGpy Fallback)

### Why This Combination?

| Benefit | Description |
|---------|-------------|
| **Auto-detection** | Lua mod detects crashes instantly and pushes data |
| **Docker-friendly** | HTTP works seamlessly from host to Docker container |
| **Scalable** | Multiple instances can receive damage data |
| **Portable** | Users just drop mod file into BeamNG mods folder |
| **Fallback** | BeamNGpy can be used for manual extraction if mod fails |
| **Low latency** | Event-driven, no polling overhead |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOST MACHINE (Windows/Linux)                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        BeamNG.tech Game                                 │ │
│  │                                                                         │ │
│  │   ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │   │  VW Damage Reporter Mod (Lua)                                    │  │ │
│  │   │                                                                  │  │ │
│  │   │  Features:                                                       │  │ │
│  │   │  • Monitors vehicle damage state every 0.5 seconds               │  │ │
│  │   │  • Detects crash events when damage delta > threshold            │  │ │
│  │   │  • Captures comprehensive damage telemetry                       │  │ │
│  │   │  • Sends HTTP POST to backend API on crash detection             │  │ │
│  │   │  • Includes vehicle info, position, velocity, damage breakdown   │  │ │
│  │   └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                    │                                    │ │
│  │                                    │ HTTP POST on crash                 │ │
│  │                                    ▼                                    │ │
│  └────────────────────────────────────┼────────────────────────────────────┘ │
│                                       │                                      │
│                                       │ Port 8000                            │
│                                       ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     Docker Compose Stack                                │ │
│  │                                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │ │
│  │  │   Frontend   │  │   Backend    │  │  PostgreSQL  │  │   Redis    │  │ │
│  │  │   (React)    │◄─┤   (FastAPI)  │◄─┤              │  │            │  │ │
│  │  │   :3000      │  │   :8000      │  │   :5432      │  │   :6379    │  │ │
│  │  └──────────────┘  └──────┬───────┘  └──────────────┘  └────────────┘  │ │
│  │                           │                                             │ │
│  │                    ┌──────┴───────┐                                     │ │
│  │                    │   Endpoints  │                                     │ │
│  │                    │              │                                     │ │
│  │                    │ POST /api/v1/beamng/crash-event                    │ │
│  │                    │   ← Receives Lua mod data                          │ │
│  │                    │                                                    │ │
│  │                    │ POST /api/v1/beamng/extract-damage                 │ │
│  │                    │   ← BeamNGpy fallback (manual)                     │ │
│  │                    │                                                    │ │
│  │                    │ GET /api/v1/beamng/latest-crash                    │ │
│  │                    │   ← Frontend polls for new crashes                 │ │
│  │                    └──────────────┘                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    BeamNGpy Fallback (Optional)                         │ │
│  │                                                                         │ │
│  │  • Connects via TCP port 25252                                          │ │
│  │  • Used for manual damage extraction                                    │ │
│  │  • Requires BeamNG to be running with remote API enabled                │ │
│  │  • Triggered by user clicking "Extract Damage" button                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
vw-crash-to-repair-simulator/
├── beamng-mod/
│   └── vw_damage_reporter/
│       ├── mod_info.json              # Mod metadata
│       └── lua/
│           └── vehicle/
│               └── extensions/
│                   └── vw_damage_reporter.lua  # Main mod script
│
├── backend/
│   └── src/
│       ├── api/
│       │   └── v1/
│       │       └── beamng.py          # BeamNG API endpoints
│       ├── services/
│       │   └── beamng.py              # BeamNG service layer
│       └── schemas/
│           └── beamng.py              # Pydantic schemas
│
└── frontend/
    └── src/
        ├── services/
        │   └── beamngService.ts       # BeamNG API client
        └── components/
            └── beamng/
                └── CrashNotification.tsx  # Real-time crash alerts
```

---

## 🔧 Implementation Details

### 1. Lua Mod (`vw_damage_reporter.lua`)

**Features:**
- Monitors vehicle damage state at configurable intervals (default: 500ms)
- Detects significant damage changes (crash events)
- Captures comprehensive telemetry:
  - Vehicle model and name
  - Position (x, y, z)
  - Velocity and direction
  - Component-level damage breakdown
  - Deformation data
- Sends HTTP POST to backend on crash detection
- Configurable damage threshold for crash detection
- Retry logic for failed HTTP requests

**Damage Data Structure:**
```lua
{
    event_type = "crash_detected",
    timestamp = os.time(),
    vehicle = {
        id = vehicle_id,
        name = vehicle_name,
        model = vehicle_model
    },
    position = { x, y, z },
    velocity = speed_kmh,
    damage = {
        total_damage = 0.0-1.0,
        components = {
            ["front_bumper"] = 0.8,
            ["hood"] = 0.5,
            ...
        },
        deformation = {...}
    }
}
```

### 2. Backend Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/beamng/crash-event` | POST | Receives crash data from Lua mod |
| `/api/v1/beamng/extract-damage` | POST | Manual extraction via BeamNGpy |
| `/api/v1/beamng/latest-crash` | GET | Get most recent crash for frontend |
| `/api/v1/beamng/crash-history` | GET | List recent crashes |
| `/api/v1/beamng/health` | GET | Check BeamNG connection status |

### 3. Frontend Integration

- **Real-time notifications** when crash is detected
- **WebSocket/SSE** for instant updates (optional enhancement)
- **Polling fallback** every 5 seconds for crash updates
- **Manual trigger** button to extract damage via BeamNGpy

---

## 🚀 Installation Guide

### For End Users (BeamNG Mod)

1. **Download the mod:**
   ```
   vw_damage_reporter.zip
   ```

2. **Install in BeamNG:**
   - Extract to: `%USERPROFILE%\AppData\Local\BeamNG.drive\mods\`
   - Or use BeamNG's mod manager

3. **Configure (optional):**
   - Edit `vw_damage_reporter.lua` to change:
     - `API_URL` (default: `http://localhost:8000`)
     - `DAMAGE_THRESHOLD` (default: `0.1`)
     - `POLL_INTERVAL` (default: `0.5` seconds)

4. **Start the VW Simulator app:**
   ```bash
   docker compose up -d
   ```

5. **Play BeamNG:**
   - The mod automatically reports crashes to the app

### For Developers (BeamNGpy Fallback)

1. **Install beamngpy:**
   ```bash
   pip install beamngpy
   ```

2. **Configure BeamNG for remote access:**
   - Start BeamNG with: `BeamNG.tech.exe -console -lua "extensions.load('tech/remoteController')"`
   - Or enable in settings: `Options > Other > Enable Remote API`

3. **Set environment variables:**
   ```bash
   export BEAMNG_HOST=localhost
   export BEAMNG_PORT=25252
   export BEAMNG_HOME=/path/to/BeamNG.tech
   ```

---

## 📊 Data Flow

### Crash Detection Flow (Lua Mod - Primary)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   BeamNG    │────▶│  Lua Mod    │────▶│   Backend   │────▶│  Frontend   │
│   Physics   │     │  Detects    │     │   Stores    │     │  Displays   │
│   Engine    │     │  Crash      │     │   Crash     │     │  Estimate   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │ Damage data       │ HTTP POST         │ Saves to DB       │ Shows alert
      │ every frame       │ on threshold      │ + Redis cache     │ + repair cost
      ▼                   ▼                   ▼                   ▼
   Physics           vw_damage_         /crash-event        Notification
   simulation        reporter.lua       endpoint            component
```

### Manual Extraction Flow (BeamNGpy - Fallback)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  BeamNGpy   │────▶│   BeamNG    │
│  "Extract"  │     │   Service   │     │   Client    │     │   Game      │
│   Button    │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │ User clicks       │ Calls beamngpy    │ TCP connection    │ Returns
      │ button            │ extract method    │ port 25252        │ damage data
      ▼                   ▼                   ▼                   ▼
   POST to            beamng.py           beamngpy            Vehicle
   /extract-damage    service             library             sensors
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BEAMNG_HOST` | `localhost` | BeamNG host address |
| `BEAMNG_PORT` | `25252` | BeamNG remote API port |
| `BEAMNG_HOME` | (required) | Path to BeamNG installation |
| `BEAMNG_MOD_API_URL` | `http://localhost:8000` | URL the Lua mod sends data to |
| `CRASH_DAMAGE_THRESHOLD` | `0.1` | Minimum damage delta to trigger crash event |
| `CRASH_POLL_INTERVAL` | `0.5` | Seconds between damage checks in Lua mod |

### Lua Mod Configuration

Edit `vw_damage_reporter.lua`:

```lua
local CONFIG = {
    API_URL = "http://localhost:8000/api/v1/beamng/crash-event",
    DAMAGE_THRESHOLD = 0.1,      -- 10% damage change triggers crash
    POLL_INTERVAL = 0.5,         -- Check every 500ms
    RETRY_ATTEMPTS = 3,          -- HTTP retry attempts
    RETRY_DELAY = 1.0,           -- Seconds between retries
    DEBUG = false                -- Enable verbose logging
}
```

---

## 🧪 Testing

### Test Lua Mod

1. Start backend: `docker compose up -d`
2. Start BeamNG with mod installed
3. Spawn a vehicle and crash it
4. Check backend logs: `docker compose logs -f backend`
5. Verify crash appears in frontend

### Test BeamNGpy Fallback

```bash
# Test connection
curl -X POST http://localhost:8000/api/v1/beamng/connect

# Extract damage manually
curl -X POST http://localhost:8000/api/v1/beamng/extract-damage
```

---

## 🔮 Future Enhancements

1. **WebSocket real-time updates** - Push crash notifications to frontend instantly
2. **Multiple vehicle support** - Track damage across multiple vehicles
3. **Crash replay** - Store and replay crash scenarios
4. **AI damage prediction** - Use ML to predict repair costs more accurately
5. **VR integration** - Show damage visualization in VR headsets
6. **Cloud deployment** - Run backend on cloud, connect from any BeamNG instance

---

## 📚 References

- [BeamNG Modding Documentation](https://documentation.beamng.com/modding/)
- [BeamNGpy GitHub](https://github.com/BeamNG/BeamNGpy)
- [BeamNG Lua API](https://documentation.beamng.com/modding/lua/)
- [BeamNG Vehicle Extensions](https://documentation.beamng.com/modding/vehicle/)
