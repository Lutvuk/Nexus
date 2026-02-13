Project Nexus - COMPLETE 28 User Stories Specification
Document Control
Version: 1.0 | Date: 2026-02-07 | Status: Approved for 1-Week MVP

EPIC 1: Core Backend Infrastructure (Day 1) - 5 Stories
Story 1.1: Project Structure + Gin Router
Priority: 🔴 P0 | Est: 1pt | Day: 1

As a backend developer, I want clean Go project structure, so that Antigravity can generate maintainable code.

GIVEN empty directory
WHEN go mod init nexus-backend executed
THEN standard clean architecture created:

Acceptance Criteria:

text
□ Folder structure:
  □ cmd/server/main.go
  □ internal/handlers/
  □ internal/services/
  □ internal/models/
  □ internal/repository/
  □ pkg/config/
□ go.mod dependencies:
  □ github.com/gin-gonic/gin
  □ gorm.io/gorm
  □ github.com/stretchr/testify
□ main.go starts Gin router on :8080
□ /health endpoint returns 200 "OK"
□ go run cmd/server/main.go → "Server listening on :8080"
Story 1.2: Database Schema + GORM Migrations
Priority: 🔴 P0 | Est: 1pt | Day: 1

As a database admin, I want automatic schema creation, so that Day 1 backend is DB-ready.

GIVEN Postgres docker container
WHEN Go app first starts
THEN tables created exactly per ERD:

Acceptance Criteria:

text
□ GORM AutoMigrate creates:
  □ columns(id UUID PK, name VARCHAR(100), position INTEGER UNIQUE)
  □ cards(id UUID PK, title VARCHAR(200), column_id UUID FK CASCADE)
□ Constraints enforced:
  □ CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100)
  □ CHECK (LENGTH(title) >= 3 AND LENGTH(title) <= 200)
  □ UNIQUE(column_id, position)
□ docker-compose up → DB schema ready < 30s
□ Connection string from .env: POSTGRES_URL
Story 1.3: GORM Models + Seed Data
Priority: 🔴 P0 | Est: 1pt | Day: 1

As a product owner, I want seeded demo data, so that frontend has realistic content Day 1.

GIVEN empty database
WHEN app starts first time
THEN exact seed data from ERD:

Acceptance Criteria:

text
□ INSERT columns (fixed UUIDs):
  □ 00000000-0000-0000-0000-000000000001 = "Plan" pos 0
  □ 00000000-0000-0000-0000-000000000002 = "Progress" pos 1  
  □ 00000000-0000-0000-0000-000000000003 = "Complete" pos 2
□ INSERT cards (2 Plan, 1 Progress, 1 Complete):
  □ Plan: "Design glassmorphism UI", "Setup Angular CDK"
  □ Progress: "Go Gin backend API"
  □ Complete: "Docker compose setup"
□ Idempotent: Second run → NO duplicates
Story 1.4: GET /api/v1/board Endpoint
Priority: 🔴 P0 | Est: 1pt | Day: 1

As a frontend developer, I want complete board JSON, so that Angular can render immediately.

GIVEN seeded database
WHEN curl localhost:8080/api/v1/board
THEN nested JSON exactly matches API Contract:

Acceptance Criteria:

text
□ Response 200 structure:
  { "workspace": {...}, "columns": [{id,name,position,card_count,cards:[...]}] }
□ cards ORDER BY position ASC per column
□ Query performance < 50ms (JOIN optimized)
□ Postman collection test passes
□ Response size ~2KB (3 cols + 6 cards)
□ Cache headers: no-cache (fresh data)
Story 1.5: CORS + Error Middleware
Priority: 🟡 P1 | Est: 1pt | Day: 1

As a frontend developer, I want CORS enabled, so that Angular 4200 ↔ Go 8080 works.

GIVEN Angular calls from localhost:4200
WHEN browser preflight OPTIONS
THEN CORS headers returned:

Acceptance Criteria:

text
□ Headers:
  □ Access-Control-Allow-Origin: *
  □ Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS
  □ Access-Control-Allow-Headers: Content-Type
□ Error format JSON:
  { "error": "...", "code": "VALIDATION_ERROR", "field": "title" }
□ 500 errors → LOG to stdout + stack trace
□ Graceful shutdown: docker stop → clean DB close
EPIC 2: Column CRUD Operations (Day 1 PM) - 4 Stories
Story 2.1: POST /api/v1/columns Create
Priority: 🟡 P1 | Est: 1pt | Day: 1

As a product manager, I want to add custom columns, so that workflow adapts to my needs.

GIVEN POST /api/v1/columns {"name": "Review"}
WHEN endpoint executes
THEN column created position = MAX+1:

Acceptance Criteria:

text
□ Request validation:
  □ name: 1-100 chars required
  □ empty → 400 "Name required (1-100 characters)"
□ Response 201:
  { "id": "uuid", "name": "Review", "position": 3, "card_count": 0 }
□ Database: SELECT COUNT(*) FROM columns = 4
□ GET /board → new column visible end of list
Story 2.2: PATCH /api/v1/columns/:id Update
Priority: 🟡 P1 | Est: 1pt | Day: 1

As a product manager, I want to rename columns, so that workflow names are clear.

GIVEN column exists, PATCH /columns/col123 {"name": "Code Review"}
WHEN endpoint executes
THEN name updated:

Acceptance Criteria:

text
□ 200 OK → {id,col123,name:"Code Review",position:3}
□ Invalid UUID → 404 "Column not found"
□ Empty JSON body → 200 no change
□ Name >100 chars → 400 "Name too long"
□ GET /board → updated name visible
Story 2.3: DELETE /api/v1/columns/:id
Priority: 🟡 P1 | Est: 1pt | Day: 1

As a product manager, I want to delete columns, so that I cleanup unused workflow stages.

GIVEN column with 3 cards, DELETE /columns/col456
WHEN endpoint executes
THEN cascade delete:

Acceptance Criteria:

text
□ Response: 204 No Content
□ Database check:
  □ SELECT * FROM columns WHERE id=col456 → 0 rows
  □ SELECT * FROM cards WHERE column_id=col456 → 0 rows  
□ Position gap preserved (no auto reordering)
□ Non-existent ID → 404 "Column not found"
Story 2.4: Docker Compose Local Dev
Priority: 🟡 P1 | Est: 1pt | Day: 1

As a developer, I want docker-compose up works, so that local dev is instant.

GIVEN clone repo
WHEN docker-compose up --build
THEN fullstack local ready:

Acceptance Criteria:

text
□ docker-compose.yml:
  □ nexus-db: postgres:15 (5432:5432)
  □ nexus-api: build . ports 8080:8080
□ .env template: POSTGRES_PASSWORD=nexus123
□ docker-compose up → API ready < 60s
□ curl localhost:8080/api/v1/board → seeded data
□ docker-compose down → clean shutdown
EPIC 3: Card CRUD Operations (Day 2 AM) - 4 Stories
Story 3.1: POST /api/v1/columns/:id/cards
Priority: 🟡 P1 | Est: 1pt | Day: 2

As a team member, I want to add tasks to columns, so that workflow starts.

GIVEN POST /columns/plan-uuid/cards {"title": "Fix login"}
WHEN endpoint executes
THEN card position = MAX+1:

Acceptance Criteria:

text
□ 201 Created:
  {id:"uuid",title:"Fix login",position:2,column_id:"plan-uuid"}
□ Validation:
  □ title: 3-200 chars required
  □ title <3 chars → 400 "Title too short"
  □ invalid column_id → 404 "Column not found"
□ GET /board → new card visible in Plan pos 2
Story 3.2: PATCH /api/v1/cards/:id Update
Priority: 🟡 P1 | Est: 1pt | Day: 2

As a team member, I want to edit task details, so that status is accurate.

GIVEN PATCH /cards/card123 {"title": "Fix auth flow"}
WHEN endpoint executes
THEN partial update:

Acceptance Criteria:

text
□ 200 OK → updated card JSON
□ Partial update: title only → desc unchanged
□ Invalid card ID → 404
□ Empty JSON → 200 no change
□ GET /board → updated title visible
Story 3.3: DELETE /api/v1/cards/:id
Priority: 🟡 P1 | Est: 1pt | Day: 2

As a team member, I want to delete completed tasks, so that board stays clean.

GIVEN DELETE /cards/card456 (position 1 of 3 cards)
WHEN endpoint executes
THEN remaining cards shift:

Acceptance Criteria:

text
□ 204 No Content
□ Before: [A:0,B:1,C:2] → Delete B
□ After: [A:0,C:1] ✓ positions shift up
□ Invalid ID → 404
□ GET /board → card gone, positions correct
Story 3.4: Backend Unit Tests Coverage
Priority: 🟠 P2 | Est: 1pt | Day: 2

As a QA engineer, I want testify suite 85%+, so that refactors are safe.

GIVEN go test ./... -coverprofile=coverage.out
WHEN tests execute
THEN critical paths covered:

Acceptance Criteria:

text
□ TestCreateColumnValid/Empty [PASS]
□ TestMoveCardSameColumnUp/Down [PASS]
□ TestMoveDifferentColumns [PASS]
□ Backend coverage: handlers 90%+, services 95%+
□ go test ./... → 0 failures
□ Coverage report → HTML generated
EPIC 4: Drag-Drop Backend CRITICAL (Day 2 PM) - 5 Stories
Story 4.1: PATCH /api/v1/cards/:id/move Handler BLOCKER
Priority: 🔴 P0 | Est: 2pt | Day: 2

As a frontend, I want drag-drop API, so that cards move between columns.

GIVEN Card Plan, PATCH /cards/card123/move {"column_id":"progress","position":1}
WHEN endpoint executes
THEN ACID transaction shifts positions:

Acceptance Criteria:

text
□ Request validation → 200 OK
□ Transaction sequence:
  1. Plan cards pos>0 → position-1
  2. Progress cards pos>=1 → position+1  
  3. UPDATE card123 column_id+position
□ Response: {success:true, moved_card:{...}}
□ Postman test → positions EXACTLY correct
Story 4.2: DB Transaction Shift Logic
Priority: 🔴 P0 | Est: 1pt | Day: 2

As a DBA, I want bulletproof transactions, so that concurrent drags safe.

GIVEN → move B→0
​
​
WHEN transaction executes
THEN final state:
​
​

Acceptance Criteria:

text
□ SQL executed in ORDER:
  □ UPDATE position-1 (old column > old_pos)
  □ UPDATE position+1 (new column >= new_pos)
  □ UPDATE target card
□ ROLLBACK on ANY error
□ BEGIN; COMMIT; logged
Story 4.3: Concurrent Move Safety
Priority: 🔴 P0 | Est: 1pt | Day: 2

As a QA, I want concurrent drag safety, so that 3 users dragging simultaneously safe.

GIVEN 2 parallel PATCH move requests
WHEN race condition occurs
THEN last-write-wins, no corruption:

Acceptance Criteria:

text
□ TestConcurrentMoves PASS
□ 409 Conflict → client retry logic
□ Deadlock detection → automatic retry
□ Final state consistent
Story 4.4: MoveCard Unit Tests CRITICAL
Priority: 🔴 P0 | Est: 1pt | Day: 2

As a backend dev, I want 100% move logic test coverage, so that drag-drop bulletproof.

GIVEN go test ./internal/services -run TestMoveCard
WHEN test suite runs
THEN all scenarios covered:

Acceptance Criteria:

text
□ TestMoveSameColumnUp: [A0,B1]→B0,A1 ✓
□ TestMoveSameColumnDown: [A0,B1]→B0,A1 ✓
□ TestMoveDifferentColumns: Plan→Progress ✓
□ TestMoveNonExistentCard: 404 ✓
□ TestPositionConflict: 409 ✓
□ Coverage 100% move service
EPIC 5: Frontend Foundation (Day 3) - 5 Stories
Story 5.1: Angular Project + Tailwind Setup
Priority: 🔴 P0 | Est: 1pt | Day: 3

As a frontend dev, I want Angular 18 + Tailwind, so that design system instant.

GIVEN ng new nexus-frontend --routing --style=scss
WHEN Tailwind installed
THEN purple glassmorphism ready:

Acceptance Criteria:

text
□ ng add @angular/cdk
□ npm i tailwindcss postcss autoprefixer
□ tailwind.config.js → custom violet colors
□ ng serve → purple gradient background
□ Mobile responsive viewport meta
Story 5.2: Design System CSS Variables
Priority: 🔴 P0 | Est: 1pt | Day: 3

As a designer, I want CSS variables exact specs, so that glassmorphism perfect.

GIVEN :root CSS variables from Design System doc
WHEN styles applied
THEN cosmic purple theme live:

Acceptance Criteria:

text
□ --violet-500: #8B5CF6
□ --glass-bg: rgba(255,255,255,0.08)
□ --gradient-space → body background
□ Google Fonts: Space Grotesk + JetBrains Mono
□ .nexus-card → glassmorphism hover ✓
Story 5.3: NexusNavbarComponent
Priority: 🟡 P1 | Est: 1pt | Day: 3

As a user, I want branded navbar, so that app identity clear.

GIVEN <app-nexus-navbar>
WHEN page loads
THEN premium navbar visible:

Acceptance Criteria:

text
□ Template: 🪐 NEXUS WORKSPACE [19:34]
□ Height: 64px fixed
□ Glassmorphism backdrop-blur
□ Purple gradient box-shadow
□ Responsive: mobile hamburger menu
Story 5.4: NexusBoardComponent Shell
Priority: 🟡 P1 | Est: 1pt | Day: 3

As a user, I want board layout, so that columns organize horizontally.

GIVEN <app-nexus-board>
WHEN static data renders
THEN 3-column layout perfect:

Acceptance Criteria:

text
□ Flex horizontal scroll
□ Column gap: 24px
□ Min-width: 340px per column
□ [+ ADD COLUMN] floating button
□ Mobile: vertical stack + horizontal scroll
Story 5.5: Load Board Data Dummy
Priority: 🟡 P1 | Est: 1pt | Day: 3

GIVEN hardcoded mock data
WHEN ngOnInit()
THEN realistic board renders:

Acceptance Criteria:

text
□ Navbar: "🪐 NEXUS WORKSPACE"
□ Plan(2): Design UI, Angular CDK
□ Progress(1): Go Gin backend  
□ Complete(1): Docker compose
□ Glass cards per Design System
□ Loading skeleton shimmer 500ms
EPIC 6: Drag-Drop Frontend CRITICAL (Day 4) - 6 Stories
Story 6.1: Angular CDK DragDrop Setup
Priority: 🔴 P0 | Est: 1pt | Day: 4

As a frontend dev, I want CDK DragDropModule configured, so that native drag works.

GIVEN ng add @angular/cdk
WHEN DragDropModule imported
THEN drag infrastructure ready:

Acceptance Criteria:

text
□ import { DragDropModule } from '@angular/cdk/drag-drop'
□ @NgModule imports: [DragDropModule]
□ cdkDropListGroup container
□ Console: no CDK errors
□ Chrome DevTools: drag events fire
Story 6.2: NexusColumnComponent cdkDropList
Priority: 🔴 P0 | Est: 1pt | Day: 4

As a user, I want columns accept drops, so that cards can land.

GIVEN <app-nexus-column>
WHEN CDK connected
THEN drop zones active:

Acceptance Criteria:

text
□ cdkDropList id="plan-col", "progress-col"
□ [cdkDropListData]="column.cards"
□ Drop zone purple glow on hover
□ Console log drop events
□ HTML inspector → CDK attributes present
Story 6.3: NexusCardComponent cdkDrag
Priority: 🔴 P0 | Est: 1pt | Day: 4

As a user, I want cards draggable, so that I can lift them.

GIVEN <app-nexus-card>
WHEN mouse down
THEN drag preview appears:

Acceptance Criteria:

text
□ cdkDrag on nexus-card
□ Drag handle visible (optional grip icon)
□ cdkDragPreview → ghost card follows cursor
□ Opacity 0.8 + purple glow during drag
□ Drop → ghost disappears
Story 6.4: Reorder Same Column
Priority: 🔴 P0 | Est: 1pt | Day: 4

As a user, I want reorder within column, so that priority changes instantly.

GIVEN Plan, drag B → pos 0
​
WHEN cdkDropListDropped fires
THEN local reorder + API:

Acceptance Criteria:

text
□ moveItemInArray(column.cards, 1, 0)
□ DOM immediately: [B,A]
□ PATCH /cards/B/move {pos:0} optimistic
□ Network fail → revert local state
□ Chrome Network → API PATCH fired
Story 6.5: Move Between Columns
Priority: 🔴 P0 | Est: 1pt | Day: 4

As a user, I want drag Plan→Progress, so that workflow advances.

GIVEN Plan → drag to Progress pos 1
WHEN drop on Progress
THEN transfer + persist:

Acceptance Criteria:

text
□ transferArrayItem(plan.cards, progress.cards, 0, 1)
□ DOM: Plan[], Progress[B:0,A:1]
□ PATCH /cards/A/move {column:"progress",pos:1}
□ Visual: purple ripple success
□ 60fps smooth Chrome DevTools
Story 6.6: Optimistic Updates
Priority: 🟡 P1 | Est: 1pt | Day: 4

As a user, I want instant feedback, so that drag feels native.

GIVEN Drag-drop event
WHEN mouse released
THEN UI updates before API response:

Acceptance Criteria:

text
□ Local state → DOM change 16ms
□ PARALLEL PATCH API call
□ Success 200 → confirm state
□ Fail 500 → revert + purple toast "Retry?"
□ Loading spinner during API <500ms
EPIC 7: Fullstack Integration (Day 5) - 4 Stories
Story 7.1: BoardService + HttpClient
Priority: 🟠 P2 | Est: 1pt | Day: 5

As a frontend dev, I want typed services, so that API integration clean.

GIVEN interfaces from API Contract
WHEN services created
THEN all endpoints wrapped:

Acceptance Criteria:

text
□ BoardService: loadBoard(): Observable<BoardResponse>
□ ColumnService: create/update/delete
□ CardService: create/move/delete
□ HttpClientModule imported
□ RxJS error handling pipe
Story 7.2: Wire All CRUD Operations
Priority: 🟠 P2 | Est: 1pt | Day: 5

As a user, I want add/edit/delete buttons work, so that full CRUD live.

GIVEN [+ Add Task], [✏️], [🗑️] buttons
WHEN clicked
THEN API calls + refresh:

Acceptance Criteria:

text
□ Add column → POST → list refresh
□ Edit card → PATCH → inline update
□ Delete → DELETE → list shrinks
□ Form validation frontend + backend
□ Success toast purple pulse
Story 7.3: E2E Drag-Drop Persist BLOCKER
Priority: 🔴 P0 | Est: 1pt | Day: 5

As a stakeholder, I want drag → refresh → data persists, so that demo bulletproof.

GIVEN backend localhost:8080, frontend 4200
WHEN drag Plan→Progress → F5 refresh
THEN card stays Progress:

Acceptance Criteria:

text
□ Drag A → Progress pos 1 ✓
□ Browser refresh → A still Progress pos 1 ✓
□ 3 tabs concurrent drag → consistent ✓
□ Network offline → local state safe ✓
□ Video recording for demo ✓
Story 7.4: Error Handling + Loading States
Priority: 🟠 P2 | Est: 1pt | Day: 5

As a user, I want graceful failures, so that UX smooth always.

GIVEN network drops during drag
WHEN API 500 error
THEN safe fallback:

Acceptance Criteria:

text
□ Loading spinner during API calls
□ Network error → purple toast "Retry?"
□ Offline drag → queue + auto sync
□ 404 column → "Column not found"
□ Form validation toast purple
EPIC 8: Polish & Quality (Day 6) - 3 Stories
Story 8.1: Mobile Responsive Design
Priority: 🟡 P1 | Est: 1pt | Day: 6

As a mobile user, I want touch drag-drop, so that works on phone.

GIVEN iPhone Chrome DevTools 375px
WHEN touch drag card
THEN smooth mobile experience:

Acceptance Criteria:

text
□ Columns stack vertical + horizontal scroll
□ Touch targets 48px minimum
□ Touch drag-drop works (CDK touch)
□ Chrome Mobile → Lighthouse Mobile 90+
□ iPad landscape 2-column layout
Story 8.2: Micro-interactions & Animations
Priority: 🟢 P3 | Est: 1pt | Day: 6

As a user, I want delightful animations, so that premium feel.

GIVEN drag-drop interactions
WHEN user interacts
THEN cosmic animations:

Acceptance Criteria:

text
□ Card drag → purple ghost trail
□ Drop success → purple ripple expand
□ Add card → slide up from bottom
□ Hover → glass glow + scale 1.02
□ 60fps Chrome DevTools Performance
Story 8.3: Lighthouse Performance 90+
Priority: 🟢 P3 | Est: 1pt | Day: 6

As a SEO/performance expert, I want Lighthouse 90+, so that production ready.

GIVEN ng build --prod
WHEN Lighthouse audit
THEN production scores:

Acceptance Criteria:

text
□ Performance: 90+
□ Accessibility: 95+
□ Best Practices: 90+
□ SEO: 85+
□ Bundle analyzer < 500KB gzipped
□ ng serve --prod works locally
EPIC 9: Documentation & Demo (Day 7) - 2 Stories
Story 9.1: README + Demo Video
Priority: 🟢 P3 | Est: 1pt | Day: 7

As a stakeholder, I want complete docs, so that I understand + deploy.

GIVEN finished MVP
WHEN README written
THEN self-service deployment:

Acceptance Criteria:

text
□ README.md:
  □ Architecture diagram
  □ docker-compose up instructions
  □ Railway deploy guide
  □ API Postman collection
□ Demo video: drag-drop + refresh
□ Screenshots all screen sizes
□ License MIT
Story 9.2: Stakeholder Demo Preparation
Priority: 🟢 P3 | Est: 1pt | Day: 7

As a product owner, I want demo script, so that stakeholders impressed.

GIVEN live Railway URL
WHEN demo walkthrough
THEN clear value demonstration:

Acceptance Criteria:

text
□ Demo script 3min:
  1. Load Nexus Workspace
  2. Add column "Review"  
  3. Drag 3 cards Plan→Progress→Complete
  4. Refresh → data persists
  5. Concurrent tab demo
□ Live URL bookmarked
□ QR code for mobile demo
□ Success metrics achieved
GRAND TOTAL: 28 Stories = 28 Points = 1 Week ✓
text
Day 1: 9pts (Epics 1-2) Backend LIVE
Day 2: 9pts (Epics 3-4) Drag Backend ✓  
Day 3: 5pts (Epic 5) Frontend Shell
Day 4: 6pts (Epic 6) Drag Frontend ✓
Day 5: 4pts (Epic 7) E2E Integration
Day 6: 3pts (Epic 8) Polish
Day 7: 2pts (Epic 9) Demo Ready