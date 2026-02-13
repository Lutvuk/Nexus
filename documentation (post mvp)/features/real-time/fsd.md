# Functional Specification Document (FSD)
## Feature: Real-Time Collaboration

| Metadata | Details |
| :--- | :--- |
| **Feature** | Real-Time Sync |
| **Status** | Implementation Ready |

---

## 1. User Flows

### Flow A: Board Connection & Presence
1.  **User Enters**: User navigates to `/board/:id`.
2.  **System Connects**: Frontend initiates WebSocket connection with `?token=JWT`.
3.  **Authentication**: Backend validates token. If valid, adds connection to the "Board Room".
4.  **Broadcast**: Backend sends `PRESENCE_UPDATE` to all connected clients in that room.
5.  **UI Update**: All users see the new user's avatar in the "Active Users" header.

### Flow B: Live Card Movement
1.  **Action**: User A drags "Task 1" from "ToDo" to "Done".
2.  **Optimistic UI**: User A sees the card move immediately.
3.  **API Call**: Frontend calls `PUT /cards/:id/move`.
4.  **Persistence**: Backend updates DB position.
5.  **Event Trigger**: Backend emits `CARD_MOVED` event to the Board Room.
6.  **Remote Update**: User B receives `CARD_MOVED` payload.
7.  **Reaction**: User B's screen animates the card from "ToDo" to "Done".

---

## 2. System Behaviors

### Connection Resilience
-   **Disconnect**: If WS connection drops, the frontend attempts to reconnect (exponential backoff: 1s, 2s, 5s, 10s).
-   **Re-Sync**: On successful reconnection, the frontend **MUST** silence all WS events and re-fetch the entire board state (`GET /boards/:id`) to ensure no events were missed.

### Race Conditions
-   **Last Write Wins**: If User A and User B edit the title simultaneously, the last received API request overwrites the DB. The subsequent `CARD_UPDATED` event propogates the final state to everyone.

---

## 3. UI Requirements

### Presence Header
-   Located in Top Bar, right side.
-   Max 5 avatars shown.
-   "+ N" bubble for overflow.
-   Tooltip shows full name on hover.

### Card Indicators
-   When User A has a card modal open, User B sees User A's avatar on the card face (miniature).
-   Prevents "surprise edits".

---

## 4. Analytics
-   Track `ws_connect_count` (Peak Concurrent Connections).
-   Track `ws_message_rate` per board.
