# ADR-001: Use Zustand for State Management

## Status
ACCEPTED

## Context
The frontend needs client-side state management for:
- BeamNG connection status
- Selected vehicle
- Current simulation state
- User session data

Options considered: Redux, MobX, Zustand, React Context.

## Decision
Use **Zustand** for all client-side state management.

## Consequences

**Positive:**
- Minimal boilerplate compared to Redux
- No provider wrapping needed
- Easy to create multiple independent stores
- TypeScript support out of the box
- Small bundle size (~1KB)

**Negative:**
- Less ecosystem/middleware than Redux
- Team members unfamiliar with Zustand need onboarding

## Alternatives Considered

1. **Redux Toolkit** - Too much boilerplate for app size
2. **MobX** - Adds complexity with observables
3. **React Context** - Performance issues with frequent updates

---
**Date**: 2026-01-30
**Author**: Jefin Francis
