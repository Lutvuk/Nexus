Project Nexus - Entity Relationship Diagram (ERD) & Database Specification
Document Control
Version	Date	Status	Author
1.0	2026-02-07	Approved	Perplexity AI
Traceability: Product Brief → PRD → FSD → ERD → DDL Implementation			
1. Conceptual ERD
text
┌─────────────────┐ 1    N ┌─────────────────┐ 1    N ┌─────────────────┐
│   Workspace     │───────▶│     Column      │───────▶│      Card       │
│ (Nexus fixed)   │        │                 │        │                 │
└─────────────────┘        └─────────────────┘        └─────────────────┘
                              │ id: UUID PK           │ id: UUID PK
                              │ name: VARCHAR         │ title: VARCHAR
                              │ position: INTEGER     │ description: TEXT
                              │ created_at: TIMESTAMP │ column_id: UUID FK
                              └───────────────────────┘ │ position: INTEGER
                                                       │ created_at: TIMESTAMP
                                                       └───────────────────────┘
2. Physical Data Model (Postgres 15)
2.1 Database Schema DDL
sql
-- Database: nexus
CREATE DATABASE nexus
  WITH ENCODING 'UTF8'
  LC_COLLATE='C'
  LC_CTYPE='C'
  TEMPLATE template0;

-- Extensions (UUID support)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: columns (Core entity)
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100),
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Uniqueness: No duplicate positions
  UNIQUE(position),
  
  -- Indexes
  INDEX idx_columns_position (position),
  INDEX idx_columns_name (name)
);

-- Table: cards (Nested under columns)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL CHECK (LENGTH(title) >= 3 AND LENGTH(title) <= 200),
  description TEXT CHECK (LENGTH(description) <= 4000),
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Composite uniqueness: column + position
  UNIQUE(column_id, position),
  
  -- Indexes
  INDEX idx_cards_column_position (column_id, position),
  INDEX idx_cards_title (title),
  INDEX idx_cards_created (created_at)
);

-- Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON columns
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards  
  FOR EACH ROW EXECUTE PROCEDURE update_cards_updated_at();
3. Seed Data (Initial State)
sql
-- Default Nexus columns (EXACT order dari PRD)
INSERT INTO columns (id, name, position, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Plan', 0, NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Progress', 1, NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Complete', 2, NOW());

-- Sample cards untuk setiap column
INSERT INTO cards (id, title, description, column_id, position, created_at) VALUES
  -- Plan column (position 0)
  ('10000000-0000-0000-0000-000000000001', 'Design glassmorphism UI', 'Purple theme #8B5CF6 + backdrop blur', '00000000-0000-0000-0000-000000000001', 0, NOW()),
  ('10000000-0000-0000-0000-000000000002', 'Setup Angular CDK', 'DragDropModule + connected lists', '00000000-0000-0000-0000-000000000001', 1, NOW()),
  
  -- Progress column (position 0)
  ('10000000-0000-0000-0000-000000000101', 'Go Gin backend', 'REST API + GORM transactions', '00000000-0000-0000-0000-000000000002', 0, NOW()),
  
  -- Complete column (position 0)  
  ('10000000-0000-0000-0000-000000000201', 'Docker compose', 'Postgres + Go API local dev', '00000000-0000-0000-0000-000000000003', 0, NOW());
4. Position Management Algorithm
4.1 Column Position Rules
text
• position: INTEGER >= 0
• UNIQUE constraint per workspace (single workspace = global unique)
• New column → MAX(position) + 1
• Delete column → NO automatic reordering (manual drag later)
4.2 Card Position Rules (PER COLUMN)
text
• position: INTEGER >= 0 dalam column_id nya
• UNIQUE(column_id, position)
• New card → MAX(position dalam column) + 1
• Drag-drop reorder → SHIFT semua affected cards
4.3 Move Card Transaction (Critical)
sql
-- Pseudocode untuk Go handler
BEGIN TRANSACTION;

-- OLD COLUMN: Shift down cards above old position
UPDATE cards 
SET position = position - 1
WHERE column_id = old_column_id 
  AND position > old_position;

-- NEW COLUMN: Shift up cards at/above new position  
UPDATE cards 
SET position = position + 1
WHERE column_id = new_column_id 
  AND position >= new_position;

-- UPDATE target card
UPDATE cards 
SET column_id = new_column_id, 
    position = new_position
WHERE id = card_id;

COMMIT;
5. Query Performance Specifications
5.1 Primary Queries (Indexed)
sql
-- Board load (N+1 solved dengan JOIN)
SELECT c.*, 
       array_agg(json_build_object('id', cr.id, 'title', cr.title, ...)) as cards
FROM columns c 
LEFT JOIN cards cr ON cr.column_id = c.id
GROUP BY c.id
ORDER BY c.position;

-- Move card (single transaction)
UPDATE cards WHERE id = ?  -- PK index
5.2 Index Strategy
text
PRIMARY: id (UUID)
COMPOSITE: (column_id, position) - drag-drop queries
SINGLE: position (column reordering)
FULLTEXT: title (future search)
6. Data Constraints & Validation
Field	Constraint	Backend Validation	Frontend Validation
columns.name	1-100 chars	SQL CHECK	Form minLength=1
cards.title	3-200 chars	SQL CHECK	Form required + pattern
position	>= 0 integer	SQL CHECK	cdkDragDrop index
column_id	FK cascade	GORM auto	Dropdown validation
7. Migration Strategy
Initial Migration (Day 1)
sql
-- 001_create_schema.up.sql
-- Copy DDL + indexes dari section 2.1

-- 001_create_schema.down.sql  
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS columns;
Seed Migration
sql
-- 002_seed_data.up.sql
-- Copy seed data dari section 3
8. Backup & Recovery
text
Daily: Postgres pg_dump cron job (Railway)
Point-in-time: WAL enabled (Postgres default)
Disaster: Railway snapshot restore
MVP Data: < 1MB → Trivial recovery
9. Production Schema Evolution
text
Week 2+ (Future):
ALTER TABLE cards ADD COLUMN labels JSONB;
ALTER TABLE columns ADD COLUMN color VARCHAR(7);
CREATE TABLE comments (...);
10. Verification Queries
Post-Deployment Check
sql
-- Verify structure
SELECT 
  COUNT(*) as column_count,
  (SELECT COUNT(*) FROM cards) as card_count
FROM columns 
WHERE position IN (0,1,2);  -- Should return 3 columns, 6 cards

-- Test move logic
SELECT * FROM cards 
WHERE column_id = '00000000-0000-0000-0000-000000000001' 
ORDER BY position;
Approval & Implementation Notes
text
✅ DDL Ready → Go GORM migrations
✅ Seed Data → Exact 6 sample cards  
✅ Constraints → Enforced at DB level
✅ Indexes → Query performance optimized
✅ Transactions → Move card ACID compliant

Next: API Contract → Day 1 Backend Implementation
Status: Database Ready for Production
Size Estimate: 1MB initial, 10MB after 1 month light use

Project Nexus ERD v1.0 - Solid Foundation