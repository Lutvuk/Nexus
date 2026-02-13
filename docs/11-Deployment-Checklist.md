# Deployment Checklist

## 1. Build and Test Gate

- [ ] Backend tests pass: `go test ./...`
- [ ] Frontend compile check pass: `npx tsc -p tsconfig.app.json --noEmit`
- [ ] Frontend production build pass: `npm run build` inside `nexus-frontend/`
- [ ] No critical local runtime errors in browser console/API logs

## 2. Environment and Secrets

- [ ] Backend env configured:
  - `POSTGRES_URL`
  - `JWT_SECRET`
  - SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, optional auth)
- [ ] Frontend runtime API base configured for target environment
- [ ] Secrets are not hardcoded in repository files

## 3. Database Readiness

- [ ] Database connectivity verified from API container/host
- [ ] Start API once to run `AutoMigrate` on deployment target
- [ ] Validate schema additions including `boards.documentation_notes`
- [ ] Confirm backup snapshot exists before applying release

## 4. Container and Network Topology

Current local topology:
- `nexus-db` (PostgreSQL 15)
- `nexus-api` (Go service on :8080)
- `nexus-ui` (Nginx serving Angular on :80)
- `nexus-mailpit` (SMTP test service)

Deployment checks:
- [ ] Persistent volumes configured for DB and uploads
- [ ] API container has upload directory mounted
- [ ] Reverse proxy routing for SPA paths works (`try_files` fallback)
- [ ] Static file caching headers verified for built assets

## 5. Security and Runtime Hardening

- [ ] CORS origins reflect expected domains
- [ ] Security middleware active (headers)
- [ ] Rate limiting active
- [ ] TLS termination strategy defined (if public deployment)

## 6. Functional Smoke Test Plan

- [ ] Auth:
  - register/login
  - protected route redirect behavior
- [ ] Workspace:
  - create workspace
  - invite or join flow
- [ ] Board:
  - create board, create column/card
  - drag/drop card and observe persistence
  - open card detail and save metadata
- [ ] Realtime:
  - update from one session appears in another
- [ ] Docs Notepad:
  - create, edit, save, delete note
  - verify shared persistence by reopening board settings

## 7. Observability and Operations

- [ ] Health endpoint monitored: `/health`
- [ ] Log collection strategy defined for API and reverse proxy
- [ ] Error alerting threshold decided (5xx spikes, websocket failures)

## 8. Rollback Plan

- [ ] Keep previous image tags/artifacts
- [ ] Keep previous config snapshot
- [ ] Restore DB backup if schema/data regression occurs
- [ ] Assign release owner and rollback authority
