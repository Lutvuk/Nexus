# Project Nexus v2.0: Technical Specifications 🚀

**Date:** 2026-02-08  
**Version:** 2.0-Alpha (SaaS Evolution)  
**Status:** Architecture Locked  
**Stack:** Go (Gin/GORM) + Angular 18 (Signals/CDK) + PostgreSQL

---

## 1. Product Brief & PRD Summary
* **Vision:** Transform a local-first Kanban into a collaborative SaaS.
* **Key Features:** JWT Auth, Workspace hierarchy, "Deep Cards" (Markdown/Checklists), and WebSockets.
* **Performance Goal:** 60fps UI interactions with <100ms API latency.

---

## 2. Entity Relationship Diagram (ERD)

### 2.1 Schema Overview
The database utilizes a relational structure to support multi-tenancy and complex card metadata.



### 2.2 Table Definitions (PostgreSQL)

| Table | Key Columns | Purpose |
| :--- | :--- | :--- |
| **users** | `id`, `email`, `password_hash` | Identity and Auth. |
| **workspaces**| `id`, `name`, `owner_id` | Top-level organizational unit. |
| **boards** | `id`, `workspace_id`, `title` | Project-specific canvas. |
| **columns** | `id`, `board_id`, `position` | Workflow stages (Todo, In Progress). |
| **cards** | `id`, `column_id`, `position` | Task units with Markdown support. |
| **checklists** | `id`, `card_id`, `title` | Sub-tasks within a card. |

---

## 3. API Contract (v1)

All endpoints prefixed with `/api/v1`. Private routes require `Authorization: Bearer <JWT>`.

### 3.1 Authentication
* **POST** `/auth/register` | `payload: { email, password, name }`
* **POST** `/auth/login` | `returns: { access_token, user: { ... } }`

### 3.2 Card & Column Operations
* **PATCH** `/cards/:id/position`
    * **Payload:** `{ "column_id": "uuid", "new_position": 150.5 }`
    * **Logic:** Uses Midpoint Algorithm to avoid full column re-indexing.
* **POST** `/cards/:id/checklists`
    * **Payload:** `{ "title": "Backend Tasks" }`

### 3.3 WebSocket Events
* **Endpoint:** `/ws/board/:id`
* **Broadcast Payload:**
    ```json
    {
      "type": "CARD_MOVED",
      "data": { "card_id": "uuid", "to_column": "uuid", "new_position": 150.5 }
    }
    ```

---

## 4. Functional Specifications (FSD)

### 4.1 Midpoint Positioning Formula
To insert a card between Position $A$ and Position $B$:
$$P_{new} = \frac{P_A + P_B}{2}$$

### 4.2 State Management (Angular)
* **Optimistic UI:** Local Signals update instantly; `BoardService` listens for `HTTP 4xx/5xx` to revert state.
* **Real-time:** `WebSocketService` pushes updates directly into the `BoardStore` signal, triggering a UI-only refresh (no full reload).

---

# Project Nexus v2.0: Technical Specifications 🚀

... [Previous Sections 1-4: Brief, PRD, FSD, ERD, API Contract] ...

---

## 5. UI Wireframes & Layout Logic

### 5.1 Dashboard (The Hub)
* **Sidebar**: Collapsible frosted glass panel containing "My Workspaces" and "Starred Boards".
* **Main Grid**: Responsive grid of cards with `backdrop-filter: blur(20px)` representing individual boards.
* **Empty State**: Illustrated "Empty Board" view with a primary CTA: "+ Create First Board".

### 5.2 The "Deep Card" Modal
* **Header**: Features an inline-editable title and Label chips.
* **Left Column (70%)**: Houses the Markdown description editor and Checklist groups with visual progress bars.
* **Right Column (30%)**: Contains Meta-actions (Assignee, Due Date, Move, Archive) and a chronological Activity log.

### 5.3 Board Navigation & Search
* **Search Bar**: A top-level glass-styled input that filters the `boards` Signal in real-time for instant feedback.
* **Navigation**: Interaction with a Board Card triggers `router.navigate(['/board', board.id])`.
* **Breadcrumbs**: A dynamic path display (e.g., `Workspace > Project Nexus`) for seamless navigation back to the Dashboard.

### 5.4 Board Creation Flow
* **Trigger**: Interaction with the "+ New Board" button.
* **UI Component**: `CreateBoardModalComponent` (A custom Glassmorphic Modal replacing native browser prompts).
* **Validation**: Input title must be between 3 and 50 characters.
* **Backend Hook**: Executes `POST /api/v1/boards`. The handler extracts the `userID` from the JWT to automatically link the board to the correct Workspace.

---

## 6. Design System Expansion

Based on the existing Glassmorphism theme, we define the following tokens:

| Token | Value | Application |
| :--- | :--- | :--- |
| **Glass Base** | `rgba(255, 255, 255, 0.05)` | Card and Column backgrounds. |
| **Glass Border** | `rgba(255, 255, 255, 0.1)` | 1px solid borders for depth. |
| **Accent Purple** | `#8B5CF6` | Primary buttons, active checklists, focus rings. |
| **Status Red** | `#EF4444` | Delete actions and overdue dates. |
| **Typography** | `Inter, sans-serif` | Clean, high-readability sans-serif. |

---

## 7. TDD Strategy (Test Driven Development)

### 7.1 Backend (Go)
* **Unit Tests:** Test the Midpoint Algorithm logic in isolation (ensure $P_{new}$ never equals $P_A$ or $P_B$).
* **Integration Tests:** Mock PostgreSQL to test the `Repository` layer and `JWT` middleware authentication.
* **Tooling:** `Testify` for assertions and `httptest` for Gin route validation.

### 7.2 Frontend (Angular)
* **Component Tests:** Verify that the `CardDetailModal` renders Markdown correctly.
* **Service Tests:** Ensure the `WebSocketService` correctly updates the Board Signal without side effects.
* **Tooling:** `Jasmine` + `Karma` for unit testing; `Cypress` for E2E Drag-and-Drop flows.

---

## 8. Development Roadmap: Epics & Stories

### Epic 1: Identity & Multi-Tenancy (Day 3)
* **Story 1.1:** [Backend] Implement User registration/login with Argon2 and JWT.
* **Story 1.2:** [Frontend] Create Login/Register views and AuthGuard.
* **Story 1.3:** [Database] Implement Workspace/Board ownership checks.

### Epic 2: The Deep Card Experience (Day 4-5)
* **Story 2.1:** [Frontend] Build the `CardDetail` modal with Markdown toggle.
* **Story 2.2:** [Backend] Create CRUD endpoints for Checklists and Checklist Items.
* **Story 2.3:** [UI] Standardize the Label picker and Assignment dropdown.

### Epic 3: Real-Time & Physics 2.0 (Day 6)
* **Story 3.1:** [Backend] Build the WebSocket Hub for Board-specific broadcasting.
* **Story 3.2:** [Frontend] Integrate `WebSocketService` to trigger Signal updates.
* **Story 3.3:** [UI] Implement "Snap-back" logic for failed Optimistic updates.

---

## 9. Final Roadmap (The Sprint)

* **Day 1:** Docs (Complete).
* **Day 2:** UI/Design Specs (Complete).
* **Day 3-4:** Backend Core (Auth & Database migrations).
* **Day 5:** Deep Card Components & Markdown Logic.
* **Day 6:** WebSocket Integration & Real-time Sync.
* **Day 7:** TDD Verification, Bug Squashing, & Deployment.