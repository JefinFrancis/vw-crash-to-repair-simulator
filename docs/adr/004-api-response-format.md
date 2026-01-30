# ADR-004: API Returns Arrays Directly (No Pagination Wrapper)

## Status
ACCEPTED

## Context
REST APIs commonly return list endpoints in two formats:

1. **Direct array**: `[{...}, {...}, {...}]`
2. **Wrapped object**: `{ items: [...], total: 100, page: 1 }`

The question is which format to use for this application.

## Decision
All list endpoints return **arrays directly** without pagination wrappers.

```json
// GET /api/v1/vehicles/
[
  { "id": "uuid-1", "model": "T-Cross", ... },
  { "id": "uuid-2", "model": "Golf", ... }
]
```

## Consequences

**Positive:**
- Simpler frontend code (no `.items` unwrapping)
- Consistent response shape
- Easier to test with curl/Postman

**Negative:**
- No built-in pagination metadata
- Need query params for filtering (`?limit=10&offset=0`)
- Large datasets could be problematic

## Implementation Notes

- All `/api/v1/{resource}/` endpoints return `List[Schema]`
- Filtering via query parameters: `?model=tcross&year=2024`
- For large datasets, use `?limit=50&offset=0`
- Frontend services expect arrays, not objects

## When to Change

If any collection exceeds ~1000 records and pagination becomes necessary, revisit this decision. For demo purposes, current data volumes are small enough.

---
**Date**: 2026-01-30
**Author**: Jefin Francis
