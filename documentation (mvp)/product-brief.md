Product Brief: Project Nexus
1. Executive Summary
Project Nexus adalah aplikasi Kanban board modern untuk task management dengan visual drag-and-drop yang intuitif. Dibangun dengan desain custom purple cosmic theme yang elegan dan berbeda dari Trello, Nexus menawarkan pengalaman produktivitas yang smooth untuk tim dan individu.

MVP Timeline: 1 minggu development + deployment
Target Demo: Live application dengan full CRUD + drag-drop persistensi

2. Business Context & Problem Statement
The Problem
Tim membutuhkan tool visual untuk:

Mengorganisir task dalam workflow yang jelas (Plan → Progress → Complete)

Memindahkan task antar stage dengan drag-drop intuitif

Melihat progress secara real-time tanpa refresh manual

Interface yang modern dan tidak membosankan (bukan Trello clone biasa)

Current Pain Points
text
❌ Spreadsheet tracking lambat dan tidak visual
❌ Email chains membingungkan status task  
❌ Tools existing terlalu kompleks untuk daily use
❌ UI membosankan (flat design era 2018)
3. Target Audience
Persona	Role	Goals	Pain Points
Team Lead Alex	Project Manager	Track progress visual, assign tasks cepat	Manual status update, cari task hilang
Developer Budi	Software Engineer	Drag-drop tasks, lihat dependencies	Context switching antar tools
Designer Clara	UI/UX Designer	Workflow visual, attachment preview	Email-based feedback loop
Primary Market: Internal team (5-20 orang), demo purpose
Secondary Market: Freelancer & small teams

4. Key Value Propositions
text
🎯 Single public workspace (no auth complexity)
✨ Custom purple glassmorphism design  
🚀 Drag-drop instant persist (no refresh)
⚡ 60fps smooth animations
📱 Fully responsive desktop + mobile
5. MVP Feature Set (Week 1 Scope)
Core Features ✅ MUST HAVE
text
1. Single Nexus Workspace (fixed board)
2. Default columns: Plan → Progress → Complete  
3. Unlimited custom columns (add/edit/delete)
4. Cards dengan title + description
5. Drag-drop: reorder dalam column + move antar columns
6. Full CRUD operations (Create/Read/Update/Delete)
7. Data persistence (Postgres)
Out of Scope 🚫 Week 1
text
❌ Authentication & users
❌ Realtime collaboration  
❌ Comments & attachments
❌ Due dates & labels
❌ Multiple boards/workspaces
❌ Mobile app (web responsive only)
6. Success Metrics (Demo Goals)
Metric	Target	Measurement
Core Functionality	100% working	Drag-drop persist setelah refresh
Performance	<2s page load	Lighthouse score 90+
Stability	Zero crashes	Manual test 100 scenarios
Demo Ready	Live URL	Railway/Render deployment
7. Technical Architecture
text
Frontend: Angular 18 + Angular CDK DragDrop
Backend: Go (Gin framework) + GORM ORM
Database: PostgreSQL 15
Deployment: Docker + Railway/Render
Design: Custom purple glassmorphism theme
text
┌─────────────────┐    ┌──────────────┐    ┌──────────┐
│   Angular SPA   │◄──►│ Go REST API  │◄──►│ Postgres │
│                 │    │              │    │   DB     │
└─────────────────┘    └──────────────┘    └──────────┘
     │ drag-drop
     └─────────────── Local State ───────────────┘
8. Competitive Differentiation
Feature	Trello	Jira	Nexus
Design	Blue flat	Enterprise gray	Purple glassmorphism ✨
Setup Time	2min	1 hour	5 seconds
Learning Curve	Medium	Hard	Minimal
Customization	Labels only	Complex	Freeform columns
Performance	Good	Slow	Ultra fast
9. Timeline & Milestones
text
Week 1: MVP Complete 🚀
├── Day 1: Backend API + DB schema
├── Day 2: Frontend shell + drag-drop  
├── Day 3: API integration + CRUD
├── Day 4: UX polish + error handling
├── Day 5: Testing + deployment
└── Day 6-7: Buffer + documentation
10. Brand Identity
text
Name: **NEXUS** (connection point of productivity)
Logo: Orbit constellation + "NEXUS" Space Grotesk
Tagline: "Where tasks align"
Primary Color: #8B5CF6 (Cosmic Violet)
Mood: Futuristic, smooth, confident
11. Risks & Mitigations
Risk	Impact	Mitigation
Drag-drop sync fails	High	Position-based ordering + DB transactions
Agent coding errors	Medium	Daily manual testing + iterative prompts
Deployment issues	Low	Docker + Railway simplicity
Scope creep	High	Strict MVP definition
12. Next Steps (Immediate)
text
1. [ ] Save this Product Brief
2. [ ] Run Antigravity Agent Day 1 prompt 
3. [ ] Test backend endpoints Day 1 night
4. [ ] Daily standup: progress + blockers
Status: Approved for 1-week MVP development

Owner: [Lutfi R.H]
Start Date: February 7, 2026
Demo Date: February 14, 2026