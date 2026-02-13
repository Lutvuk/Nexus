# Project Notes (February 11, 2026)

## Completed

1. Removed OAuth (Google) implementation end-to-end.
- Removed backend OAuth routes and OAuth model.
- Removed frontend OAuth callback route/component and OAuth UI from login/register.
- Removed OAuth env placeholders from `.env` and OAuth docs section from `README.md`.

2. Strengthened account authentication security.
- Enforced stronger password policy:
  - minimum 8 characters
  - uppercase + lowercase + number + symbol
- Normalized email input (`trim` + lowercase) on register/login.
- Added failed-login delay to slow brute-force attempts.

3. Implemented persistent login lockout in DB.
- Added `LoginAttempt` model: `internal/models/login_attempt.go`.
- Added migration in server startup (`AutoMigrate`).
- Replaced in-memory lock map with DB-backed lock tracking in `internal/handlers/auth.go`.
- Lockout behavior:
  - `maxFailedAttempts = 5`
  - `lockoutDuration = 15 minutes`
  - stale attempt cleanup after `24 hours`
- Added automated test:
  - `internal/handlers/auth_lockout_test.go`
  - verifies lock creation, persistence across handler instances, and clear-on-success flow.

## Verification Completed

- `go test ./...` passed after all changes.

## Notes / Known Context

- OAuth was removed by decision due setup friction and preference for free alternatives.
- Reminder endpoint exists, but user requested not to run reminders manually.

## Remaining High-Priority Product Tasks

1. User profile/settings full completion verification:
- avatar upload reflected across workspace UI
- username and bio updates
- personal activity history across workspaces
- account settings behaviors (email notifications, language, suggestions, marketing emails, cookies, accessibility options)

2. Notification behavior validation:
- ensure selected email notification preferences actually trigger email delivery for supported events.

3. Accessibility validation:
- color-blind friendly mode must produce visible UI changes.
- keyboard shortcut toggle must fully disable shortcuts when off.
