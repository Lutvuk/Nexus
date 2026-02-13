# TDD Plan

## 1. Test Strategy

- Backend:
  - unit and handler tests for permission, state transitions, and payload integrity
- Frontend:
  - component tests for UX behavior and state transitions
- Integration:
  - API-level flow validation for critical journeys

## 2. Backend Test Matrix

## 2.1 Authentication and Security

- Register with valid/invalid payloads.
- Login success/failure and lockout behavior.
- JWT-gated endpoint access control.
- Preferences/profile patch validation.

## 2.2 Workspace and Membership

- Workspace CRUD by role.
- Invitation accept/decline flows.
- Role update and member removal constraints.
- Join link and join request flows.

## 2.3 Board and Kanban State

- Board CRUD and ownership checks.
- Column create/move/delete ordering integrity.
- Card create/move/archive/restore/copy idempotency and ordering.

## 2.4 Collaboration and Metadata

- Label assignment/removal.
- Checklist item movement and toggle.
- Comment create/delete and activity side effects.
- Attachment upload/delete access controls.
- Notification read/read-all behavior.

## 2.5 Docs Notepad Contract

- `PATCH /boards/:id` accepts `documentation_notes`.
- `GET /boards/:id` returns persisted `documentation_notes`.
- Permission checks remain enforced for board update path.

## 3. Frontend Test Matrix

## 3.1 Route and Guard

- guest routes block authenticated users.
- auth routes redirect unauthenticated users.

## 3.2 Board Core

- board load and topbar actions.
- drag-drop interaction and refresh behavior.
- filter state and view switch transitions.

## 3.3 Board Settings and Notepad

- tabs render and switch correctly.
- note create/select/edit/save/delete workflow.
- save/delete button disable state while async.
- no overlap between content editor and footer metadata/actions.

## 3.4 Realtime and Notifications

- websocket event-driven refresh behavior.
- notification list render and read actions.

## 4. Regression Suite Priorities

- board update regressions after adding `documentation_notes`.
- modal layout regressions across viewport sizes.
- upload/static path and background settings regressions.

## 5. CI Execution Targets

- Backend: `go test ./...`
- Frontend compile safety: `npx tsc -p tsconfig.app.json --noEmit`
- Frontend tests (when configured): `npm test -- --watch=false`
