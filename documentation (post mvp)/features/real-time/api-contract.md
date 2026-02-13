# API Contract: Real-Time Events
## Feature: Real-Time Collaboration

| Metadata | Details |
| :--- | :--- |
| **Protocol** | WebSocket (WSS) |
| **Endpoint** | `/ws?token={jwt}` |
| **Auth** | Query Parameter JWT |

---

## 1. Connection Lifecycle

### Connect
Client connects to `wss://api.nexus.com/ws?token=...`.
Server validates JWT. If invalid -> Close 4001.
If valid -> Upgrade connection and map to User ID.

### Join Board (Implicit or Explicit)
MVP: The WebSocket connection is global or scoped.
**Decision**: Connection is **Per Board** or **Global with Subscriptions**.
**Selected Approach**: **Global Connection + Subscribe Actions**.
*Actually, for MVP simplicity, we might just broadcast everything to everyone in the "Workspace". But "Per Board" is safer.*

**Revised Protocol**:
Client sends `JOIN_BOARD` message immediately after connect.

---

## 2. Client -> Server Messages (Upstream)

### `JOIN_BOARD`
Subscribe to updates for a specific board.
```json
{
  "type": "JOIN_BOARD",
  "payload": {
    "board_id": "uuid"
  }
}
```

### `LEAVE_BOARD`
Unsubscribe.
```json
{
  "type": "LEAVE_BOARD",
  "payload": {
    "board_id": "uuid"
  }
}
```

### `PING`
Keep-alive heartbeats.
```json
{ "type": "PING" }
```

---

## 3. Server -> Client Messages (Downstream)

### `BOARD_UPDATED`
Generic update when board metadata changes.
```json
{
  "type": "BOARD_UPDATED",
  "payload": {
    "board_id": "uuid",
    "title": "New Title"
  }
}
```

### `CARD_MOVED`
Broadcast when a card is dragged to a new column or position.
```json
{
  "type": "CARD_MOVED",
  "payload": {
    "card_id": "uuid",
    "source_column_id": "uuid",
    "target_column_id": "uuid",
    "new_position": 1024.0,
    "user_id": "uuid" // Who moved it
  }
}
```

### `CARD_UPDATED`
Broadcast when title, description, or details change.
```json
{
  "type": "CARD_UPDATED",
  "payload": {
    "card_id": "uuid",
    "field": "description", // optional hint
    "data": { ... } // Partial or full card object
  }
}
```

### `PRESENCE_UPDATE`
List of active users on the board.
```json
{
  "type": "PRESENCE_UPDATE",
  "payload": {
    "board_id": "uuid",
    "active_users": [
      { "id": "uuid", "name": "Alice", "avatar": "..." },
      { "id": "uuid", "name": "Bob", "avatar": "..." }
    ]
  }
}
```

---

## 4. Error Handling
Server sends error frames for bad requests.
```json
{
  "type": "ERROR",
  "payload": {
    "code": "INVALID_Payload",
    "message": "Project ID required"
  }
}
```
