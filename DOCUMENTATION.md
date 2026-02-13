# Nexus Board — Complete Project Documentation

> **Full-Stack Real-Time Kanban Project Management Platform**
> Built with **Go (Gin + GORM)** · **Angular 18+** · **PostgreSQL** · **WebSocket** · **Docker**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Epic 1 — Project Initialization](#epic-1--project-initialization)
3. [Epic 2 — Authentication System](#epic-2--authentication-system)
4. [Epic 3 — Workspace Management](#epic-3--workspace-management)
5. [Epic 4 — Board CRUD](#epic-4--board-crud)
6. [Epic 5 — Column Management](#epic-5--column-management)
7. [Epic 6 — Card System & Drag-and-Drop](#epic-6--card-system--drag-and-drop)
8. [Epic 7 — Real-Time WebSocket Engine](#epic-7--real-time-websocket-engine)
9. [Epic 8 — Deployment & Polish](#epic-8--deployment--polish)
10. [Epic 9 — Label System](#epic-9--label-system)
11. [Epic 10 — Member Collaboration](#epic-10--member-collaboration)
12. [Epic 11 — Checklist System](#epic-11--checklist-system)
13. [Epic 12 — Comments & Discussion](#epic-12--comments--discussion)
14. [Epic 13 — Activity Feed](#epic-13--activity-feed)
15. [Epic 14 — Share & Invite Links](#epic-14--share--invite-links)
16. [Epic 15 — Workspace & User Profile](#epic-15--workspace--user-profile)
17. [Epic 16 — Card Attachments](#epic-16--card-attachments)
18. [Epic 17 — Advanced Features & Architecture](#epic-17--advanced-features--architecture)
19. [Epic 18 — Quality of Life & Real-Time Polish](#epic-18--quality-of-life--real-time-polish)
20. [Epic 19 — Board Intelligence & Navigation](#epic-19--board-intelligence--navigation)
21. [Epic 20 — Starred Boards & Power User Tools](#epic-20--starred-boards--power-user-tools)
22. [Epic 21 — Final Release & Polish](#epic-21--final-release--polish)
23. [Epic 22 — Advanced Card Metadata](#epic-22--advanced-card-metadata)
24. [Epic 23 — Advanced Search & Filtering](#epic-23--advanced-search--filtering)
25. [Epic 24 — Notification System](#epic-24--notification-system)
26. [Epic 25 — Alternative Views & Analytics](#epic-25--alternative-views--analytics)
27. [Epic 26 — Board Customization & Organization](#epic-26--board-customization--organization)
28. [Epic 27 — Templates System](#epic-27--templates-system)
29. [Epic 28 — Automation Engine (Butler)](#epic-28--automation-engine-butler)
30. [Epic 29 — Advanced Fields (Custom Fields)](#epic-29--advanced-fields-custom-fields)
31. [Epic 30 — Production Readiness](#epic-30--production-readiness)
32. [Epic 31 — Documentation & Visual Polish](#epic-31--documentation--visual-polish)
33. [Epic 32 — UX Refinement & Robustness](#epic-32--ux-refinement--robustness)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     NGINX (Reverse Proxy)                │
│              Port 80 → Frontend / Port 8080 → API        │
└────────────┬────────────────────────────┬────────────────┘
             │                            │
    ┌────────▼────────┐         ┌─────────▼─────────┐
    │  Angular 18+    │         │    Go (Gin)        │
    │  Tailwind CSS   │◄──WS──►│    REST + WS Hub   │
    │  Signals / CDK  │         │    JWT Middleware   │
    └─────────────────┘         └─────────┬──────────┘
                                          │
                                 ┌────────▼────────┐
                                 │   PostgreSQL     │
                                 │   (GORM ORM)     │
                                 └─────────────────┘
```

### Backend Structure
| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| Entry Point | `cmd/server/` | HTTP server, route registration, middleware |
| Handlers | `internal/handlers/` | Request parsing, validation, HTTP responses |
| Services | `internal/services/` | Business logic, transactions, rule evaluation |
| Models | `internal/models/` | GORM structs, database schema |
| Middleware | `internal/middleware/` | Auth, CORS, Rate Limit, Security Headers |
| WebSocket | `internal/websocket/` | Real-time Hub, room management, broadcasting |

### Frontend Structure
| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| Components | `src/app/components/` | 28 standalone Angular components |
| Services | `src/app/services/` | 12 injectable services (HTTP, WS, Auth) |
| Models | `src/app/models/` | TypeScript interfaces |
| Pages | `src/app/pages/` | Route-level components (404, etc.) |
| Pipes | `src/app/pipes/` | Markdown rendering, safe HTML |
| Guards | `src/app/guards/` | Auth guard for protected routes |

---

## Epic 1 — Project Initialization

**Goal**: Scaffold the full-stack application with Go backend and Angular frontend.

### Backend
- Initialized Go module with **Gin Gonic** web framework
- Configured **GORM** ORM with PostgreSQL driver
- Set up project structure: `cmd/server/`, `internal/models/`, `internal/handlers/`
- Created `main.go` entry point with auto-migration and route registration

### Frontend
- Scaffolded Angular 18+ app with **standalone components** architecture
- Installed **Tailwind CSS** for utility-first styling
- Configured proxy for API calls during development
- Set up **Angular CDK** for drag-and-drop support

### Key Files
- `cmd/server/main.go` — Server entry point
- `nexus-frontend/` — Angular workspace
- `docker-compose.yml` — Multi-container orchestration
- `go.mod` — Go dependencies

---

## Epic 2 — Authentication System

**Goal**: Implement JWT-based authentication with registration and login.

### Backend
- **User Model** (`internal/models/user.go`): ID, Email, Username, PasswordHash, AvatarURL, timestamps
- **Auth Handler** (`internal/handlers/auth.go`): `POST /auth/register`, `POST /auth/login`
- **JWT Middleware** (`internal/middleware/auth.go`): Token validation, user context injection
- Password hashing with **bcrypt**
- JWT token generation with configurable `JWT_SECRET`

### Frontend
- **AuthService** (`auth.service.ts`): Login, Register, Token management, `currentUser` signal
- **Auth Guard**: Protected route access with redirect to login
- Login and Register pages with form validation
- Token storage in `localStorage` with auto-injection via HTTP interceptor

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Authenticate and receive JWT |
| GET | `/users/me` | Get current user profile |

---

## Epic 3 — Workspace Management

**Goal**: Implement multi-workspace support for organizing boards.

### Backend
- **Workspace model**: Shared container for multiple boards and members
- **WorkspaceMember model** (`workspace_member.go`): Role-based access (Owner, Admin, Member)
- **WorkspaceHandler** (`workspace_handler.go`): Full CRUD + member management
- Cascading permissions: Workspace role determines board access level

### Frontend
- **NexusDashboardComponent**: Workspace selector and board grid
- **WorkspaceSettingsModal**: Rename, manage members, configure workspace
- Workspace creation flow integrated into onboarding

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workspaces` | Create workspace |
| GET | `/workspaces` | List user's workspaces |
| PUT | `/workspaces/:id` | Update workspace settings |
| POST | `/workspaces/:id/members` | Add member |
| DELETE | `/workspaces/:id/members/:userId` | Remove member |

---

## Epic 4 — Board CRUD

**Goal**: Create, read, update, and delete Kanban boards within workspaces.

### Backend
- **Board model** (`board.go`): Title, WorkspaceID, BackgroundColor, BackgroundImageURL, IsStarred, timestamps
- **BoardHandler** (`board_handler.go`): Full CRUD with workspace authorization
- Board data includes nested columns and cards for single-request loading

### Frontend
- **NexusDashboardComponent**: Board grid with create/delete/star actions
- **NexusBoardComponent**: Full board canvas with columns and cards
- Board creation modal with title input
- Real-time board data loading via `BoardService`

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workspaces/:id/boards` | Create board |
| GET | `/workspaces/:id/boards` | List boards in workspace |
| GET | `/boards/:id` | Get board with columns and cards |
| PUT | `/boards/:id` | Update board (title, background) |
| DELETE | `/boards/:id` | Delete board |

---

## Epic 5 — Column Management

**Goal**: Add, rename, reorder, and delete columns (lists) on boards.

### Backend
- **Column model** (`column.go`): Name, BoardID, Position (float64)
- **ColumnHandler** (`column_handler.go`): CRUD + reorder with midpoint positioning
- Position-based ordering with gap strategy (16384.0 intervals)

### Frontend
- **NexusColumnComponent**: Column header with inline rename, card list, drag handle
- Column drag-and-drop using `cdkDrag` with `cdkDropListOrientation="horizontal"`
- Add/Delete column via dialog confirmations
- Inline editing: Click column title to rename

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/boards/:id/columns` | Create column |
| PUT | `/columns/:id` | Rename column |
| PATCH | `/columns/:id/move` | Reorder column |
| DELETE | `/columns/:id` | Delete column and cards |

---

## Epic 6 — Card System & Drag-and-Drop

**Goal**: Full card lifecycle with cross-column drag-and-drop.

### Backend
- **Card model** (`card.go`): Title, Description, ColumnID, Position, DueDate, IsComplete, IsArchived, CoverImageID, timestamps
- **CardHandler** (`card_handler.go`): CRUD, move, archive, copy, complete
- Midpoint positioning for O(1) reorder operations
- Transactional card moves across columns

### Frontend
- **NexusCardComponent**: Card face with title, labels, members, due dates, checklists progress
- **CardDetailComponent**: Full card editor (1143+ lines) — description, checklists, comments, attachments, custom fields, labels, members
- **Angular CDK DragDrop**: Cross-container drag with optimistic UI updates
- Custom drag preview with rotation effect

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/columns/:id/cards` | Create card |
| GET | `/cards/:id` | Get card details |
| PUT | `/cards/:id` | Update card |
| PATCH | `/cards/:id/move` | Move/reorder card |
| PATCH | `/cards/:id/archive` | Toggle archive |
| POST | `/cards/:id/copy` | Deep copy card |
| DELETE | `/cards/:id` | Permanently delete |

---

## Epic 7 — Real-Time WebSocket Engine

**Goal**: Enable live collaboration with instant UI updates across all connected clients.

### Backend
- **WebSocket Hub** (`internal/websocket/`): Gorilla WebSocket upgrade, room-based broadcasting
- **Room Management**: Rooms per board ID; users join/leave on navigation
- **Event Types**: `CARD_MOVED`, `CARD_CREATED`, `CARD_UPDATED`, `COLUMN_MOVED`, `TEMPLATES_UPDATED`, `NOTIFICATION_RECEIVED`
- **Auto-Reconnect**: Server-side ping/pong keep-alive

### Frontend
- **WebSocketService** (`websocket.service.ts`): Connection management, event filtering, auto-reconnect
- `isConnected` signal for UI status indication
- Board-specific subscriptions with automatic cleanup on navigation
- Debounced refresh triggers to prevent UI thrashing during rapid updates

### Connection Flow
```
Client → ws://host/ws?token=JWT&board_id=ID
Server → Upgrades to WebSocket, joins board room
Server → Broadcasts events to all room members
Client → Filters events by type, triggers UI refresh
```

---

## Epic 8 — Deployment & Polish

**Goal**: Production-ready containerization and mobile-first responsive design.

### Dockerization
- **Backend Dockerfile**: Multi-stage Go build (builder → scratch)
- **Frontend Dockerfile**: Node build → Nginx static serve
- **docker-compose.yml**: PostgreSQL + Backend + Frontend + Nginx reverse proxy
- **Environment**: `.env.production` for secrets management

### Mobile Responsiveness
- Dashboard: Grid layout stacks to single column on mobile
- Board: Horizontal scroll with `snap-x` for smooth column switching
- Modals: Full-screen on mobile, centered overlay on desktop
- FAB (Floating Action Button): Mobile-only quick action

### UX Polish
- **NexusSkeletonComponent**: Animated loading placeholders for boards and columns
- **Micro-animations**: Hover scale, glassmorphism blur, smooth transitions
- **Custom Scrollbars**: Themed to match dark UI
- **SEO**: Proper meta tags, semantic HTML, heading hierarchy

---

## Epic 9 — Label System

**Goal**: Color-coded labels for card categorization.

### Backend
- **Label model** (`label.go`): Name, Color, BoardID
- **LabelHandler** (`label_handler.go`): CRUD + assign/remove from cards
- Many-to-many relationship: Cards ↔ Labels

### Frontend
- **LabelPickerComponent**: Color palette picker, label creation form
- Card face displays label chips with colors
- Filter integration: Filter cards by label in the filter dropdown

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/boards/:id/labels` | Create label |
| GET | `/boards/:id/labels` | List labels |
| POST | `/cards/:id/labels/:labelId` | Assign label |
| DELETE | `/cards/:id/labels/:labelId` | Remove label |

---

## Epic 10 — Member Collaboration

**Goal**: Multi-user board collaboration with member assignment.

### Backend
- **WorkspaceMember model**: Role-based access (Owner, Admin, Member, Guest)
- Member invitation and removal logic
- Card member assignment with notifications

### Frontend
- **MemberPickerComponent**: Avatar list with search, assign/unassign toggle
- **ShareModalComponent**: Invite link generation and member management
- Member avatars displayed on card faces
- Filter by member in the advanced filter panel

---

## Epic 11 — Checklist System

**Goal**: Task tracking within cards with progress indicators.

### Backend
- **Checklist model** (`checklist.go`): Name, CardID, Position
- **ChecklistItem model**: Content, IsChecked, Position, ChecklistID
- **ChecklistHandler** (`checklist_handler.go`): CRUD for checklists and items, move/reorder
- Midpoint positioning for drag-and-drop reordering

### Frontend
- **CardDetailComponent**: Inline checklist editor with progress bar
- CDK Drag-and-Drop for reordering items within and between checklists
- Checkbox toggle with optimistic UI updates
- Progress percentage displayed on card face

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/cards/:id/checklists` | Create checklist |
| POST | `/checklists/:id/items` | Add item |
| PATCH | `/checklist-items/:id/toggle` | Toggle checked |
| PATCH | `/checklist-items/:id/move` | Reorder item |
| DELETE | `/checklists/:id` | Delete checklist |

---

## Epic 12 — Comments & Discussion

**Goal**: Threaded discussions on cards.

### Backend
- **Comment model** (`comment.go`): Content, CardID, UserID, timestamps
- **CommentHandler** (`comment_handler.go`): CRUD with user attribution
- WebSocket broadcast on new comments

### Frontend
- Comments section in CardDetailComponent
- User avatars and timestamps
- Real-time comment sync via WebSocket

---

## Epic 13 — Activity Feed

**Goal**: Audit trail for all board actions.

### Backend
- **Activity model** (`activity.go`): Action, ActorID, BoardID, TargetType, TargetID, Metadata, timestamps
- **ActivityHandler** (`activity_handler.go`): Board activity feed endpoint
- Automatic activity logging on card/column/board changes

### Frontend
- **ActivityFeedComponent**: Chronological list of board events
- **BoardActivitySidebarComponent**: Slide-out panel for real-time activity

---

## Epic 14 — Share & Invite Links

**Goal**: Shareable invite links for workspace collaboration.

### Backend
- **InviteLink model** (`invite_link.go`): Token, WorkspaceID, Role, ExpiresAt, MaxUses, CurrentUses
- Link generation with configurable expiration and usage limits
- Join workspace via invite token

### Frontend
- **ShareModalComponent**: Generate/copy invite links, manage existing links
- Role selection for invitees (Admin, Member)

---

## Epic 15 — Workspace & User Profile

**Goal**: User profile management and workspace settings.

### Backend
- Added `AvatarURL` to User model
- **UserHandler** (`user_handler.go`): `GET /users/me`, `PUT /users/me`
- Workspace update endpoint for settings modifications

### Frontend
- **UserProfileModal**: Edit username, email, avatar URL
- **WorkspaceSettingsModal**: Rename workspace, manage team members
- Profile updates reflect instantly without page reload (signal-based)

---

## Epic 16 — Card Attachments

**Goal**: File uploads and cover images for cards.

### Backend
- **Attachment model** (`attachment.go`): Filename, URL, Type, Size, CardID
- **AttachmentHandler** (`attachment_handler.go`): Upload (multipart), Delete, MakeCover
- Static file serving for uploaded assets
- Cover image relationship: Card → Attachment

### Frontend
- Attachments section in CardDetailComponent: Upload zone, file list, preview
- Cover image displayed at top of card face
- File type icons and size formatting

---

## Epic 17 — Advanced Features & Architecture

**Goal**: Core algorithmic improvements and content richness.

### 1. Midpoint Positioning Algorithm
Replaced integer-based ordering with **float64 midpoint positioning** for O(1) reorders.
- Cards, Columns, Checklists, and ChecklistItems all use `float64` Position
- Gap strategy: New items placed at `previous + 16384.0` or midpoint between neighbors
- Eliminates bulk position updates during reorder operations

### 2. Markdown Description Support
- Integrated `marked` library for Markdown → HTML conversion
- Created `MarkdownPipe` for safe HTML rendering
- Card descriptions support headings, bold, italic, lists, code blocks

### 3. Real-Time Event Expansion
- Extended WebSocket broadcasts to Attachments and Labels
- Unified all card sub-actions under `CARD_UPDATED` event type
- CardDetailComponent silently reloads when receiving updates for the active card

---

## Epic 18 — Quality of Life & Real-Time Polish

**Goal**: Eliminate page reloads and add inline editing.

### 1. SPA Transitions
- Replaced `window.location.reload()` with `boardService.triggerRefresh()`
- Profile updates use signal-based state propagation

### 2. Checklist Item Reordering
- Added `PATCH /checklists/:id/move` and `PATCH /checklist-items/:id/move`
- CDK Drag-and-Drop within and between checklists in card detail

### 3. Inline Editing
- **Columns**: Click title → inline input → save on Enter/blur
- **Cards**: Direct title editing on the board face

---

## Epic 19 — Board Intelligence & Navigation

**Goal**: Rich search, activity tracking, and archive management.

### 1. Board Activity Sidebar
- Real-time activity feed in a slide-out panel
- Auto-refreshes via WebSocket on any board event

### 2. Search & Filters
- `computed()` signal-based filtering at 60fps
- Search by card title and description
- Filter by labels and workspace members

### 3. Archive Explorer
- View archived cards in a dedicated panel
- Restore to board or permanently delete
- Archive count on the toolbar button

---

## Epic 20 — Starred Boards & Power User Tools

**Goal**: Productivity features for daily workflows.

### 1. Starred Boards
- `IsStarred` field on Board model
- Toggle star from dashboard tiles and board header
- Visual distinction with gold star icon

### 2. Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `f` | Focus search bar |
| `c` | Open "Add Column" dialog |
| `Esc` | Close modals / clear focus |

### 3. Floating Action Button
- Mobile-only FAB for quick column/card creation
- `md:hidden` responsive visibility

---

## Epic 21 — Final Release & Polish

**Goal**: Production hardening and code quality.

### 1. Global Error Handling
- `GlobalErrorHandler` catches all unhandled Angular exceptions
- User-friendly toast notifications for errors

### 2. Backend Resilience
- Graceful shutdown on `SIGINT`/`SIGTERM`
- 5-second timeout for in-flight requests
- Database connection cleanup

### 3. Code Cleanup
- Removed debug console.log statements
- Fixed unused imports and dead code

---

## Epic 22 — Advanced Card Metadata

**Goal**: Due dates and completion tracking for project management.

### Due Dates
- `DueDate` (nullable timestamp) and `IsComplete` (boolean) on Card model
- Date picker integrated into Card Detail
- Color-coded badges on card face:
  - 🔴 **Red**: Overdue
  - 🟡 **Yellow**: Due within 24 hours
  - 🟢 **Green**: Completed

### Completion Status
- Toggle checkbox in card detail and on due date badge
- Backend endpoint: `PATCH /cards/:id/complete`
- Real-time broadcast of completion state

---

## Epic 23 — Advanced Search & Filtering

**Goal**: Trello-like multi-dimensional filtering.

### FilterDropdownComponent — 6 Filter Sections
| Section | Options |
|---------|---------|
| **Members** | No members, Assigned to me, Specific members |
| **Status** | Marked complete, Not complete |
| **Due Date** | No dates, Overdue, Next day/week/month |
| **Labels** | No labels, Specific board labels |
| **Activity** | Last 1/2/4 weeks, No activity |
| **Keyword** | Full-text search within filter |

### Collapse Lists
- Toggle to hide columns with no matching cards
- Collapsed columns shown as thin vertical stubs with rotated name

### Architecture
- All filtering runs client-side via `computed()` signals
- Zero API calls for filter changes — instant 60fps response

---

## Epic 24 — Notification System

**Goal**: Real-time alerts for collaborative awareness.

### Backend
- **Notification model** (`notification.go`): Type, Message, UserID, BoardID, CardID, IsRead
- Triggers: Card assignment, mentions, board invitations
- WebSocket push via `NOTIFICATION_RECEIVED` event

### Frontend
- **NotificationDropdownComponent**: Bell icon with unread badge
- Glassmorphism dropdown with notification list
- Mark as read (individual and bulk)
- Deep linking: Click notification → navigate to board + open card

---

## Epic 25 — Alternative Views & Analytics

**Goal**: Multiple ways to visualize project data.

### 1. Table View
- Dense data grid: Title, List, Labels, Members, Due Date, Status
- Sortable columns (click header to sort)

### 2. Calendar View
- Monthly calendar with FullCalendar integration
- Cards rendered on their due dates
- Color-coded: Green (complete), Violet (pending)

### 3. Analytics Dashboard
- Key metrics: Total cards, Completed, Overdue, Due Soon
- **Charts** (Chart.js):
  - Cards per List (Bar Chart)
  - Cards by Label (Pie Chart)
  - Weekly Activity (Line Chart)

### View Switcher
- **ViewSwitcherComponent**: Board | Table | Calendar | Analytics toggle in header

---

## Epic 26 — Board Customization & Organization

**Goal**: Visual customization and advanced card operations.

### Board Backgrounds
- Color gradient presets and custom image URLs
- **BoardSettingsModalComponent**: Visual picker with live preview
- Backgrounds render via `[ngStyle]` on the board container

### Card Operations (Move & Copy)
- **Deep Copy**: Recursively copies checklists, items, and metadata
- **Cross-Board Move**: Transactional move with column selection
- **CardOperationModal**: Board → Column selector UI

### Watch & Subscribe
- **Subscription model** (`subscription.go`): UserID, TargetType, TargetID
- Hierarchical notifications: Card → Column → Board watcher fan-out
- "Watch" button in Card Detail with live toggle state
- Auto-subscribe on card assignment

---

## Epic 27 — Templates System

**Goal**: Reusable board and card blueprints.

### Board Templates
- **BoardTemplate model** (`template.go`): Source board reference with metadata
- Template gallery in "Create Board" modal
- Instantiation: Recursively copies columns, cards, and structure

### Card Templates
- Flag any card as a template via Card Detail
- "✨" icon in column footer reveals saved templates
- Deep copy on instantiation: Title, Description, Checklists
- WebSocket broadcast: `TEMPLATES_UPDATED` event

---

## Epic 28 — Automation Engine (Butler)

**Goal**: "If This Then That" automation rules for boards.

### Backend
- **AutomationRule model** (`automation.go`): Trigger, Conditions (JSONB), Action, Params (JSONB), IsActive
- **AutomationService**: Rule evaluation on card events (Move, Create, Label)
- Setter injection to avoid circular dependencies with CardService

### Frontend
- **AutomationRulesComponent**: Butler-inspired natural language rule builder
- Sentence-style construction: "When **a card is moved to Done**, then **mark it complete**"
- Interactive inline selectors instead of generic forms
- Auto-generated rule names from the constructed sentence
- Toggle switches for instant enable/disable
- Inactive rules: Reduced opacity + grayscale effect

### Supported Triggers & Actions
| Triggers | Actions |
|----------|---------|
| Card Moved to Column | Move Card to Column |
| Card Created | Add Label |
| Label Added | Mark Complete |
| Card Assigned | Assign Member |

---

## Epic 29 — Advanced Fields (Custom Fields)

**Goal**: Dynamic metadata for domain-specific card tracking.

### Backend
- **CustomField model** (`custom_field.go`): Name, Type, BoardID, Options (JSONB), Position
- **CardCustomFieldValue model**: CardID, CustomFieldID, Value
- **CustomFieldHandler** (`custom_field_handler.go`): Define, list, delete fields; set/get values

### Supported Field Types
| Type | Input | Storage |
|------|-------|---------|
| Text | Single-line input | String |
| Number | Numeric input | String (parsed) |
| Date | Date picker | ISO date string |
| Dropdown | Select with options | Selected value |
| Checkbox | Toggle | "true"/"false" |

### Frontend
- **CustomFieldManagerComponent**: Board-level field definition in settings
- **CardDetailComponent**: Dynamic field rendering based on board schema
- **CustomFieldService**: API communication and state management

---

## Epic 30 — Production Readiness

**Goal**: Security hardening, performance optimization, and error handling.

### Security Hardening
- **RateLimitMiddleware** (`ratelimit.go`): Per-IP token bucket (10 req/sec burst, 5 req/sec sustained)
- **SecurityMiddleware** (`security.go`): HSTS, X-Content-Type-Options, X-Frame-Options, XSS-Protection headers

### Performance Optimization
- **Database Indexes**: Added GORM indexes to `Card.ColumnID`, `Card.Position`, `CustomField.Position`
- Query performance improvement for column-based card retrieval and position-based sorting

### Error Handling
- **NotFoundComponent**: Branded 404 page with "Lost in the Nexus" theme
- Wildcard route `**` registered in `app.routes.ts`

---

## Epic 31 — Documentation & Visual Polish

**Goal**: Professional presentation for assessment.

### Documentation
- **README.md**: Comprehensive rewrite with Features, Tech Stack, Architecture Diagram, Setup Instructions
- `docs/screenshots/` directory created for visual documentation

### Board Backgrounds (Enhanced)
- Additional gradient presets in BoardSettingsModal
- Custom Image URL input field for user-provided backgrounds

### Dashboard Analytics Widgets
- **Stat Cards** on NexusDashboardComponent:
  - Total Boards (computed signal)
  - Starred Boards (computed signal)
  - Recently Active Boards — last 7 days (computed signal)
- Client-side computation — no new API endpoints required

---

## Epic 32 — UX Refinement & Robustness

**Goal**: Final interaction polish and mobile optimization.

### Keyboard Shortcuts Help Modal
- **ShortcutsModalComponent**: Press `?` to toggle
- Grouped by category (Navigation, Board Actions)
- Glassmorphism design with `kbd` key styling
- `Esc` to dismiss

### Connection Status Indicator
- **ConnectionStatusComponent**: Fixed bottom-left badge
- Displays "Offline — Reconnecting..." when WebSocket disconnects
- Pulsing animation for visual urgency
- Automatically hides when connection restores

### Global Loading Bar
- Route transition progress bar in `AppComponent`
- Listens to `NavigationStart`/`NavigationEnd` events
- Violet animated bar at top of viewport

### Mobile Touch Optimization
- `cdkDragStartDelay="200"` on cards and columns
- Prevents accidental drags while scrolling on touch devices
- Column drag handles already use `cdkDragHandle` for precise control

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Epics** | 32 |
| **Backend Models** | 16 |
| **Backend Handlers** | 22 (including tests) |
| **Frontend Components** | 28 |
| **Frontend Services** | 12 |
| **API Endpoints** | 50+ |
| **Real-Time Events** | 8 distinct WebSocket event types |
| **Lines of Code** | 15,000+ (estimated) |

### Technology Stack
| Layer | Technology |
|-------|-----------|
| Backend | Go 1.23, Gin, GORM, Gorilla WebSocket |
| Frontend | Angular 18, Tailwind CSS, Angular CDK, Chart.js, FullCalendar |
| Database | PostgreSQL 15 |
| Infrastructure | Docker, Docker Compose, Nginx |
| Auth | JWT (HS256), bcrypt |

---

*Documentation generated on February 11, 2026*
*Nexus Board — Personal Assessment Project*
