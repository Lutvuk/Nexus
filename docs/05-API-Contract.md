# API Contract (Detailed)

## 1. Conventions

- Public auth endpoints:
  - `/auth/*`
- Protected API base:
  - `/api/v1/*`
- Authentication:
  - JWT required for protected endpoints
- Realtime:
  - websocket endpoint at `/ws`

## 2. Health and Public Auth

- `GET /health`
  - Returns service health and version metadata.
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`

## 3. Board Domain

- `GET /api/v1/boards`
- `POST /api/v1/boards`
- `GET /api/v1/boards/:id`
- `PATCH /api/v1/boards/:id`
  - Supports board metadata updates, including:
    - `title`
    - `background_color`
    - `background_image_url`
    - `documentation_notes`
- `POST /api/v1/boards/:id/background`
- `PATCH /api/v1/boards/:id/star`
- `DELETE /api/v1/boards/:id`
- `GET /api/v1/boards/:id/archived-cards`
- `GET /api/v1/boards/:id/activity`
- `GET /api/v1/boards/:id/analytics`
- `GET /api/v1/boards/:id/rules`
- `POST /api/v1/boards/:id/rules`
- `GET /api/v1/boards/:id/labels`
- `POST /api/v1/boards/:id/labels`
- `GET /api/v1/boards/:id/fields`
- `POST /api/v1/boards/:id/fields`

## 4. Column Domain

- `POST /api/v1/columns`
- `PATCH /api/v1/columns/:id`
- `DELETE /api/v1/columns/:id`
- `PATCH /api/v1/columns/:id/move`

## 5. Card Domain

- `POST /api/v1/columns/:id/cards`
- `GET /api/v1/cards/:id`
- `PATCH /api/v1/cards/:id`
- `DELETE /api/v1/cards/:id`
- `PATCH /api/v1/cards/:id/move`
- `POST /api/v1/cards/:id/archive`
- `POST /api/v1/cards/:id/restore`
- `POST /api/v1/cards/:id/copy`
- `POST /api/v1/cards/:id/template`
- `GET /api/v1/cards/templates`
- `GET /api/v1/cards/:id/activity`

## 6. Card Metadata and Collaboration

- Labels on card:
  - `POST /api/v1/cards/:id/labels/:labelId`
  - `DELETE /api/v1/cards/:id/labels/:labelId`
- Members on card:
  - `POST /api/v1/cards/:id/members/:userId`
  - `DELETE /api/v1/cards/:id/members/:userId`
- Comments:
  - `POST /api/v1/cards/:id/comments`
  - `DELETE /api/v1/comments/:id`
- Checklists:
  - `POST /api/v1/cards/:id/checklists`
  - `DELETE /api/v1/checklists/:id`
  - `POST /api/v1/checklists/:id/items`
  - `PATCH /api/v1/checklists/:id/move`
  - `PATCH /api/v1/checklist-items/:id`
  - `PATCH /api/v1/checklist-items/:id/move`
  - `DELETE /api/v1/checklist-items/:id`
- Attachments:
  - `POST /api/v1/cards/:id/attachments`
  - `DELETE /api/v1/attachments/:attachmentId`
  - `POST /api/v1/cards/:id/cover`
  - `DELETE /api/v1/cards/:id/cover`
- Custom field values:
  - `POST /api/v1/cards/:id/fields/:field_id`
  - `GET /api/v1/cards/:id/fields`

## 7. Workspace and Membership

- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`
- `PATCH /api/v1/workspaces/:id`
- `DELETE /api/v1/workspaces/:id`
- `POST /api/v1/workspaces/:id/members`
- `GET /api/v1/workspaces/:id/members`
- `PATCH /api/v1/workspaces/:id/members/:userId`
- `DELETE /api/v1/workspaces/:id/members/:userId`
- `POST /api/v1/workspaces/:id/leave`

Invitation and join flows:
- `GET /api/v1/invitations`
- `POST /api/v1/invitations/:id/accept`
- `POST /api/v1/invitations/:id/decline`
- `POST /api/v1/workspaces/:id/request`
- `GET /api/v1/workspaces/:id/requests`
- `POST /api/v1/workspaces/:id/requests/:userId/approve`
- `POST /api/v1/workspaces/:id/requests/:userId/decline`
- `POST /api/v1/workspaces/:id/invite-link`
- `GET /api/v1/workspaces/:id/invite-link`
- `DELETE /api/v1/workspaces/:id/invite-link`
- `POST /api/v1/join/:token`

## 8. Notification and Subscription

- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`
- `POST /api/v1/notifications/read-all`
- `POST /api/v1/subscribe/:id`
- `DELETE /api/v1/subscribe/:id`
- `GET /api/v1/subscribe/:id/status`

## 9. Templates, Rules, Admin, User

- Templates:
  - `GET /api/v1/templates/boards`
- Automation rules:
  - `DELETE /api/v1/rules/:ruleId`
  - `PATCH /api/v1/rules/:ruleId/toggle`
- Users:
  - `GET /api/v1/users`
  - `GET /api/v1/users/me`
  - `PATCH /api/v1/users/me`
  - `POST /api/v1/users/me/avatar`
  - `GET /api/v1/users/me/preferences`
  - `PUT /api/v1/users/me/preferences`
  - `GET /api/v1/users/me/activity`
  - `PATCH /api/v1/users/me/onboarding`
- Admin reminders:
  - `POST /api/v1/admin/reminders/run`

## 10. Realtime Events (Observed Usage)

Common websocket event types consumed by frontend include:
- `CARD_MOVED`
- `CARD_CREATED`
- `CARD_UPDATED`
- `COLUMN_MOVED`
- `COLUMN_CREATED`
- `COLUMN_UPDATED`
- `COLUMN_DELETED`
- `BOARD_UPDATED`
- `TEMPLATES_UPDATED`
- `INVITATION_RECEIVED`
