# ERD (Logical and Implementation-Mapped)

## 1. Identity and Access

- `users`
  - authentication identity and profile fields
- `user_preferences`
  - UX settings and personalization flags
- `login_attempts`
  - login lockout/rate control data
- `email_verifications`
  - verification token lifecycle

## 2. Collaboration Containers

- `workspaces`
  - top-level ownership unit
- `workspace_members`
  - user membership and role in workspace
- `invite_links`
  - tokenized join access for workspace membership

## 3. Board Domain

- `boards`
  - belongs to workspace
  - board metadata includes:
    - title
    - background color/image
    - starred state
    - documentation notes payload
- `columns`
  - belongs to board
  - ordered by position
- `cards`
  - belongs to column
  - includes due date, completion, archive, template flags

## 4. Card Collaboration Domain

- `labels`
  - belongs to board
- `card_labels` (implicit join table by ORM relationship)
- `checklists`
  - belongs to card
- `checklist_items`
  - belongs to checklist
- `comments`
  - belongs to card and author user
- `attachments`
  - belongs to card and uploader user

## 5. Automation and Extensibility

- `automation_rules`
  - belongs to board
  - trigger/conditions/action payloads
- `custom_fields`
  - belongs to board
- `card_custom_field_values`
  - belongs to card and custom field
- `board_templates`
  - reusable board pattern data

## 6. Activity and Notification

- `activities`
  - event audit records by board/card scope
- `notifications`
  - per-user event notifications
- `subscriptions`
  - explicit watch links for board/card scoped updates

## 7. Relationship Summary

- Workspace `1:N` Boards
- Board `1:N` Columns
- Column `1:N` Cards
- Card `1:N` Checklists
- Checklist `1:N` ChecklistItems
- Card `1:N` Comments
- Card `1:N` Attachments
- Board `1:N` Labels
- Card `N:M` Labels
- Board `1:N` AutomationRules
- Board `1:N` CustomFields
- Card `1:N` CardCustomFieldValues
- Workspace `N:M` Users via WorkspaceMembers

## 8. Notes Field

- `boards.documentation_notes` stores board-level shared notes as serialized JSON string.
- Intended shape is an array of note objects (`id`, `title`, `content`, `updatedAt`).
