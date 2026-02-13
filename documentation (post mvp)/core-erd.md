# Core Entity Relationship Diagram (ERD)
## Project Nexus v2.0 Schema

This document defines the core database schema for the Project Nexus platform, including new v2.0 entities for Documentation and Workspace Governance.

```mermaid
erDiagram
    %% Core Identity & Access
    User ||--o{ Workspace : owns
    User ||--o{ WorkspaceMember : "is member of"
    User ||--o{ BoardMember : "has access to"
    User ||--o{ Card : "assigned to"

    Workspace ||--|{ workspace_member : contains
    Workspace ||--|{ Board : contains

    %% Project Management (Kanban)
    Board ||--|{ Column : contains
    Board ||--|{ BoardMember : "has members"
    Column ||--|{ Card : contains
    Card ||--o{ Checklist : contains
    Card ||--o{ Comment : contains
    Checklist ||--|{ ChecklistItem : contains

    %% Knowledge & Notes (v2.0)
    Board ||--o{ WikiPage : contains
    Board ||--o{ Note : contains

    %% ENTITY DEFINITIONS
    User {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string avatar_url
        timestamp created_at
    }

    Workspace {
        uuid id PK
        string name
        string slug UK
        uuid owner_id FK
        timestamp created_at
    }

    WorkspaceMember {
        uuid workspace_id FK "Composite PK"
        uuid user_id FK "Composite PK"
        string role "Admin, Member"
        timestamp joined_at
    }

    Board {
        uuid id PK
        uuid workspace_id FK
        string title
        string background_color
        boolean is_private
        timestamp created_at
    }

    BoardMember {
        uuid board_id FK "Composite PK"
        uuid user_id FK "Composite PK"
        string role "Editor, Observer"
    }

    Column {
        uuid id PK
        uuid board_id FK
        string title
        float position "Lexorank"
    }

    Card {
        uuid id PK
        uuid column_id FK
        string title
        text description "Markdown"
        float position "Lexorank"
        timestamp due_date
        timestamp created_at
    }

    Checklist {
        uuid id PK
        uuid card_id FK
        string title
        float position
    }

    ChecklistItem {
        uuid id PK
        uuid checklist_id FK
        string content
        boolean is_done
        float position
    }

    WikiPage {
        uuid id PK
        uuid board_id FK
        string title
        text content "Markdown"
        uuid last_edited_by FK
        timestamp updated_at
    }

    Note {
        uuid id PK
        uuid board_id FK
        text content
        float position_x
        float position_y
        string color
    }
```

## Schema Notes
1.  **UUIDs**: All primary keys are UUID v4.
2.  **Scoping**: All queries MUST be scoped by `WorkspaceID` (via Board) for security.
3.  **Positioning**: `Checklist` and `ChecklistItem` use float-based positioning (Lexorank style) for efficient reordering.
4.  **Content**: `Card.description` and `WikiPage.content` store raw Markdown.
