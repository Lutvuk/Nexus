# Cleanup Candidates (Detailed Review List)

This file is a controlled cleanup plan. It distinguishes generated artifacts from source-of-truth assets.

## 1. Generated Artifacts (High-confidence candidates)

- root executables:
  - `main.exe`
  - `server.exe`
  - `server_test.exe`
- temporary command output:
  - `output.txt`

Rationale:
- generated from builds/tests
- not required as source for reproducible builds

## 2. Potentially Redundant Documentation (Review required)

- `documentation (mvp)/`
- `documentation (post mvp)/`
- `MVP_REPORT.md`
- `HANDOVER_REPORT.md`
- `NOTES.md`

Rationale:
- likely historical snapshots; keep if governance requires history, otherwise archive externally

## 3. Media and Raw Asset Holding Areas

- `picture/`

Rationale:
- may include ad-hoc references; move only after confirming no active links from README/docs

## 4. Runtime Data Directories

- `uploads/`

Rationale:
- runtime-generated user content
- should be externally persisted in deployment, not versioned in source control

## 5. Recommended Cleanup Procedure

1. Create `archive/cleanup-<date>/`.
2. Move candidate files there first.
3. Run validation:
  - `go test ./...`
  - `npx tsc -p tsconfig.app.json --noEmit`
4. Run app smoke flow.
5. Permanently remove archived items if no regressions.

## 6. Suggested `.gitignore` Policy Additions

```
*.exe
output.txt
uploads/
archive/
```

## 7. Do Not Remove Without Analysis

- `docs/screenshots/` if used by README
- `docker-compose.yml`, `Dockerfile`, frontend docker/nginx configs
- any file referenced by CI/CD scripts or build tooling
