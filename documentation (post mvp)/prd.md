# Product Requirements Document (PRD)
## Project Nexus v2.0

| Metadata | Details |
| :--- | :--- |
| **Version** | 1.0 (Signed-Off) |
| **Status** | Approved for Development |
| **Product Owner** | Antigravity |
| **Tech Stack** | Go (Gin), Angular 18, PostgreSQL, Redis |
| **Target Release** | Q2 2026 |

---

## 1. Background & Problem Statement

### Context
Enterprises currently face a "fragmentation tax" where task management lives in one tool (e.g., Trello) and project documentation lives in another (e.g., Notion, Google Docs). This context switching kills productivity. Furthermore, existing SaaS solutions often fail to provide the strict data isolation required by regulated industries.

### The Problem
- **Silos**: Tasks and context (notes/docs) are disconnected.
- **Security**: Generic SaaS lack tenant-level data isolation.
- **Latency**: Heavy client-side apps become sluggish with large boards.

### Our Solution
**Project Nexus v2.0**: A high-performance, self-hostable project management platform that fuses Trello-like Kanban efficiency with "Google Keep" style documentation, all under strict enterprise-grade security.

---

## 2. Objectives

### Business Objectives
1.  **Feature Parity**: Match 90% of Trello's core utility to ensure zero user friction during migration.
2.  **Consolidation**: Reduce tool sprawl by 50% for client teams by integrating Notes/Docs.
3.  **Enterprise Readiness**: Achieve SOC2-ready data isolation architecture (Workspace-level scoping).

### User Objectives
1.  **"Flow State"**: Users never leave the board to write specs or meeting notes.
2.  **Real-Time Sync**: Collaboration feels instantaneous (latency < 100ms).
3.  **Trust**: Admins feel confident that workspace data is mathematically isolated.

---

## 3. Success Metrics

| Metric | Baseline (Current) | Target (v2.0) | Measurement |
| :--- | :--- | :--- | :--- |
| **Card Open Latency** | ~300ms | < 100ms | Chrome DevTools / Lighthouse |
| **Real-Time Sync** | Polling (5s) | WebSocket (< 50ms) | End-to-End Latency Test |
| **Search Speed** | N/A | < 200ms | Backend Search Query Log |
| **Notes per Board** | 0 | > 5 | Database Analytics |

---

## 4. Scope & Requirements

### ✅ In-Scope (MVP)

#### A. Core Kanban Experience (Trello Parity)
-   **Board/List/Card**: Drag-and-drop with physics-based interactions.
-   **Deep Cards**: Markdown descriptions, checklists, due dates, labels, and member assignment.
-   **Card Activity**: Chronological log of changes and comments.

#### B. Integrated Knowledge (The "Google Keep" Hybrid)
-   **Board Wiki**: A collapsible side-panel or view for board-level documentation.
-   **Quick Notes**: "Sticky note" style widgets attachable to the board canvas or wiki.
-   **Rich Text**: Full Markdown support for all notes and wikis.

#### C. Search & Navigation
-   **Omni-Search**: Global `Cmd+K` inputs.
-   **Full Content Indexing**: Search matches text inside card descriptions, checklists, and notes (Postgres `tsvector`).
-   **Result Highlighting**: direct navigation to the matching board/card/note.

#### D. Real-Time Collaboration
-   **Live Updates**: Board state reflects changes instantly without refresh.
-   **Presence**: "User X is viewing this card" avatars.
-   **Typing Indicators**: "User X is typing..." in descriptions/comments.

#### E. Workspace Governance
-   **RBAC**:
    -   **Admin**: Manage billing, workspace settings, delete boards.
    -   **Member**: Create/Edit boards, cards, and notes.
-   **Isolation**: Strict middleware enforcement of `WorkspaceID` scoping.

### ❌ Out-of-Scope (v2.0)
-   **Public Boards**: All boards must belong to a secure workspace.
-   **Mobile Native Apps**: PWA (Responsive Web) is the mobile strategy for now.
-   **Calendar View**: Timeline/Calendar visualization is v2.1.
-   **Third-Party Integrations**: Slack/Jira integration is v2.1.

---

## 5. User Stories

| ID | Feature | Story | Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **US-01** | **Board Wiki** | As a team lead, I want to pin project guidelines to the board so the team sees them daily. | Given I am on a board<br>When I click "Wiki"<br>Then a side panel opens allowing me to write Markdown specs.<br>And this content persists for all members. | **High** |
| **US-02** | **Quick Notes** | As a user, I want to jot down a quick meeting note without creating a formal card. | Given I am on the board<br>When I double-click the background<br>Then a "Sticky Note" is created.<br>And I can drag it anywhere on the canvas. | **Med** |
| **US-03** | **Global Search** | As a manager, I want to find a specific requirement across 10 boards. | Given I press `Cmd+K`<br>When I type "refactor"<br>Then I see results from Cards, Checklists, and Wikis.<br>And clicking one takes me there. | **Critical** |
| **US-04** | **Presence** | As a remote worker, I want to know if my colleague is editing the same card. | Given I have a card open<br>When another user opens it<br>Then their avatar appears in the header.<br>And if they type, I see "Typing...". | **High** |
| **US-05** | **RBAC** | As an Admin, I want to ensure Members cannot delete the entire workspace. | Given I am a Member<br>When I try to access "Workspace Settings"<br>Then I receive a 403 Forbidden error. | **High** |

---

## 6. Technical Considerations

### Architecture
-   **Backend**: Go (Gin) for high-throughput concurrency.
-   **Real-Time**: Redis Pub/Sub handling WebSocket events (`board:update`, `presence:ping`).
-   **Search**: PostgreSQL Full-Text Search (`tsvector` column on `cards`, `notes`, `wikis`).
-   **Frontend**: Angular 18 Signals for fine-grained reactivity.

### Data Model Extensions
-   `WikiPage`: `ID`, `BoardID`, `Content (Text)`, `UpdatedAt`.
-   `Note`: `ID`, `BoardID`, `Content`, `PositionX`, `PositionY`, `Color`.
-   `Member`: `ID`, `WorkspaceID`, `UserID`, `Role` (Admin/Member).

### Migration Strategy
-   **Legacy Columns**: Ensure `CreateColumn` API remains compatible or auto-migrates old "lists" to the new schema if changed (unlikely).
-   **Data Seeding**: New workspaces get a "Welcome Board" with a sample Wiki and Note.

---

## 7. Open Questions
| Question | Status | Owner |
| :--- | :--- | :--- |
| Should "Sticky Notes" have their own permission level? | Pending | Product |
| Do we index archived cards in search? | Proposed: No | Tech Lead |
| Limit on Wiki size? | Proposed: 50KB | Tech Lead |

---
*End of Document*
