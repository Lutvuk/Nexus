# Product Requirements Document (PRD)

## 1. Objective

Define the behavior, quality targets, and boundaries for Nexus as implemented in the current repository.

## 2. Product Scope

## 2.1 In Scope

- Authentication:
  - register/login
  - email verification flow
  - session-protected routes with JWT
- Workspace lifecycle:
  - CRUD
  - member invite/remove/role update
  - invite links and join requests
- Board lifecycle:
  - CRUD
  - star toggle
  - background image/color
  - docs notepad storage
- Kanban operations:
  - column CRUD/reorder
  - card CRUD/move/archive/restore/copy/template
- Card collaboration:
  - labels
  - member assignment
  - comments
  - checklists/checklist items
  - attachments/cover
  - due date/completion
- Observability and collaboration:
  - activity feed
  - notifications
  - websocket updates
- Productivity features:
  - automation rules
  - custom fields
  - board/card templates
  - table/calendar/analytics/planner views

## 2.2 Out of Scope

- native mobile apps
- offline conflict resolution engine
- SSO/SAML enterprise auth
- multi-region data replication

## 3. Functional Requirements

1. `FR-1 Auth`
- User must be able to register and authenticate.
- API resources under `/api/v1` must require a valid token.

2. `FR-2 Workspace`
- User must be able to create and manage workspaces.
- Workspace owners/admins can manage members and invitations.

3. `FR-3 Board`
- User must be able to create, open, update, and delete boards.
- Board settings must persist metadata including `documentation_notes`.

4. `FR-4 Column/Card`
- User must be able to create and reorder columns/cards via drag-and-drop.
- Positioning must support stable order updates without full list rewrites.

5. `FR-5 Card Detail`
- User must be able to edit card title/description and metadata.
- User must manage checklist, comments, attachments, labels, assignees.

6. `FR-6 Realtime`
- Connected clients on the same board should reflect updates shortly after mutations.
- Connection status should be visible in UI.

7. `FR-7 Search/Filter/Views`
- User must be able to filter cards by member/label/status/due/activity.
- User must switch among BOARD/TABLE/CALENDAR/ANALYTICS/PLANNER views.

8. `FR-8 Automation and Fields`
- User must create/toggle/delete board automation rules.
- User must define board custom fields and set values per card.

9. `FR-9 Board Docs Notepad`
- User must create/edit/delete board-level notes in board settings.
- Notes should be shared via board payload and resilient to temporary sync issues.

## 4. Non-Functional Requirements

- `NFR-1 Security`: CORS, auth middleware, security headers, rate limit.
- `NFR-2 Reliability`: graceful shutdown and background service lifecycle.
- `NFR-3 Performance`: acceptable response times and smooth board interactions.
- `NFR-4 UX Stability`: modal and editor layouts must avoid overlap and clipping.
- `NFR-5 Deployability`: reproducible Docker-based environment.

## 5. Acceptance Criteria (Release-Level)

- Backend tests pass: `go test ./...`
- Frontend typecheck passes: `npx tsc -p tsconfig.app.json --noEmit`
- Critical flows validated:
  - login/register
  - board open + drag/drop
  - card detail update
  - board settings + docs notepad save/delete
  - notifications and invite flow
