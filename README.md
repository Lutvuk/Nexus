# Nexus Board

Production-oriented Kanban workspace app with realtime collaboration, automation rules, docs notepad, and full Docker deployment.

## What This Project Includes
- Go backend API (`Gin` + `GORM` + `PostgreSQL`)
- Angular 18 frontend (`Signals` + `RxJS` + `Tailwind`)
- Realtime updates via WebSocket
- Email-based verification flow (SMTP configurable)
- Docker Compose stack for local/staging/prod-like runs

## Repository Structure
```text
.
|-- cmd/                          # backend entrypoints
|-- internal/                     # backend domain + handlers + services + middleware
|-- nexus-frontend/               # Angular frontend
|-- docs/                         # product + engineering docs (PRD/FSD/ERD/API/etc)
|-- tests/                        # integration/scenario tests
|-- docker-compose.yml            # multi-service runtime
|-- Dockerfile                    # backend image build
|-- .env.compose.example          # compose environment template
```

## Core Features
- Workspace and board management
- Kanban columns/cards with drag & drop
- Labels, checklists, members, due dates, attachments
- Board settings:
  - custom fields
  - background color/image upload
  - docs notepad (create/edit/save/delete notes)
- Templates for board/card reuse
- Automation rules
- Notifications + inbox
- Email verification and auth lockout protection

## Tech Stack
- Backend: Go `1.24`, Gin, GORM, PostgreSQL, Gorilla WebSocket, JWT
- Frontend: Angular `18`, Tailwind CSS, ng2-charts, FullCalendar
- Infra: Docker, Docker Compose, Nginx (frontend container), Mailpit (local SMTP)

## Prerequisites
- Docker Desktop (or Docker Engine + Compose plugin)
- For local non-Docker frontend dev: Node.js 20+
- For local non-Docker backend dev: Go 1.24+

## Quick Start (Recommended: Docker)

1. Create runtime env:
```bash
cp .env.compose.example .env.compose
```

2. Edit `.env.compose`:
- Set strong values for:
  - `POSTGRES_PASSWORD`
  - `JWT_SECRET`
- Set frontend origin:
  - `CORS_ALLOW_ORIGIN=http://localhost` (local)
- Set SMTP:
  - Local capture: Mailpit defaults
  - Real mail: provider SMTP values

3. Build and run:
```bash
docker compose --env-file .env.compose up --build -d
```

4. Verify:
- UI: `http://localhost`
- API health: `http://localhost:8080/health`
- Mailpit UI (if used): `http://localhost:8025`

5. Stop:
```bash
docker compose --env-file .env.compose down
```

## Environment Variables (`.env.compose`)

Required:
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `JWT_SECRET`
- `CORS_ALLOW_ORIGIN`

SMTP:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`

Reference template: `.env.compose.example`

## Real SMTP Setup (Example)
- Host: `smtp.gmail.com`
- Port: `587`
- Username: your Gmail address
- Password: Gmail App Password
- From: verified sender email

After changing SMTP values:
```bash
docker compose --env-file .env.compose up -d --build nexus-api
```

## Local Development Without Docker

Backend:
```bash
go mod tidy
go run cmd/server/main.go
```

Frontend:
```bash
cd nexus-frontend
npm ci
npm start
```

## Testing and Build
- Backend tests:
```bash
go test ./...
```

- Frontend production build:
```bash
cd nexus-frontend
npm run build
```

## Deployment Notes
- Do not use placeholder secrets in production.
- Restrict `CORS_ALLOW_ORIGIN` to your exact frontend domain.
- Keep `.env.compose` out of version control.
- Use HTTPS and reverse proxy in production.

Detailed checklist: `docs/11-Deployment-Checklist.md`

## Main API Surface
- Auth: `/auth/register`, `/auth/verify-email`, `/auth/login`, `/auth/resend-verification`
- API base: `/api/v1/...` (boards, cards, columns, workspaces, notifications, etc.)
- Realtime: `/ws`

## Project Documentation
Complete docs are under `docs/`:

## License
Internal assessment project. Add your preferred license if needed.
