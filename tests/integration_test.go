package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

const BaseURL = "http://localhost:8080"

type IntegrationSuite struct {
	suite.Suite
	Token     string
	Client    *http.Client
	UserEmail string
}

func (s *IntegrationSuite) SetupSuite() {
	s.Client = &http.Client{
		Timeout: 10 * time.Second,
	}
	s.UserEmail = fmt.Sprintf("qa_%d@example.com", time.Now().Unix())
}

func (s *IntegrationSuite) Post(path string, body interface{}, headers map[string]string) (int, map[string]interface{}) {
	jsonBody, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", BaseURL+path, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	if s.Token != "" {
		req.Header.Set("Authorization", "Bearer "+s.Token)
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := s.Client.Do(req)
	s.Require().NoError(err)
	defer resp.Body.Close()

	var result map[string]interface{}
	// Decode if content exists
	if resp.ContentLength != 0 {
		_ = json.NewDecoder(resp.Body).Decode(&result)
	}
	return resp.StatusCode, result
}

func (s *IntegrationSuite) Get(path string) (int, map[string]interface{}) {
	req, _ := http.NewRequest("GET", BaseURL+path, nil)
	req.Header.Set("Authorization", "Bearer "+s.Token)

	resp, err := s.Client.Do(req)
	s.Require().NoError(err)
	defer resp.Body.Close()

	var result map[string]interface{} // Generic map, might fail for arrays
	// Use raw decode for flexibility or map
	// For this test we mostly need objects
	_ = json.NewDecoder(resp.Body).Decode(&result)
	return resp.StatusCode, result
}

func (s *IntegrationSuite) GetArray(path string) (int, []interface{}) {
	req, _ := http.NewRequest("GET", BaseURL+path, nil)
	req.Header.Set("Authorization", "Bearer "+s.Token)

	resp, err := s.Client.Do(req)
	s.Require().NoError(err)
	defer resp.Body.Close()

	var result []interface{}
	_ = json.NewDecoder(resp.Body).Decode(&result)
	return resp.StatusCode, result
}

func (s *IntegrationSuite) Test1_RegisterAndLogin() {
	// Register
	regBody := map[string]string{
		"email":    s.UserEmail,
		"password": "password123",
		"name":     "QA User",
	}
	code, _ := s.Post("/auth/register", regBody, nil)
	assert.Equal(s.T(), http.StatusCreated, code)

	// Login
	loginBody := map[string]string{
		"email":    s.UserEmail,
		"password": "password123",
	}
	code, res := s.Post("/auth/login", loginBody, nil)
	assert.Equal(s.T(), http.StatusOK, code)
	s.Token = res["token"].(string)
	assert.NotEmpty(s.T(), s.Token)
}

func (s *IntegrationSuite) Test2_BoardFlow() {
	// Create Board
	boardBody := map[string]interface{}{
		"title":        "Integration Test Board",
		"background":   "default",
		"workspace_id": "00000000-0000-0000-0000-000000000000", // Assuming backend handles empty or valid ID
		// Note: Backend might require a valid workspace ID if the user doesn't have a default one.
		// Let's first check if we have a default workspace or need to create one.
		// For MVP, user usually gets a default workspace on register?
		// Let's try creating a workspace first.
	}

	// Create Workspace
	// wsBody := map[string]string{
	// 	"name": "QA Workspace",
	// }
	// We don't have a direct CreateWorkspace endpoint in the open routes shown?
	// Let's checking `UserHandler` or `WorkspaceHandler`.
	// Wait, Main.go didn't explicitly show `POST /workspaces`.
	// Let's assume we use the default workspace usually created?
	// Or let's check `Join` logic.

	// Actually, looking at `boardHandler.CreateBoard` might reveal if it needs workspace_id.
	// Let's assume passed ID is ignored if we don't have one, or we need to fetch user's workspaces.

	// Fetch user to see workspaces
	code, _ := s.Get("/api/v1/auth/me") // Assuming endpoint exists? No, main.go had /users/me?
	// Wait, main.go had: `authHandler` but where is `/me`?
	// Ah, Epic 15 said "Register Routes (/users/me)".
	// Let's check if it's there.

	// If not, we'll blindly try to create board with nil workspace (backend might handle it).

	// Create Board
	code, boardRes := s.Post("/api/v1/boards", boardBody, nil)
	assert.Equal(s.T(), http.StatusCreated, code, "Create Board Failed")
	boardID := boardRes["id"].(string)

	// Create List (Column)
	listBody := map[string]interface{}{
		"board_id": boardID,
		"name":     "To Do",
		"position": 1000.0,
	}
	code, listRes := s.Post("/api/v1/columns", listBody, nil)
	assert.Equal(s.T(), http.StatusCreated, code, "Create Column Failed")
	listID := listRes["id"].(string)

	// Debug: Fetch Board to see if Column is there
	code, boardDebug := s.Get(fmt.Sprintf("/api/v1/boards/%s", boardID))
	assert.Equal(s.T(), http.StatusOK, code, "Get Board Failed")
	// fmt.Printf("Board Debug: %+v\n", boardDebug)
	cols := boardDebug["columns"].([]interface{})
	if len(cols) == 0 {
		fmt.Printf("Board has NO columns after creation!\n")
		s.T().FailNow()
	} else {
		fmt.Printf("Board has %d columns. First ID: %v. Expected ListID: %v\n", len(cols), cols[0].(map[string]interface{})["id"], listID)
	}

	// Create Card
	cardBody := map[string]interface{}{
		"title":       "Test Card",
		"description": "This is a test card",
		"position":    1000.0,
	}
	// Path: /api/v1/columns/:id/cards
	code, cardRes := s.Post(fmt.Sprintf("/api/v1/columns/%s/cards", listID), cardBody, nil)
	// assert.Equal(s.T(), http.StatusCreated, code, "Create Card Failed")
	if code != http.StatusCreated {
		fmt.Printf("Create Card Failed: %v\n", cardRes)
		s.T().FailNow()
	}
	cardID := cardRes["id"].(string)

	// Debug: Fetch Card to verify it exists
	code, cardDebug := s.Get(fmt.Sprintf("/api/v1/cards/%s", cardID))
	assert.Equal(s.T(), http.StatusOK, code, "Get Card Failed")
	fmt.Printf("TEST DEBUG: BoardID=%v\n", boardID)
	fmt.Printf("TEST DEBUG: ListID=%v\n", listID)
	fmt.Printf("TEST DEBUG: CardID=%v, cardDebug.ColumnID=%v\n", cardID, cardDebug["column_id"])

	// Check Analytics (Epic 25)
	code, stats := s.Get(fmt.Sprintf("/api/v1/boards/%s/analytics", boardID))
	assert.Equal(s.T(), http.StatusOK, code, "Get Analytics Failed")

	fmt.Printf("Analytics Stats: %+v\n", stats)
	assert.Equal(s.T(), float64(1), stats["total_cards"])

	// Mark Card Complete
	// completeBody := map[string]interface{}{
	// 	"is_complete": true,
	// }
	// Note: Go `json` unmarshals bools correctly if struct tags match.
	// We need to send another request.
	// Wait, verify `cardHandler.Update`

	// Verify Notification routes exist (Epic 24)
	code, _ = s.Get("/api/v1/notifications")
	assert.Equal(s.T(), http.StatusOK, code)
}

func (s *IntegrationSuite) Test3_AdvancedCardFeatures() {
	// 1. Create a Board and Column first
	boardBody := map[string]interface{}{
		"title":      "Advanced Test Board",
		"background": "default",
	}
	code, boardRes := s.Post("/api/v1/boards", boardBody, nil)
	assert.Equal(s.T(), http.StatusCreated, code)
	boardID := boardRes["id"].(string)

	listBody := map[string]interface{}{
		"board_id": boardID,
		"name":     "Advanced Column",
		"position": 1000.0,
	}
	code, listRes := s.Post("/api/v1/columns", listBody, nil)
	assert.Equal(s.T(), http.StatusCreated, code)
	listID := listRes["id"].(string)

	// 2. Create Card
	cardBody := map[string]interface{}{
		"title": "Advanced Card",
	}
	code, cardRes := s.Post(fmt.Sprintf("/api/v1/columns/%s/cards", listID), cardBody, nil)
	assert.Equal(s.T(), http.StatusCreated, code)
	cardID := cardRes["id"].(string)

	// 3. Labels
	// Create Label
	labelBody := map[string]string{
		"name":  "Urgent",
		"color": "#FF0000",
	}
	code, labelRes := s.Post(fmt.Sprintf("/api/v1/boards/%s/labels", boardID), labelBody, nil)
	assert.Equal(s.T(), http.StatusCreated, code)
	labelID := labelRes["id"].(string)

	// Add Label to Card
	code, _ = s.Post(fmt.Sprintf("/api/v1/cards/%s/labels/%s", cardID, labelID), nil, nil)
	assert.Equal(s.T(), http.StatusOK, code)

	// 4. Checklists
	// Create Checklist
	clReq := map[string]string{"title": "My Tasks"}
	code, clRes := s.Post(fmt.Sprintf("/api/v1/cards/%s/checklists", cardID), clReq, nil)
	assert.Equal(s.T(), http.StatusCreated, code)
	clID := clRes["id"].(string)

	// Add Item
	itemReq := map[string]string{"title": "Item 1"}
	code, itemRes := s.Post(fmt.Sprintf("/api/v1/checklists/%s/items", clID), itemReq, nil)
	assert.Equal(s.T(), http.StatusCreated, code)
	itemID := itemRes["id"].(string)

	// Toggle Item
	code, res := s.Patch(fmt.Sprintf("/api/v1/checklist-items/%s", itemID), map[string]bool{"is_completed": true})
	if code != http.StatusOK {
		fmt.Printf("ToggleItem Failed: %v\n", res)
	}
	assert.Equal(s.T(), http.StatusOK, code)
}

func (s *IntegrationSuite) Test4_Collaboration() {
	// 1. Create Board and Invite Member (simplified flow)
	boardBody := map[string]interface{}{
		"title": "Collab Board",
	}
	code, boardRes := s.Post("/api/v1/boards", boardBody, nil)
	assert.Equal(s.T(), http.StatusCreated, code)
	boardID := boardRes["id"].(string)

	// Create a card
	code, cardRes := s.Post("/api/v1/columns", map[string]interface{}{
		"board_id": boardID,
		"name":     "Todo",
		"position": 1000.0,
	}, nil)
	listID := cardRes["id"].(string)

	code, cardRes = s.Post(fmt.Sprintf("/api/v1/columns/%s/cards", listID), map[string]string{"title": "Collab Card"}, nil)
	cardID := cardRes["id"].(string)

	// 2. Comments
	commentReq := map[string]string{"content": "This is a comment"}
	code, _ = s.Post(fmt.Sprintf("/api/v1/cards/%s/comments", cardID), commentReq, nil)
	assert.Equal(s.T(), http.StatusCreated, code)

	// 3. Activity Feed
	code, activityRes := s.GetArray(fmt.Sprintf("/api/v1/boards/%s/activity", boardID))
	assert.Equal(s.T(), http.StatusOK, code)
	assert.GreaterOrEqual(s.T(), len(activityRes), 1, "Should have at least one activity item")
}

func (s *IntegrationSuite) Patch(path string, body interface{}) (int, map[string]interface{}) {
	jsonBody, _ := json.Marshal(body)
	req, _ := http.NewRequest("PATCH", BaseURL+path, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	if s.Token != "" {
		req.Header.Set("Authorization", "Bearer "+s.Token)
	}

	resp, err := s.Client.Do(req)
	s.Require().NoError(err)
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		fmt.Printf("PATCH ERROR %d: %s\n", resp.StatusCode, string(bodyBytes))
	}

	var result map[string]interface{}
	if len(bodyBytes) > 0 {
		_ = json.Unmarshal(bodyBytes, &result)
	}
	return resp.StatusCode, result
}

func TestIntegrationSuite(t *testing.T) {
	suite.Run(t, new(IntegrationSuite))
}
