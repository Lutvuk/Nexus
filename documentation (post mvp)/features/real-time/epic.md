# Epic: Real-Time Collaboration

| Metadata | Details |
| :--- | :--- |
| **Epic ID** | 3 |
| **Feature** | Real-Time Sync & Presence |
| **Status** | Implementation Planned |

---

## 1. High-Level Objectives
-   Implement WebSocket infrastructure (Hub, Client, Handlers).
-   Integrate WebSocket service into Angular frontend.
-   Enable live updates for critical board events (Card Move, Column Reorder).
-   Show user presence on active boards.

---

## 2. Deliverables Breakdown

### Phase 1: Infrastructure (Backend)
-   [ ] **WebSocket Hub**: Go implementation of `Hub` struct managing `clients`, `register`, `unregister`, `broadcast`.
-   [ ] **Connection Handler**: New `/ws` endpoint with Upgrader.
-   [ ] **Auth Integration**: Validate JWT from query param `?token=...`.
-   [ ] **Room Logic**: Map connections to `BoardID` so messages scale properly.

### Phase 2: Core Events (Backend & Frontend)
-   [ ] **Event: CARD_MOVED**: Broadcast when `MoveCard` API is called.
-   [ ] **Event: COLUMN_MOVED**: Broadcast when `MoveColumn` API is called.
-   [ ] **Frontend Service**: RxJS `WebSocketService` to listen/emit.
-   [ ] **Board Integration**: Update `NexusBoardComponent` Signal state on valid event.

### Phase 3: Presence (Behavior)
-   [ ] **Event: USER_JOINED**: Broadcast when a socket connects to a board.
-   [ ] **Event: USER_LEFT**: Broadcast on disconnect.
-   [ ] **UI**: Show avatars in the Board Header.

---

## 3. Risks & Dependencies
-   **Risk**: Connection drops. **Mitigation**: Implement robust reconnection logic in frontend service.
-   **Dependency**: Auth token must be available before socket connection.

---

## 4. Definition of Done
-   [ ] WebSocket endpoint is secure (Auth required).
-   [ ] Moving a card in Browser A updates Browser B instantly.
-   [ ] Disconnecting clears user presence from other screens.
-   [ ] Unit tests cover Hub registration and broadcasting logic.
