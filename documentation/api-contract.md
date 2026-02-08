Project Nexus - API Contract Specification
Document Control
Version	Date	Status	Author
1.0	2026-02-07	Approved	Perplexity AI
Traceability: Product Brief → PRD → FSD → ERD → API Contract → Backend Implementation			
1. API Overview
Base URL: https://api.nexus-[domain].railway.app/api/v1
Protocol: REST/JSON
Auth: None (MVP public workspace)
CORS: * (development), https://nexus-[domain].railway.app (production)
Rate Limit: 100 req/min (Railway default)

2. HTTP Status Codes
Code	Meaning	Usage
200	OK	GET success
201	Created	POST success
204	No Content	DELETE success
400	Bad Request	Validation error
404	Not Found	Resource missing
409	Conflict	Position violation
500	Server Error	Unexpected backend
3. Complete Endpoint Specifications
3.1 Board Endpoints
GET /api/v1/board
Purpose: Load complete Nexus workspace state
Query Params: None

Response 200:

json
{
  "workspace": {
    "name": "Nexus Workspace",
    "description": "Premium Kanban experience",
    "timestamp": "2026-02-07T19:29:00Z"
  },
  "columns": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Plan",
      "position": 0,
      "card_count": 2,
      "created_at": "2026-02-07T10:00:00Z",
      "cards": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440011",
          "title": "Design glassmorphism UI",
          "description": "Purple #8B5CF6 theme + backdrop-blur",
          "position": 0,
          "created_at": "2026-02-07T10:05:00Z"
        },
        {
          "id": "550e8400-e29b-41d4-a716-446655440012", 
          "title": "Setup Angular CDK",
          "description": "DragDropModule configuration",
          "position": 1,
          "created_at": "2026-02-07T10:10:00Z"
        }
      ]
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Progress", 
      "position": 1,
      "card_count": 1,
      "created_at": "2026-02-07T10:00:00Z",
      "cards": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440021",
          "title": "Go Gin backend API",
          "description": "REST endpoints + GORM transactions",
          "position": 0,
          "created_at": "2026-02-07T11:00:00Z"
        }
      ]
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Complete",
      "position": 2, 
      "card_count": 0,
      "created_at": "2026-02-07T10:00:00Z",
      "cards": []
    }
  ]
}
3.2 Column Endpoints
POST /api/v1/columns
Purpose: Create new column
Headers: Content-Type: application/json

Request:

json
{
  "name": "Review"
}
Response 201:

json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "name": "Review", 
  "position": 3,
  "card_count": 0,
  "created_at": "2026-02-07T19:30:00Z"
}
Error 400:

json
{
  "error": "Name required (1-100 characters)",
  "field": "name",
  "code": "VALIDATION_ERROR"
}
PATCH /api/v1/columns/:id
Request:

json
{
  "name": "Code Review"
}
Response 200:

json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "name": "Code Review",
  "position": 3
}
DELETE /api/v1/columns/:id
Response: 204 No Content
Behavior: Cascade delete all cards in column

3.3 Card Endpoints
POST /api/v1/columns/:column_id/cards
Request:

json
{
  "title": "Deploy to Railway",
  "description": "Docker + Postgres production setup"
}
Response 201:

json
{
  "id": "550e8400-e29b-41d4-a716-446655440031",
  "title": "Deploy to Railway",
  "description": "Docker + Postgres production setup",
  "position": 1,
  "created_at": "2026-02-07T19:35:00Z"
}
PATCH /api/v1/cards/:id
Request (partial update):

json
{
  "title": "Deploy Nexus v1.0"
}
Response 200:

json
{
  "id": "550e8400-e29b-41d4-a716-446655440031",
  "title": "Deploy Nexus v1.0",
  "description": "Docker + Postgres production setup",
  "position": 1
}
PATCH /api/v1/cards/:id/move (CRITICAL DRAG-DROP)
Request:

json
{
  "column_id": "550e8400-e29b-41d4-a716-446655440002",
  "position": 0
}
Response 200:

json
{
  "success": true,
  "moved_card": {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "new_column_id": "550e8400-e29b-41d4-a716-446655440002",
    "new_position": 0
  }
}
Error 409 (Position Conflict):

json
{
  "error": "Position conflict - card moved concurrently",
  "code": "CONFLICT",
  "retry": true
}
DELETE /api/v1/cards/:id
Response: 204 No Content
Behavior: Remove card → shift all cards below it (-1 position)

4. Error Response Format
json
{
  "error": "Human readable message",
  "code": "VALIDATION_ERROR|NOT_FOUND|CONFLICT|SERVER_ERROR",
  "field": "title|name|position|column_id",
  "timestamp": "2026-02-07T19:30:00Z",
  "retry": true/false
}
Examples:

json
// Validation
{ "error": "Title must be 3-200 characters", "code": "VALIDATION_ERROR", "field": "title" }

// Not Found  
{ "error": "Column not found", "code": "NOT_FOUND", "field": "column_id" }

// Conflict
{ "error": "Position already exists in target column", "code": "CONFLICT" }
5. OpenAPI 3.0 Schema (Swagger Ready)
text
openapi: 3.0.0
info:
  title: Project Nexus API
  version: 1.0.0
paths:
  /api/v1/board:
    get:
      summary: Get complete workspace
      responses:
        '200':
          description: Workspace state
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BoardResponse'
6. Backend Handler Signatures (Go Gin)
go
// Handlers interface
type Handlers struct {
  boardHandler    GETBoard
  columnHandler   CRUDColumn
  cardHandler     CRUDCard
  moveHandler     MoveCard
}

// GET /api/v1/board
func (h *Handlers) GetBoard(c *gin.Context) {
  board, err := h.service.GetCompleteBoard()
  // ...
}

// PATCH /api/v1/cards/:id/move  
func (h *Handlers) MoveCard(c *gin.Context) {
  var req MoveCardRequest
  cardID := c.Param("id")
  // Transaction logic from ERD
}
7. Frontend Service Calls (Angular)
typescript
// board.service.ts
loadBoard(): Observable<BoardResponse> {
  return this.http.get<BoardResponse>('/api/v1/board');
}

moveCard(cardId: string, columnId: string, position: number) {
  return this.http.patch(`/api/v1/cards/${cardId}/move`, {
    column_id: columnId,
    position
  });
}
8. Postman Collection Ready
text
Nexus API Testing
├── GET {{baseUrl}}/api/v1/board
├── POST {{baseUrl}}/api/v1/columns 
│   Body: { "name": "Testing" }
├── POST {{baseUrl}}/api/v1/columns/{{colId}}/cards
│   Body: { "title": "Test card", "description": "..." }
└── PATCH {{baseUrl}}/api/v1/cards/{{cardId}}/move
    Body: { "column_id": "{{targetCol}}", "position": 0 }
9. Monitoring & Logging
text
Request ID: X-Request-ID header (correlation)
Log Level: INFO (success), WARN (400/404), ERROR (500+)
Metrics: Request latency, error rate, column/card counts
Approval Matrix
Role	Document	Approved
Product	Product Brief	✅
Product	PRD	✅
Technical	FSD	✅
Database	ERD	✅
Backend	API Contract	✅ READY
Status: Backend Implementation Ready
Next: Day 1 Antigravity → Go Backend Complete

Project Nexus API Contract v1.0 - REST Precision