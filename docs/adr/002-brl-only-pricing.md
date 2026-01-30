# ADR-002: BRL-Only Pricing (No Multi-Currency)

## Status
ACCEPTED

## Context
The application needs to display repair estimates, parts prices, and labor costs. The question is whether to support multiple currencies or focus on Brazilian Real (BRL) only.

## Decision
All pricing is in **Brazilian Real (BRL)** only. No multi-currency support.

## Consequences

**Positive:**
- Simpler data model (no currency field needed)
- No exchange rate management
- Consistent tax calculation (ICMS at 12%)
- Matches VW Brazil dealer network focus

**Negative:**
- Cannot expand to other markets without refactoring
- International users see unfamiliar currency

## Implementation Notes

- All `price` fields in database are `Numeric(10,2)` representing BRL
- Frontend formats with `R$` prefix
- Tax calculations assume Brazilian ICMS rules
- Parts catalog prices are wholesale BRL

## Alternatives Considered

1. **Multi-currency with conversion** - Overkill for demo scope
2. **USD as base with conversion** - Adds complexity, not needed

---
**Date**: 2026-01-30
**Author**: Jefin Francis
