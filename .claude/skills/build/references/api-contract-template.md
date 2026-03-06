# API Contract Template

Define the contract BEFORE implementing the endpoint. Fill in each section.

---

## Endpoint: [METHOD] /api/[path]

### Purpose
[One sentence describing what this endpoint does]

### Authentication
- [ ] No auth required (public)
- [ ] User auth required (`requireAuth`)
- [ ] Owner auth required (`requireOwner`)

### Request

**URL Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| slug | string | yes | Extension identifier |

**Query Parameters (for GET):**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| pageSize | number | 20 | Items per page (max 100) |
| q | string | — | Search query |

**Request Body (for POST/PATCH):**
```typescript
interface RequestBody {
  name: string;        // Required, kebab-case, max 64 chars
  description: string; // Required, min 10, max 500 chars
  category?: string;   // Optional, from predefined list
}
```

**Zod Schema:**
```typescript
const requestSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z][a-z0-9-]*$/),
  description: z.string().min(10).max(500),
  category: z.string().max(50).optional(),
});
```

### Response

**Success (200/201):**
```json
{
  "data": {
    "id": "uuid",
    "slug": "extension-name",
    "name": "Extension Name",
    "description": "..."
  },
  "meta": {
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Request body fails schema validation |
| 400 | `INVALID_JSON` | Request body is not valid JSON |
| 401 | `UNAUTHORIZED` | Missing or invalid auth token |
| 403 | `FORBIDDEN` | User does not own this resource |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource with same slug already exists |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

**Error Shape:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "field": "name", "message": "Must be lowercase with hyphens only" }
    ]
  }
}
```

### Database Queries Used
- `listExtensions(pool, { search, category, page, pageSize })`
- `createExtension(pool, { name, description, publisherId })`

### Side Effects
- [ ] Creates database record
- [ ] Uploads file to S3
- [ ] Sends notification
- [ ] Logs analytics event

### Rate Limiting
- [ ] None
- [ ] Standard (100/min per user)
- [ ] Strict (10/min per user — for uploads)

### Notes
[Any additional context, edge cases, or decisions]
