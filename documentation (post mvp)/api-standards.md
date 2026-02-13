# Core API Standards & Governance
## Project Nexus v2.0

| Metadata | Details |
| :--- | :--- |
| **Version** | 1.0 |
| **Protocol** | REST / JSON |
| **Base URL** | `/api/v1` |

---

## 1. Authentication & Security

### JWT Bearer Token
All protected endpoints require an `Authorization` header with a valid JWT.
```http
Authorization: Bearer <token>
```

### Context-Aware Scoping
All handlers **MUST** extract the `UserID` from the request context and scope database queries accordingly.
- ❌ **Bad**: `DB.Find(&board, id)` (Insecure Direct Object Reference possibility)
- ✅ **Good**: `DB.Where("workspace_id = ?", userDefaultWorkspace).Find(&board, id)`

---

## 2. Response Format

### Success
Standard HTTP status codes (200, 201, 204).
JSON body contains the resource or list of resources.

```json
{
  "id": "uuid",
  "title": "Project Nexus",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### Errors
All errors **MUST** follow this structure:

```json
{
  "error": "Short readable message",
  "code": "ERROR_CODE_STRING", // Optional machine-readable code
  "details": {} // Optional validation details
}
```

**Common Status Codes:**
- `400 Bad Request`: Validation failure.
- `401 Unauthorized`: Missing or invalid token.
- `403 Forbidden`: Valid token but insufficient permissions.
- `404 Not Found`: Resource doesn't exist OR user doesn't have access (security through obscurity).
- `500 Internal Server Error`: Unhandled panic or DB failure.

---

## 3. Pagination
List endpoints use cursor-based or offset-based pagination.
Query params: `?page=1&limit=20`

Response wrapper for lists:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

---

## 4. Rate Limiting (v2.1)
*To be implemented with Redis Middleware.*
- **Limit**: 1000 requests / minute / IP.
- **Headers**:
    - `X-RateLimit-Limit`
    - `X-RateLimit-Remaining`
    - `X-RateLimit-Reset`

---

## 5. Date & Time
All timestamps are strictly **ISO 8601** in **UTC**.
```json
"created_at": "2026-02-08T15:04:05Z"
```

---
*End of Standard*
