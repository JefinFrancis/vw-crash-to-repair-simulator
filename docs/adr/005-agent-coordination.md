# ADR-005: Multi-Agent Coordination via AGENT_CONTEXT.md

## Status
ACCEPTED

## Context
Multiple product managers are working on this project simultaneously, each using AI coding agents (Claude Code, GitHub Copilot). Without coordination:
- Agents may make conflicting changes
- Context about project state is lost between sessions
- Integration points may break silently
- No visibility into who owns what

## Decision
Implement a coordination system using:

1. **AGENT_CONTEXT.md** - Single source of truth for project state
2. **CODEOWNERS** - File-level ownership tracking
3. **ADRs** - Architectural decision records in `/docs/adr/`
4. **Branch naming** - `feature/{owner}-{feature}` convention
5. **Locked files section** - Prevent concurrent edits

## Consequences

**Positive:**
- All agents read same context at session start
- Clear ownership prevents conflicts
- Decisions are documented and discoverable
- Easy to onboard new team members/agents

**Negative:**
- Requires discipline to update AGENT_CONTEXT.md
- Manual process (not automated)
- File can become stale if not maintained

## Protocol

### Session Start
1. Agent reads `AGENT_CONTEXT.md`
2. Check "Locked Files" section
3. Create feature branch
4. Add working files to "Locked Files"

### Session End
1. Remove files from "Locked Files"
2. Update "Recent Changes"
3. Note any "Pending Sync Required"

### Integration Changes
1. Check "Integration Points" section
2. Create GitHub issue for affected owners
3. Do not merge until sync confirmed

---
**Date**: 2026-01-30
**Author**: Rohit Garewal
