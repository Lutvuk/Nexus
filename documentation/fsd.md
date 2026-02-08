Project Nexus - Functional Specification Document (FSD)
Document Control
Version	Date	Status	Author
1.0	2026-02-07	Approved	Perplexity AI
Traceability: Product Brief → PRD → FSD → Implementation			
1. System Overview
Project Nexus adalah single-page Kanban application dengan purple glassmorphism design. FSD mendefinisikan exact behavior setiap component, API call, dan user interaction untuk MVP 1-week delivery.

Entry Point: https://nexus-[domain].railway.app/ → Nexus Workspace

2. System Architecture Diagram
text
┌─────────────────────┐    HTTP/JSON    ┌──────────────────┐    SQL    ┌──────────┐
│   Angular Frontend  │◄────────────────│   Go Backend     │◄─────────│ Postgres │
│  ┌──────────────┐   │                 │ ┌─────────────┐  │          │          │
│  │ Nexus Board   │   │                 │ │ Gin Router  │  │          │          │
│  │ Glass Cards   │   │  Optimistic    │ │ Handlers    │  │          │          │
│  │ Drag Context  │───┼─── Updates ────┼►│ GORM ORM    │──┼──────────┼──────────┤
│  └──────────────┘   │                 │ └─────────────┘  │          │          │
└─────────────────────┘                 └──────────────────┘          └──────────┘
3. Data Flow Specification
3.1 Initial Load Sequence
text
1. Browser → Angular App loads
2. Angular → GET /api/v1/board (3s timeout)
3. Backend → SELECT columns ORDER BY position → LEFT JOIN cards ORDER BY position  
4. Backend → { columns: [{id, name, position, cards: [{id,title,desc,position}]}] }
5. Angular → Render columns → populate cdkDropList-connected
6. User → Drag-drop → Optimistic update → PATCH /cards/:id/move → Refresh on success
3.2 Drag-Drop Flow
text
User drags CardX → Mouse over ColumnY
1. Visual: Ghost preview + drop zone purple glow
2. Mouse release → CdkDragDrop event fires
3. Local State: transferArrayItem(oldList, newList, index)
4. Optimistic API: PATCH /cards/:id/move {column_id:Y, position:newIndex}
5. Backend: Transaction → UPDATE affected cards positions
6. Success → Visual success pulse → Data sync confirmed
7. Fail → Revert local state → Error toast purple
4. Component Specifications
4.1 NexusBoardComponent (Root)
text
Inputs: boardData: BoardInterface
Template:
┌─────────────────────────────────────┐
│ 🪐 NEXUS WORKSPACE [Add Column +]   │ ← Floating gold button
├─────────────────────────────────────┤
│ [Plan(3)] [Progress(2)] [Review(1)] │ ← cdkDropListGroup
└─────────────────────────────────────┘

Logic:
ngOnInit() → this.boardService.loadBoard()
cdkDropListDropped() → handleGlobalDrop()
4.2 NexusColumnComponent
text
@Input() column: ColumnInterface
Template:
┌─────────────────────────────┐ ← Column header glass
│ Column Name (3 cards) [✏️] │
├─────────────────────────────┤
│ [Card 1]                    │ ← cdkDropList
│ [Card 2]                    │
│ [+ Add Card]                │ ← Bottom CTA
└─────────────────────────────┘

Events:
columnDropped() → reorderColumns()
cardAdded() → openCardForm()
4.3 NexusCardComponent (Draggable)
text
@Input() card: CardInterface
Template:
┌─────────────────────────────────────┐ ← Glassmorphism
│ 🟣 Fix login bug                    │ ← Title JetBrains Mono
│ Critical auth issue... [✏️][🗑️]    │ ← Actions
└─────────────────────────────────────┘

Drag Events:
cdkDragStarted → showGhostPreview()
cdkDragReleased → boardService.moveCard()
5. API Functional Specification
5.1 GET /api/v1/board
text
Response 200:
{
  "workspace": "Nexus Workspace",
  "timestamp": "2026-02-07T19:27:00Z",
  "columns": [
    {
      "id": "col-plan-001",
      "name": "Plan", 
      "position": 0,
      "card_count": 3,
      "cards": [
        {
          "id": "card-001",
          "title": "Design glassmorphism cards",
          "description": "Purple theme #8B5CF6 primary",
          "position": 0,
          "created_at": "2026-02-07T10:00:00Z"
        }
      ]
    }
  ]
}
5.2 PATCH /api/v1/cards/:id/move
text
Request Body:
{
  "column_id": "col-progress-002", 
  "position": 1
}

Backend Logic (Transaction):
1. DELETE old position constraint
2. UPDATE card SET column_id=new, position=new_pos
3. SHIFT old column cards > old_pos → pos+1  
4. SHIFT new column cards >= new_pos → pos+1
5. INSERT card ke new position
6. State Management Specification
Angular Signals (Modern)
typescript
interface BoardState {
  columns: ColumnState[];
  loading: boolean;
  error: string | null;
  dragActive: boolean;
}

const boardState = signal<BoardState>({
  columns: [],
  loading: true,
  error: null,
  dragActive: false
});
Optimistic Updates Pattern
text
1. User drags → IMMEDIATE local state change
2. PARALLEL API PATCH call
3. Success → State confirmed
4. Fail (<500ms) → Revert + error toast
7. Detailed User Flows
Flow 1: First Time Load (3 seconds max)
text
App Boot → Purple gradient fade-in (500ms)
→ Skeleton shimmer (glass cards loading)
→ API call → Data render → Success pulse
→ User ready to drag
Flow 2: Add Column → Drag → Persist
text
1. Click [+ Add Column] → Modal glass popup
2. "Design System" → Enter → POST → Column slides from right
3. Drag existing card → Gold trail effect → Drop Progress
4. Purple ripple success → API sync → Ready next action
Flow 3: Error Recovery
text
Network drops during drag → Local state preserved
→ Purple toast "Sync failed, retrying..." 
→ Auto-retry 3x → Manual retry button
→ User NEVER loses work
8. Visual & Animation Specifications
Glassmorphism Cards
text
CSS Custom Properties:
--glass-bg: rgba(255,255,255,0.08);
--glass-blur: blur(20px);
--glass-border: 1px solid rgba(139,92,246,0.3);
--purple-glow: 0 0 20px rgba(139,92,246,0.5);
Drag Animation Timeline
text
0ms:   cdkDragStarted → scale(0.95) + opacity 0.8
100ms: Mouse move → ghost element follows pointer
Drop:  Ripple purple expand + cards shift smooth 300ms ease-out
Success: Pulse scale 1.05 → 1.0 (200ms)
9. Database Transaction Specifications
Move Card Transaction (Critical)
sql
BEGIN;
-- 1. Remove from old column
UPDATE cards SET position = position - 1 
WHERE column_id = :old_column AND position > :old_position;

-- 2. Insert to new column  
UPDATE cards SET position = position + 1 
WHERE column_id = :new_column AND position >= :new_position;

-- 3. Update target card
UPDATE cards SET 
  column_id = :new_column, 
  position = :new_position 
WHERE id = :card_id;

COMMIT;
10. Testing Requirements
Backend Unit Tests (Go testify)
text
TestMoveCardSameColumn() → positions [0,1,2] → drag 1→0 → [1,0,2]
TestMoveDifferentColumns() → Plan[0]→Progress[1] → positions shift correct
TestConcurrentMoves() → No data corruption
Frontend E2E (Cypress)
text
cy.visit('/') → cy.get('.nexus-card').drag('.progress-column')
→ cy.reload() → cy.get('.progress-column').contains('Dragged card')
11. Deployment Specification
Docker Compose (Local)
text
services:
  nexus-db:
    image: postgres:15
    environment:
      POSTGRES_DB: nexus
      POSTGRES_PASSWORD: nexus123
  
  nexus-api:
    build: ./backend
    ports:
      - "8080:8080"
    depends_on:
      - nexus-db
Production (Railway)
text
1 Service: nexus-api (Go + Postgres internal)
1 Static: Angular build (Railway static hosting)
Approval Matrix
Stakeholder	Role	Approved
[Your Name]	Product Owner	☐
Perplexity AI	Technical Spec	✅
Antigravity Agent	Implementation	Pending Day 1
Status: Development Ready
Next Phase: ERD → Day 1 Backend Implementation

Project Nexus FSD v1.0 - Precision Engineering