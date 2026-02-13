# Nexus Documentation Pack

This directory is the authoritative product and engineering documentation for the current codebase.

## Reading Order

1. `docs/01-Product-Brief.md`
2. `docs/02-PRD.md`
3. `docs/03-FSD.md`
4. `docs/04-ERD.md`
5. `docs/05-API-Contract.md`
6. `docs/06-UI-Wireframes.md`
7. `docs/07-Design-System.md`
8. `docs/08-TDD.md`
9. `docs/09-Epics.md`
10. `docs/10-Stories.md`
11. `docs/11-Deployment-Checklist.md`
12. `docs/12-Cleanup-Candidates.md`

## Code-Linked Source of Truth

- Backend bootstrap and routes: `cmd/server/main.go`
- Backend data models: `internal/models/`
- Backend handlers/services/repository: `internal/handlers/`, `internal/services/`, `internal/repository/`
- Frontend app routes: `nexus-frontend/src/app/app.routes.ts`
- Frontend components and pages: `nexus-frontend/src/app/components/`, `nexus-frontend/src/app/pages/`
- Infra definitions: `docker-compose.yml`, `Dockerfile`, `nexus-frontend/Dockerfile`, `nexus-frontend/nginx.conf`

## Versioning Notes

- Update this pack when new endpoints, models, or major UX flows are added.
- Keep API and ERD aligned whenever migrations or model fields change.
- Keep deployment checklist aligned with runtime environment changes.
