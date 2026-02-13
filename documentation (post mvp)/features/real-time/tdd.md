# Technical Design Document (TDD)
## Feature: Real-Time Collaboration

| Metadata | Details |
| :--- | :--- |
| **Feature** | Real-Time Sync |
| **Backend** | Go (Gorilla WebSocket) |
| **Frontend** | Angular + RxJS |

---

## 1. Backend Architecture

### Go Structs
We'll implement a standard Hub/Client pattern scoped by `room` (BoardID).

**`Client` Struct**
```go
type Client struct {
    Hub  *Hub
    Conn *websocket.Conn
    Send chan []byte
    UserID uuid.UUID
    BoardID uuid.UUID
}
```

**`Hub` Struct**
```go
type Hub struct {
    // Registered clients mapped by BoardID
    Rooms map[string]map[*Client]bool
    
    // Inbound messages from clients (if any)
    Broadcast chan []byte
    
    // Register requests
    Register chan *Client
    
    // Unregister requests
    Unregister chan *Client
    
    mu sync.Mutex // Protects Rooms map
}
```

### Event Flow
1. API Handler calls `hub.BroadcastToRoom(boardID, eventPayload)`.
2. Hub iterates over `Rooms[boardID]`.
3. Pushes payload to each Client's `Send` channel.
4. Client's write pump goroutine sends to WebSocket.

---

## 2. Frontend Architecture

### WebSocket Service
Singleton service managing the connection.

```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
    private socket$: WebSocketSubject<any>;
    
    public connect(boardId: string, token: string): void {
        // Connect to wss://.../ws?token=...&boardId=...
    }
    
    public onEvent<T>(eventType: string): Observable<T> {
        return this.socket$.pipe(
            filter(msg => msg.type === eventType),
            map(msg => msg.payload)
        );
    }
}
```

### Signal Integration
In `NexusBoardComponent`, we subscribe to events and update the signal.

```typescript
this.wsService.onEvent<CardMoved>('CARD_MOVED').subscribe(event => {
    this.board.update(current => {
        // sophisticated immutable update logic here
        // move card from col A to col B
        return updatedState;
    });
});
```

---

## 3. Security
- **Auth**: Query param `token` validated by `jwt-go` before upgrade.
- **Scoping**: `JOIN_BOARD` action validates user has access to that board via DB lookup.

---

## 4. Scalability Strategy (Future)
- **Current**: In-Memory Hub (Single Instance).
- **Future**: Redis Pub/Sub. When multiple Go instances run, an event on Instance A publishes to Redis channel `board:updates`. Instance B subscribes and forwards to its local WebSocket clients.
