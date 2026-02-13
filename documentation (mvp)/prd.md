Project Nexus - Product Requirements Document (PRD)
Table of Contents
Product Overview

User Personas & Scenarios

Functional Requirements

Non-Functional Requirements

User Stories & Acceptance Criteria

API Specifications

UI/UX Specifications

Data Model

Integration Points

Edge Cases & Error Handling

1. Product Overview {#overview}
Project Nexus MVP menyediakan single Kanban workspace dengan drag-drop persistensi untuk task management. Fokus pada premium purple glassmorphism experience dengan workflow Plan → Progress → Complete.

Version: MVP 1.0
Release Date: February 14, 2026
Scope: Single workspace, no authentication

2. User Personas & Scenarios {#personas}
Primary Scenarios
text
Scenario 1: Daily Task Management
User membuka Nexus → lihat board → drag 3 tasks dari Plan ke Progress → add 2 new cards → client call → refresh → semua tersimpan

Scenario 2: Team Handoff  
Team member drag cards ke Complete → stakeholder demo → smooth glassmorphism UI impress → "This looks professional!"
3. Functional Requirements {#functional}
3.1 Board Management
 Single fixed workspace "Nexus Workspace"

 Default 3 columns: Plan (pos 0), Progress (pos 1), Complete (pos 2)

 Unlimited custom columns

3.2 Column Operations
text
✅ CREATE: POST /api/v1/columns {name} → auto position last
✅ READ: GET /api/v1/board → return all columns + nested cards  
✅ UPDATE: PATCH /api/v1/columns/:id {name}
✅ DELETE: DELETE /api/v1/columns/:id → cascade delete cards
✅ REORDER: Drag column headers (future)
3.3 Card Operations
text
✅ CREATE: POST /api/v1/columns/:id/cards {title, description}
✅ READ: Nested dalam column response
✅ UPDATE: PATCH /api/v1/cards/:id {title, description}
✅ DELETE: DELETE /api/v1/cards/:id → shift other cards position
✅ MOVE: PATCH /api/v1/cards/:id/move {column_id, position}
3.4 Drag & Drop Requirements
text
✅ Reorder dalam column: drag up/down → update positions
✅ Move antar columns: drag left/right → change column_id + position
✅ Visual feedback: ghost preview + drop zone highlight
✅ Persistence: API call on drop + optimistic local update
✅ Conflict resolution: last-write-wins position
4. Non-Functional Requirements {#non-functional}
Category	Requirement	Metric
Performance	Page load	< 2s Lighthouse
Smoothness	Drag animations	60fps Chrome DevTools
Responsiveness	Mobile first	Touch drag-drop smooth
Accessibility	WCAG 2.1 AA	Keyboard navigation + screen reader
Reliability	Data persistence	100% after refresh
Scalability	Concurrent users	10 users OK (MVP)
5. User Stories & Acceptance Criteria {#stories}
Epic 1: Board Display (3 stories)
Story 1.1: Load Nexus Workspace

text
GIVEN app loaded
WHEN visit /
THEN:
• Purple gradient background loads
• 3 default columns visible (Plan/Progress/Complete)  
• Sample cards loaded from API
• Loading skeleton displays during fetch
Story 1.2: Column Rendering

text
GIVEN board data from API
THEN:
• Columns horizontal scroll (desktop)
• Vertical stack + horizontal scroll (mobile)
• Column header shows name + card count
• Glassmorphism cards dengan purple glow
Epic 2: Column CRUD (3 stories)
Story 2.1: Add Column

text
GIVEN empty input area
WHEN click "Add Column" → type "Review" → Enter
THEN:
• POST /api/v1/columns → 201 response
• New column appears position terakhir
• Error toast jika name kosong
Epic 3: Card CRUD (3 stories)
Story 3.1: Add Card

text
GIVEN column visible
WHEN click "Add Task" → "Fix login bug" → "Critical auth issue"
THEN:
• POST /api/v1/columns/:id/cards → card muncul posisi akhir
• Other cards shift position +1
Epic 4: Drag & Drop (4 stories)
Story 4.1: Reorder Cards in Column

text
GIVEN cards [A:0, B:1, C:2]
WHEN drag B → position 0
THEN:
• Local: [B:0, A:1, C:2]
• API: PATCH B move {pos:0}, A move {pos:1}
• Refresh browser → order tetap
Story 4.2: Move Between Columns

text
GIVEN Plan[A:0], Progress[B:0]
WHEN drag A → Progress position 1
THEN:
• A column_id → Progress_id, position:1
• Plan cards shift
• Progress: [B:0, A:1]
6. API Specifications {#api}
Base URL: /api/v1
GET /board
json
{
  "workspace": "Nexus Workspace",
  "columns": [
    {
      "id": "uuid",
      "name": "Plan", 
      "position": 0,
      "cards": [
        {
          "id": "uuid",
          "title": "Design UI",
          "description": "Purple glassmorphism cards",
          "position": 0
        }
      ]
    }
  ]
}
PATCH /cards/:id/move
json
// Request
{ "column_id": "progress-col", "position": 1 }

// Response 200 OK
{ "success": true }
Error Responses

json
400: { "error": "Title required (min 3 chars)" }
404: { "error": "Column not found" }
409: { "error": "Position conflict" }
7. UI/UX Specifications {#uiux}
Design System (Purple Cosmic)
text
Primary: #8B5CF6
Glass Cards: rgba(255,255,255,0.08) backdrop-blur-md
Background: linear-gradient(135deg, #0F0F23 0%, #1E1B4B 100%)
Screen: Nexus Workspace
text
┌──────────────────────────────┐ ← Purple gradient navbar
│ 🪐 NEXUS                    │
├──────────────────────────────┤
│ [Plan (3)] [Progress (2)]   │ ← Glass columns
│ ┌──────────────┐           │
│ │Design UI     │ [+ Add]   │ ← Glass cards
│ │Purple theme  │           │
│ └──────────────┘           │
│ [+ Add Column]              │ ← Floating purple CTA
└──────────────────────────────┘
States
text
Loading: Purple shimmer skeleton
Empty Column: "Drop tasks here ✨"
Error: Purple toast "Network error, retry?"
Success: Subtle purple pulse
8. Data Model {#datamodel}
sql
-- Core Tables
CREATE TABLE columns (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(position)
);

CREATE TABLE cards (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  column_id VARCHAR(36) REFERENCES columns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(column_id, position)
);
Position Strategy: Integer-based ordering dalam column

9. Integration Points {#integration}
text
Frontend → Backend: REST API + optimistic updates
Backend → Database: GORM transactions
Deployment: Railway (Postgres + Go container)
Local Dev: Docker Compose
10. Edge Cases & Error Handling {#edgecases}
Drag-Drop Conflicts
text
Concurrent moves: Last-write-wins
Rapid drag-drop: Debounce 300ms
Network failure: Local state + retry queue
Validation Rules
text
Column name: 1-50 chars, unique
Card title: 3-200 chars required
Position: 0+ integer
Browser Support
text
Chrome 110+, Firefox 110+, Safari 16+, Edge 110+
Mobile: iOS Safari 16+, Chrome Android
Approval & Version History
Version	Date	Changes	Approved
1.0	2026-02-07	Initial MVP PRD	[Lutfi R.H]
Status: Approved for Development
Next Document: FSD → ERD → Implementation

Project Nexus PRD v1.0 - Where tasks align