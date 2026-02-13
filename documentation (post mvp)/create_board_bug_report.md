# Project Nexus - Create Board Feature Bug Report
**Date:** 2026-02-08
**Status:** 🔴 NOT WORKING - Needs Debugging

---

## Problem Statement
The "New Board" button on the Dashboard does not create a new board. After clicking the button and entering a title in the Glassmorphism modal, nothing happens - no board is created, no navigation occurs, and no error is displayed.

---

## Implementation Summary (What Was Done)

### 1. Backend (Go/Gin)

#### `board_handler.go` - Added `CreateBoard` method
**File:** `f:\BZ InfoTek Indonesia\BZ InfoTek Indonesia (Personal Assesessment)\internal\handlers\board_handler.go`

```go
// CreateBoard creates a new board in the user's default workspace
func (h *BoardHandler) CreateBoard(c *gin.Context) {
    userID, err := middleware.GetUserID(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    var req struct {
        Title string `json:"title" binding:"required,min=1,max=200"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
        return
    }

    // Find user's default workspace
    var workspace models.Workspace
    if err := h.DB.Where("owner_id = ?", userID).First(&workspace).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "No workspace found"})
        return
    }

    // Create board
    board := models.Board{
        ID:          uuid.New(),
        Title:       req.Title,
        WorkspaceID: workspace.ID,
    }

    if err := h.DB.Create(&board).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create board"})
        return
    }

    c.JSON(http.StatusCreated, board)
}
```

#### `main.go` - Registered Route
**File:** `f:\BZ InfoTek Indonesia\BZ InfoTek Indonesia (Personal Assesessment)\cmd\server\main.go`

```go
api.POST("/boards", boardHandler.CreateBoard)  // New Board
```

---

### 2. Frontend (Angular 18)

#### `board.service.ts` - Added `createBoard` method
**File:** `f:\BZ InfoTek Indonesia\BZ InfoTek Indonesia (Personal Assesessment)\nexus-frontend\src\app\services\board.service.ts`

```typescript
createBoard(title: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/boards`, { title }).pipe(
    tap(() => this.toast.show('Board created', 'success')),
    catchError(err => this.handleError('Failed to create board', err))
  );
}
```

#### `nexus-dashboard.component.ts` - Refactored `createBoard()`
**File:** `f:\BZ InfoTek Indonesia\BZ InfoTek Indonesia (Personal Assesessment)\nexus-frontend\src\app\components\nexus-dashboard\nexus-dashboard.component.ts`

```typescript
async createBoard() {
    const title = await this.dialogService.openPrompt({
        title: 'Create New Board',
        promptLabel: 'Board Name',
        promptValue: '',
        confirmLabel: 'Create Board',
        type: 'prompt'
    });

    if (title) {
        this.isCreating = true;
        this.boardService.createBoard(title).subscribe({
            next: (newBoard) => {
                this.isCreating = false;
                this.router.navigate(['/board', newBoard.id]);
            },
            error: () => {
                this.isCreating = false;
            }
        });
    }
}
```

---

## Potential Issues to Investigate

### Issue 1: DialogService Implementation
Check if `DialogService.openPrompt()` is returning the title correctly.

**File to check:** `f:\BZ InfoTek Indonesia\BZ InfoTek Indonesia (Personal Assesessment)\nexus-frontend\src\app\services\dialog.service.ts`

**Questions:**
- Does `openPrompt()` return a `Promise<string>` or `Promise<string | null>`?
- Is the modal actually closing and returning the value?

### Issue 2: HTTP Request Not Firing
The `subscribe()` might not be triggering if there's an issue with the Observable chain.

**Debug step:** Add console logs:
```typescript
if (title) {
    console.log('Title received:', title);
    this.boardService.createBoard(title).subscribe({
        next: (newBoard) => {
            console.log('Board created:', newBoard);
            // ...
        },
        error: (err) => {
            console.error('Error creating board:', err);
        }
    });
}
```

### Issue 3: Backend Workspace Lookup
The query `h.DB.Where("owner_id = ?", userID).First(&workspace)` may fail if:
- The `owner_id` column doesn't exist on the `workspaces` table
- The Workspace model uses a different foreign key name

**File to check:** `f:\BZ InfoTek Indonesia\BZ InfoTek Indonesia (Personal Assesessment)\internal\models\workspace.go`

### Issue 4: CORS or Auth Issues
The POST request might be blocked. Check browser DevTools Network tab for:
- HTTP 401 (Auth issue)
- HTTP 500 (Backend error)
- CORS preflight failure

---

## Files to Review

| File | Purpose |
|------|---------|
| `internal/handlers/board_handler.go` | Backend CreateBoard handler |
| `cmd/server/main.go` | Route registration |
| `nexus-frontend/src/app/services/board.service.ts` | Frontend API call |
| `nexus-frontend/src/app/components/nexus-dashboard/nexus-dashboard.component.ts` | Dashboard logic |
| `nexus-frontend/src/app/services/dialog.service.ts` | Modal dialog service |
| `internal/models/workspace.go` | Workspace model (check `owner_id` field) |

---

## Debugging Commands

### 1. Test Backend Endpoint Directly
```bash
curl -X POST http://localhost:8080/api/v1/boards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title": "Test Board"}'
```

### 2. Check Browser Console
Open DevTools (F12) → Console tab. Look for:
- JavaScript errors
- Network request failures
- Console logs from the component

### 3. Check Network Tab
Open DevTools → Network tab. When clicking "Create Board":
- Is a POST request to `/api/v1/boards` being sent?
- What is the response status code?
- What is the response body?

---

## Expected Behavior

1. User clicks "New Board" button
2. Glassmorphism modal appears with "Board Name" input
3. User enters title and clicks "Create Board"
4. POST request sent to `/api/v1/boards` with `{ "title": "..." }`
5. Backend creates board in user's default workspace
6. Frontend receives new board object with `id`
7. Router navigates to `/board/{new_board_id}`

---

## Handoff Notes for Next Session

1. **Start debugging from DialogService** - Verify the modal returns the title value
2. **Add console.log statements** in `createBoard()` to trace execution
3. **Check browser Network tab** for the actual HTTP request/response
4. **Verify Workspace model** has `owner_id` field matching `userID` type
5. **Test backend directly with curl** to isolate frontend vs backend issue
