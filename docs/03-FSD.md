# Functional Specification Document (FSD)

## 1. System Architecture

## 1.1 Backend Layers

- Entry and composition root: `cmd/server/main.go`
- Transport (HTTP): `internal/handlers/`
- Domain/service logic: `internal/services/`
- Persistence access: `internal/repository/`
- Data models and ORM schema: `internal/models/`
- Realtime infrastructure: `internal/realtime/`
- Middleware: `internal/middleware/`

## 1.2 Frontend Layers

- Route composition: `nexus-frontend/src/app/app.routes.ts`
- Feature components: `nexus-frontend/src/app/components/`
- Page components: `nexus-frontend/src/app/pages/`
- API clients/services: `nexus-frontend/src/app/services/`
- Shared models/types: `nexus-frontend/src/app/models/`

## 2. Runtime Composition

1. API process initializes DB and auto-migrates all models.
2. API registers public auth routes and protected `/api/v1` routes.
3. Realtime hub starts and broadcasts board/user-scoped events.
4. Angular app enforces auth/guest route guards.
5. Board views subscribe to websocket events and refresh from API.

## 3. Functional Modules

## 3.1 Auth and User

- Register/login via `/auth/*`.
- User profile and preferences via `/api/v1/users/me*`.
- Optional email verification and resend flow.

## 3.2 Workspace Management

- Create/list/update/delete workspaces.
- Manage members and roles.
- Invitation pipeline:
  - direct invitation list
  - invite links
  - join requests

## 3.3 Board and Kanban Operations

- Board creation/open/update/delete/star/background upload.
- Column create/update/delete/move.
- Card create/update/delete/move/archive/restore/copy/template.
- Archive explorer for old cards.

## 3.4 Card Collaboration

- Labels and member assignments.
- Comments with activity side effects.
- Checklist and checklist item movement.
- Attachments and card cover.
- Due date reminder scheduler integration.

## 3.5 Advanced Capability

- Automation rule engine with trigger/action flow.
- Custom field schema and value management.
- Analytics endpoint and board analytics view.
- Alternate visualization views:
  - table
  - calendar
  - analytics
  - planner

## 3.6 Board Docs Notepad

- UI location: board settings modal, `Docs Notepad` tab.
- Data location: `boards.documentation_notes`.
- Persistence path: `PATCH /api/v1/boards/:id`.
- Client fallback for resilience: local storage mirror + server sync.

## 4. Control Flow Example: Edit Card

1. User opens card detail modal.
2. UI submits `PATCH /api/v1/cards/:id`.
3. Backend updates card and related side effects.
4. Backend emits realtime event for board room.
5. Board views refresh card state.

## 5. Control Flow Example: Edit Docs Note

1. User edits note in board settings.
2. UI serializes note set and calls board update endpoint.
3. API writes `documentation_notes`.
4. Realtime `BOARD_UPDATED` can trigger board refresh.
5. Updated notes are available to other board users.
