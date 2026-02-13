# UI Wireframes (Detailed)

## 1. Route-Level Screen Inventory

- `/login` -> login page with credential form and redirect handling.
- `/register` -> registration page with validation and email flow support.
- `/dashboard` -> workspace shell, board grid, sidebar, creation and invitation entry points.
- `/board/:id` -> primary kanban workspace with topbar, columns, optional side panels, and view switcher.
- `/board/:id/card/:cardId` (child route) -> deep card detail context.
- `/join/:token` -> workspace join acceptance page.
- `**` -> branded not found page.

## 2. Information Architecture

```
App Shell
  Navbar (global actions, notifications, help)
  Route Content
    Dashboard
    Board Workspace
      Board Topbar
      View Area (Board/Table/Calendar/Analytics/Planner)
      Modal Layer (card detail, settings, share, dialogs)
```

## 3. Dashboard Wireframe

```
+---------------------------------------------------------------------------------+
| Global Navbar                                                                   |
+--------------------+------------------------------------------------------------+
| Left Sidebar       | Main Content                                               |
| - Workspace switch | Header: Welcome, quick actions                             |
| - Navigation       | Stats row: total boards, starred, activity                |
| - Starred links    | Board grid: cards with title, metadata, open action       |
| - User profile     | Modals: create board, workspace settings, onboarding      |
+--------------------+------------------------------------------------------------+
```

## 4. Board Workspace Wireframe

```
+---------------------------------------------------------------------------------+
| Topbar: title | star | search | filter | automation | view switch | settings   |
+---------------------------------------------------------------------------------+
| Optional hint banners                                                           |
+---------------------------------------------------------------------------------+
| View Surface                                                                    |
| - BOARD: horizontal column lane + add column rail                              |
| - TABLE: row/column card matrix                                                 |
| - CALENDAR: date-grid due-date layout                                           |
| - ANALYTICS: metrics/cards charts                                               |
| - PLANNER: schedule/focus planning feed                                         |
+---------------------------------------------------------------------------------+
| Overlay Sidebars (optional)                                                     |
| - Activity sidebar                                                              |
| - Archive explorer                                                              |
+---------------------------------------------------------------------------------+
```

## 5. Board Settings Modal Wireframe

```
+-------------------------------- Board Settings ---------------------------------+
| Header: title + close                                                           |
| Tabs: [General] [Custom Fields] [Docs Notepad]                                 |
|---------------------------------------------------------------------------------|
| General tab                                                                      |
| - title input                                                                    |
| - background color/image selector                                                |
|---------------------------------------------------------------------------------|
| Custom fields tab                                                                |
| - create/delete field schema by type                                             |
|---------------------------------------------------------------------------------|
| Docs notepad tab                                                                 |
| - left: note list                                                                |
| - right: title input + content editor + footer actions                          |
| - footer: last update + delete/save                                              |
+---------------------------------------------------------------------------------+
| Footer: cancel / save changes                                                    |
+---------------------------------------------------------------------------------+
```

## 6. Card Detail Modal Wireframe

```
+-------------------------------- Card Detail ------------------------------------+
| Title and status                                                                  |
| Description (markdown capable)                                                    |
| Labels and assignees                                                              |
| Due date and completion                                                           |
| Checklists with progress and item movement                                        |
| Comments stream                                                                    |
| Attachments and cover management                                                   |
| Custom field values                                                                |
| Subscription/watch and utility actions                                             |
+----------------------------------------------------------------------------------+
```

## 7. Micro-Interaction Notes

- Keyboard:
  - `f` focus search
  - `c` add column
  - `esc` close contextual overlays
- Drag and drop:
  - cards between columns
  - columns in board
- Realtime:
  - board surfaces update after websocket events

## 8. Asset and Reference Sources

- `docs/screenshots/` (managed screenshots)
- `picture/` (raw capture assets)
- `documentation (mvp)/ui-wireframes.md` (legacy reference)
