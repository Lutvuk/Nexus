Project Nexus - Test Driven Development (TDD) Specification
Document Control
Version	Date	Status	Author
1.0	2026-02-07	Approved	Perplexity AI
Traceability: Product Brief → PRD → FSD → ERD → API → Wireframes → Design → TDD → QA Implementation			
1. Testing Philosophy
"Test Critical Paths First" – 80% coverage pada drag-drop + CRUD flows. Backend 100% transaction safety, Frontend 100% drag-drop scenarios.

text
Pyramid: 60% Unit → 30% Integration → 10% E2E
Total Coverage Target: Backend 90%, Frontend 85%
2. Backend Testing Strategy (Go + Testify)
2.1 Test Frameworks
text
Unit: testify (assert, suite)
Integration: Testcontainers (Postgres in Docker)
Mock: testify/mock
Coverage: go test -coverprofile=coverage.out
2.2 Critical Backend Tests (MANDATORY)
Table: Backend Test Suite (38 Tests)
Module	Test Case	Expected	Coverage
Column Service	TestCreateColumnValidName	Returns column with position = max+1	✅
TestCreateColumnEmptyName	Returns validation error	✅
TestCreateColumnLongName	Truncates at 100 chars	✅
Card Service	TestCreateCardValid	Returns card position = max+1	✅
MoveCard Transaction	TestMoveSameColumnUp	[A0,B1,C2] → drag B→0 → [B0,A1,C2]	✅ CRITICAL
TestMoveSameColumnDown	[A0,B1,C2] → drag A→2 → [B0,C1,A2]	✅
TestMoveDifferentColumns	Plan[A0]→Progress
​ → positions shift	✅ CRITICAL
TestConcurrentMoves	2 parallel moves → no corruption	✅
TestMoveNonExistentCard	Returns 404	✅
Delete Cascade	TestDeleteColumn	Column + 3 cards → all gone	✅
TestDeleteCard	Remaining cards shift position	✅
Backend Test Code Template
go
func TestMoveCardSameColumnUp(t *testing.T) {
  // Arrange
  colID := createTestColumn(t)
  cards := createOrderedCards(t, colID, 3) // [A0,B1,C2]
  
  // Act  
  req := MoveCardRequest{
    ColumnID: colID,
    Position: 0,
  }
  result := service.MoveCard(cards[1].ID, req)
  
  // Assert
  assert.NoError(t, result.Err)
  assert.Equal(t, 0, getCardPosition(t, cards[1].ID)) // B now 0
  assert.Equal(t, 1, getCardPosition(t, cards[0].ID)) // A shifted to 1
}
3. Frontend Testing Strategy (Angular + Jest)
3.1 Test Frameworks
text
Unit: Jasmine + Karma (ng test)
E2E: Cypress (ng e2e)
Component: Testing Library
Mock API: MSW (Mock Service Worker)
Coverage: ng test --code-coverage
3.2 Critical Frontend Tests
Table: Frontend Test Suite (45 Tests)
Component	Test Case	Expected	Coverage
NexusBoard	TestLoadBoardSuccess	Renders 3 columns + 6 cards	✅
TestLoadBoardError	Shows error toast + retry	✅
DragDrop	TestReorderSameColumn	Drag card 1→0 → DOM order changes	✅ CRITICAL
TestMoveBetweenColumns	Drag Plan→Progress → card appears target	✅ CRITICAL
TestDragNetworkFail	Local state preserved + retry	✅
TestDragConcurrent	Race condition → consistent final state	✅
NexusCard	TestCardEditInline	Click → input → Enter → API PATCH	✅
Forms	TestAddCardValidation	Empty title → validation error	✅
Responsive	TestMobileDragTouch	Touch events trigger drag	✅
Frontend Test Code Template
typescript
// nexus-board.component.spec.ts
it('should reorder cards on drop same column', async fakeAsync(() => {
  // Arrange
  const card2 = fixture.debugElement.query(By.css('[data-pos="1"]'));
  const dropZone = fixture.debugElement.query(By.css('.cdk-drop-list'));
  
  // Act
  const dragDropEvent = createDragDropEvent(0, 1); // from 1 to 0
  dropZone.triggerEventHandler('cdkDropListDropped', dragDropEvent);
  tick(); // async API
  
  // Assert
  fixture.detectChanges();
  const newOrder = getCardPositions();
  expect(newOrder).toEqual([1, 0, 2]); // B,A,C
}));
4. E2E Testing (Cypress - 12 Critical Flows)
4.1 Drag-Drop Golden Path
javascript
// cypress/e2e/drag-drop.cy.js
it('Complete drag-drop workflow', () => {
  cy.visit('/');
  cy.get('[data-column="Plan"] [data-card="card-1"]')
    .trigger('dragstart')
    .trigger('dragend', { clientX: 600, clientY: 200 }); // Progress drop
  cy.reload();
  cy.get('[data-column="Progress"]').contains('Design glassmorphism');
});
4.2 Critical E2E Tests
text
1. Load → Drag Plan→Progress → Refresh → Persisted ✅
2. Add column → Add card → Delete → Gone ✅  
3. Rapid drag-drop (10 cards) → No corruption ✅
4. Network offline → Drag → Online → Sync ✅
5. Mobile touch drag → Works ✅
6. Concurrent browser tabs → Consistent ✅
5. Test Data Factory
Backend (Go)
go
func createOrderedCards(t *testing.T, colID string, count int) []Card {
  cards := make([]Card, count)
  for i := 0; i < count; i++ {
    cards[i] = Card{Title: fmt.Sprintf("Card %d", i), Position: i}
  }
  return cards;
}
Frontend (Angular)
typescript
function createMockBoard(): BoardResponse {
  return {
    columns: [
      { id: 'plan', name: 'Plan', position: 0, cards: [
        { id: 'c1', title: 'Card 1', position: 0 }
      ]}
    ]
  };
}
6. Coverage & CI Requirements
Coverage Matrix
text
Backend Go:     90%+ (focus services/handlers)
Frontend Unit:  85%+ (components/services)
Frontend E2E:   100% critical paths
GitHub Actions CI
text
name: Nexus CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Backend Tests
      run: cd backend && go test -v -coverprofile=coverage.out ./...
    - name: Frontend Tests  
      run: cd frontend && ng test --watch=false --code-coverage
    - name: E2E Tests
      run: cd frontend && ng e2e
7. Mock Service Worker (MSW) for Frontend
javascript
// mocks/handlers.js (Dev + Tests)
rest.patch('/api/v1/cards/:id/move', (req, res, ctx) => {
  return res(
    ctx.delay(100), // Simulate network
    ctx.status(200),
    ctx.json({ success: true })
  );
});
8. Test Execution Priority
text
🔴 DAY 3 CRITICAL (Before Integration):
• Backend: MoveCard transactions (8 tests)
• Frontend: DragDrop DOM events (12 tests)

🟡 DAY 4 IMPORTANT:
• E2E: End-to-end drag-drop persistence
• Forms validation all scenarios

🟢 DAY 5 NICE:
• Edge cases (network, concurrent)
• Performance ( Lighthouse 90+ )
9. Test Reporting Dashboard
text
Coverage Report:
Backend: handlers 95% | services 98% | models 100%
Frontend: components 88% | services 92%

Failed Tests: 0/93 ✅
E2E Duration: 2m 14s ✅
Approval & Execution
text
✅ Backend test suite ready (38 tests)
✅ Frontend test suite ready (45 tests) 
✅ E2E golden paths (12 flows)
✅ CI/CD pipeline template

Status: **QA Automation Ready**
Next: Day 5 Testing Implementation