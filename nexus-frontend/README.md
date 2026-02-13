# Nexus Frontend

Angular 18 single-page app for Nexus Board.

## Stack
- Angular `18.x` (standalone components)
- Signals + RxJS
- Tailwind CSS
- ng2-charts / Chart.js
- FullCalendar

## Folder Highlights
```text
src/
|-- app/
|   |-- auth/                     # login/register/verify flow
|   |-- components/               # board, modals, settings, dashboards
|   |-- services/                 # auth, board, websocket, notifications, prefs
|   |-- core/runtime-config.ts    # backend URL detection
|-- assets/
|-- styles.css
public/
|-- nexus-logo.svg
```

## Scripts
```bash
npm start        # ng serve (http://localhost:4200)
npm run build    # production build
npm test         # unit tests
```

## Install and Run
```bash
npm ci
npm start
```

## Runtime Backend URL
Frontend resolves backend base URL using:
1. `window.__NEXUS_BACKEND_URL__` (if provided)
2. `import.meta.env.NG_APP_BACKEND_URL`
3. default:
   - `http://localhost:8080` when on localhost
   - `window.location.origin` otherwise

Code reference: `src/app/core/runtime-config.ts`

## Production Build
```bash
npm run build
```
Output:
```text
dist/nexus-frontend/browser
```

## Docker Integration
This frontend is served by Nginx in Docker.

From repo root:
```bash
docker compose --env-file .env.compose up --build -d nexus-ui
```

Served at:
- `http://localhost`

## Major UI Modules
- Board canvas + drag/drop
- Board settings (general, custom fields, docs notepad)
- Card detail modal (attachments, checklist, labels, members, comments)
- Workspace settings
- Notification dropdown/inbox
- Analytics and planner views

## Auth Flow (Frontend)
- Register -> waits for verification code
- Verify email -> token stored in localStorage
- Login -> JWT decode and session restore

Primary files:
- `src/app/services/auth.service.ts`
- `src/app/auth/login/login.component.ts`
- `src/app/auth/register/register.component.ts`

## Troubleshooting
- Old logo/style after deploy:
  - hard refresh (`Ctrl+F5`)
- API requests blocked:
  - confirm backend `CORS_ALLOW_ORIGIN` matches browser origin exactly
- Build errors:
  - remove `node_modules` + reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Notes
- Avoid committing secrets to frontend code.
- Keep API host configuration in runtime env or compose-level routing.
