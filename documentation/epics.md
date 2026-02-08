Project Nexus - Epics & Iteration Plan
Document Control
Version	Date	Status	Author
1.0	2026-02-07	Approved	Perplexity AI
Traceability: Product Brief → PRD → FSD → ERD → API → Wireframes → Design → TDD → Epics → Sprint Execution			
1. Epic Overview (Week 1 MVP)
Total: 7 Epics → 28 Stories → 1 Week Delivery

text
Week 1 Capacity: 28 story points
Epic Distribution: Backend 40% | Frontend 50% | Integration 10%
2. Epic Breakdown (Day-by-Day Execution)
Epic 1: Core Backend Infrastructure (Day 1)
Priority: 🔴 CRITICAL | Story Points: 5 | Day: 1

text
Objective: Go API + Postgres LIVE localhost:8080

Stories:
├── 1.1 Project structure + Gin router [1pt]
├── 1.2 Database schema + migrations [1pt] 
├── 1.3 GORM models + seed data [1pt]
├── 1.4 GET /api/v1/board endpoint [1pt]
└── 1.5 CORS + error middleware [1pt]

Success Criteria:
✅ curl localhost:8080/api/v1/board → perfect JSON
✅ 3 columns + 6 cards visible Postman
Epic 2: Column CRUD Operations (Day 1 PM)
Priority: 🟡 HIGH | Story Points: 4 | Day: 1

text
Stories:
├── 2.1 POST /api/v1/columns [1pt]
├── 2.2 PATCH /api/v1/columns/:id [1pt]
├── 2.3 DELETE /api/v1/columns/:id [1pt]
└── 2.4 Docker compose local [1pt]

Success Criteria:
✅ Postman: Create → List → Update → Delete cycle
✅ docker-compose up → API + DB ready 30s
Epic 3: Card CRUD Operations (Day 2 AM)
Priority: 🟡 HIGH | Story Points: 4 | Day: 2

text
Stories:
├── 3.1 POST /api/v1/columns/:id/cards [1pt]
├── 3.2 PATCH /api/v1/cards/:id [1pt]
├── 3.3 DELETE /api/v1/cards/:id [1pt]
└── 3.4 Backend unit tests [1pt]

Success Criteria:
✅ Full CRUD Postman test pass
✅ Backend coverage 85%+
Epic 4: Drag-Drop Backend (Day 2 PM) CRITICAL
Priority: 🔴 BLOCKER | Story Points: 5 | Day: 2

text
Stories:
├── 4.1 PATCH /api/v1/cards/:id/move handler [2pt]
├── 4.2 DB transaction shift logic [1pt]
├── 4.3 Concurrent move safety [1pt]
└── 4.4 MoveCard unit tests [1pt]

Success Criteria:
✅ Postman PATCH move → positions shift correctly
✅ TestMoveDifferentColumns PASS 100%
Epic 5: Frontend Foundation (Day 3)
Priority: 🔴 CRITICAL | Story Points: 5 | Day: 3

text
Stories:
├── 5.1 Angular project + Tailwind [1pt]
├── 5.2 Design system CSS variables [1pt]
├── 5.3 NexusNavbarComponent [1pt]
├── 5.4 NexusBoardComponent shell [1pt]
└── 5.5 Load board data dummy [1pt]

Success Criteria:
✅ localhost:4200 → Purple glassmorphism perfect
✅ 3 columns render static data
Epic 6: Drag-Drop Frontend (Day 4) CRITICAL
Priority: 🔴 BLOCKER | Story Points: 6 | Day: 4

text
Stories:
├── 6.1 Angular CDK DragDrop setup [1pt]
├── 6.2 NexusColumnComponent drag [1pt]
├── 6.3 NexusCardComponent draggable [1pt]
├── 6.4 Reorder same column [1pt]
├── 6.5 Move between columns [1pt]
└── 6.6 Optimistic updates [1pt]

Success Criteria:
✅ Drag card Plan→Progress → local state updates instantly
✅ 60fps smooth Chrome DevTools
Epic 7: Fullstack Integration (Day 5)
Priority: 🟠 MEDIUM | Story Points: 4 | Day: 5

text
Stories:
├── 7.1 BoardService + HttpClient [1pt]
├── 7.2 API integration all CRUD [1pt]
├── 7.3 End-to-end drag-drop persist [1pt]
└── 7.4 Error handling + loading [1pt]

Success Criteria:
✅ Browser refresh → drag-drop positions PERSIST
✅ Network fail → local state safe
3. Day 6-7: Quality & Deployment
Epic 8: Polish & Deploy (Day 6)
Story Points: 3

text
├── 8.1 Mobile responsive [1pt]
├── 8.2 Micro-interactions [1pt]
└── 8.3 Lighthouse 90+ [1pt]
Epic 9: Documentation (Day 7)
Story Points: 2

text
├── 9.1 README + demo video [1pt]
└── 9.2 Stakeholder handover [1pt]
4. Epic Dependencies
text
Epic 1 (Backend Infra) ──┐
Epic 2 (Column CRUD) ───┼─── Epic 4 (Drag Backend) ─┐
Epic 3 (Card CRUD) ─────┤                          │
                         │                          │
Epic 5 (Frontend) ───────┼─── Epic 6 (Drag Frontend) ─┐
Epic 7 (Integration) ───┘                           │
                                                    │
Epic 8-9 (Quality) ──────────────────────────────────┘
5. Daily Standup Template
text
📅 DAY X PROGRESS:
✅ Completed: Epic X.Y [Zpt]
🔄 In Progress: Epic X.Y
⏳ Blocked: None
🎯 Tomorrow: Epic X.Y

🐛 Bugs: 0 open
🧪 Tests: 38/38 backend PASS
🚀 Demo URL: localhost:8080
6. Success Gates (Daily Checkpoints)
Day	Gate	Criteria	Status
1	Backend Live	curl /api/v1/board → JSON perfect	☐
2	Drag Backend	Postman PATCH move → positions correct	☐
3	Frontend Shell	ng serve → glassmorphism UI	☐
4	Drag Frontend	Local drag-drop 60fps smooth	☐
5	E2E Persist	Refresh browser → data same	☐
6	Deploy Live	Railway URL accessible	☐
7	Demo Ready	Stakeholder walkthrough	☐
7. Antigravity Agent Prompts (Per Epic)
Day 1 Prompt (Epics 1-2):
text
"Execute Epic 1 + Epic 2 from docs/epics.md. Generate Go backend EXACTLY matching API Contract + ERD schema. Include docker-compose.yml. Test endpoints with curl."
Day 4 Prompt (Epic 6):
text
"Execute Epic 6 Drag-Drop Frontend. Use Angular CDK DragDrop per UI Wireframes + Design System CSS. Local state optimistic updates. 60fps smooth."
8. Velocity Tracking
text
Day 1 Target: 9pts (Epics 1-2) → Actual: ___
Day 2 Target: 9pts (Epics 3-4) → Actual: ___
...
Week Total: 28pts → 100% MVP Complete
