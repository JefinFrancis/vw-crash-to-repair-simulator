# ADR-003: WebSocket for BeamNG Communication

## Status
ACCEPTED

## Context
The backend needs to communicate with BeamNG.drive for:
- Loading vehicle scenarios
- Executing crash simulations
- Receiving real-time telemetry
- Getting damage state

BeamNG.drive exposes a WebSocket API on port 25252.

## Decision
Use **async WebSocket client** in the backend to communicate with BeamNG.drive.

Additionally, implement a **Lua mod** that sends HTTP POST requests to the backend for crash events, providing a secondary integration path.

## Consequences

**Positive:**
- Real-time bidirectional communication
- Can receive telemetry streams
- Async implementation doesn't block API requests
- Lua mod provides automatic crash detection without polling

**Negative:**
- Connection state management complexity
- Need to handle reconnection logic
- Two integration paths to maintain

## Implementation Notes

- WebSocket client in `backend/src/services/beamng.py`
- Default timeout: 10 seconds for commands
- Automatic message routing via correlation IDs
- Lua mod sends to `POST /api/v1/beamng/crash-event`
- Crash cooldown: 5 seconds to prevent spam

## Alternatives Considered

1. **HTTP polling only** - Too slow for real-time telemetry
2. **BeamNGpy library** - Requires BeamNG running on same machine
3. **Lua mod only** - Can't send commands to BeamNG

---
**Date**: 2026-01-30
**Author**: Jefin Francis
