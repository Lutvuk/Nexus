# Feature PRD: Real-Time Collaboration
## Project Nexus v2.0

| Metadata | Details |
| :--- | :--- |
| **Feature** | Real-Time Sync & Presence |
| **Epic** | Epic 3 |
| **Status** | Drafting |

---

## 1. Overview
This feature introduces WebSocket-based real-time communication to Project Nexus. It enables users to see board updates (card moves, edits) instantly without refreshing and provides "Presence Awareness" (who is viewing the board/card).

## 2. Problem Statement
Currently, Project Nexus is a "poll-based" or "refresh-based" application. If Alice moves a card, Bob doesn't see it until he refreshes the page. This leads to:
-   **Data Staleness**: Users potentially editing outdated content.
-   **Collision Risk**: Two users editing the same card unknowingly.
-   **Isolation**: Lack of team feeling.

## 3. Objectives
1.  **Instant Sync**: Board state changes propogate to all active viewers in < 100ms.
2.  **Conflict Reduction**: Visual indicators (Presence) prevent accidental overwrites.
3.  **Efficiency**: Replace polling with event-driven architecture.

## 4. Scope

### ✅ In-Scope
-   **WebSocket Hub**: Centralized connection manager in Go.
-   **Room Scoping**: Connections grouped by `BoardID`.
-   **Event Broadcasting**:
    -   `CARD_MOVED`
    -   `CARD_UPDATED` (Title/Desc/Checklist changes)
    -   `COLUMN_ADDED/MOVED`
-   **Presence**:
    -   "Who is on this board?" list.
    -   "Who is viewing this card?" avatar stack.

### ❌ Out-of-Scope
-   **Operational Transform (OT/CRDTs)**: We will use "Last Write Wins" for text fields initially.
-   **Cursor Tracking**: We won't track mouse pointers (too noisy).

## 5. User Stories

| ID | Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **RT-01** | **Live Board** | Given I am viewing a board<br>When another user moves a card<br>Then the card moves on my screen automatically. |
| **RT-02** | **Board Presence** | Given I am on a board<br>Then I see a list of avatars of other users currently viewing this board. |
| **RT-03** | **Card Presence** | Given I open a card detail modal<br>Then I see avatars of others viewing this specific card. |
| **RT-04** | **Connection Resilience** | Given my internet drops<br>When it reconnects<br>Then the system automatically re-establishes the WebSocket and fetches the latest state. |

## 6. Technical Constraints
-   **Auth**: WebSockets must be authenticated via JWT (query param or initial handshake).
-   **Scalability**: MVP uses in-memory Hub. Post-MVP requires Redis Pub/Sub for multi-instance support.
