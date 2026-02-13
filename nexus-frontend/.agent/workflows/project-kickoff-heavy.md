---
description: HEAVY complexity project kickoff — generates full documentation suite for enterprise, platform, regulated, or multi-team projects.
---

# Project Kickoff Workflow (HEAVY)

This workflow is for **enterprise, platform, regulated, or multi-team projects** where predictability and scale are critical. Each feature is independently deployable and documentation is versioned.

## When to Use HEAVY

Use this workflow if ANY of the following apply:
- Multi-team project
- External API consumers
- Regulated or compliance-heavy domain
- Data model changes affecting multiple services
- Long-lived platform with multiple stakeholders

---

# Global Artifacts (Once Per Project)

These are created **once** and governed centrally.

## Step 1: Product Brief

1.  **Interview**: Ask for high-level product overview.
    *   *Question*: "What is the product name, primary purpose, and target audience?"
2.  **Gather Details**: Problem, solution, key features, business model, competitive advantage, success metrics.
3.  **Confirm**: Summarize and confirm.
4.  **Generate**: Execute `skills/product-brief/SKILL.md`.

## Step 2: PRD (Signed-Off)

1.  **Interview**: Deep dive into requirements.
    *   *Question*: "Walk me through the complete set of functional and non-functional requirements."
2.  **Gather Details**: User stories, acceptance criteria, constraints, dependencies.
3.  **Confirm**: Require explicit sign-off before proceeding.
4.  **Generate**: Execute `skills/prd-generation/SKILL.md`.

## Step 3: Design System

1.  **Interview**: Define visual identity.
    *   *Question*: "Do you have an existing brand guide? Describe the look and feel (modern, corporate, dark/light mode)."
2.  **Gather Details**: Colors, typography, component styles, accessibility requirements.
3.  **Confirm**: Summarize the design direction.
4.  **Generate**: Execute `skills/design-system/SKILL.md`.

## Step 4: Core ERD

1.  **Interview**: Define the domain model.
    *   *Question*: "What are the core entities and their relationships?"
2.  **Gather Details**: Entity names, attributes, cardinalities, constraints.
3.  **Confirm**: Review entity diagram.
4.  **Generate**: Create `docs/erd/core-erd.md` with Mermaid ERD.

## Step 5: Core API Standards & Governance

1.  **Interview**: Define platform-wide API conventions.
    *   *Question*: "What are your standards for authentication, error handling, versioning, and rate limiting?"
2.  **Document**: Create `docs/api-standards.md` covering:
    - Auth flow (OAuth, JWT, API keys)
    - Error response format
    - Versioning strategy
    - Rate limiting policy

---

# Per-Feature Artifacts (Repeat Per Feature)

These are created **for each feature or module**.

## Step 6: Feature PRD Addendum

1.  **Interview**: Scope the specific feature.
    *   *Question*: "What is the feature name and its specific requirements?"
2.  **Generate**: Create `docs/features/[feature-name]/prd-addendum.md`.

## Step 7: Feature Epic(s)

1.  **Interview**: Break down into high-level deliverables.
2.  **Generate**: Create `docs/features/[feature-name]/epic.md`.

## Step 8: UI Wireframes

1.  **Interview**: Detail the key screens.
    *   *Question*: "Walk me through the user flow for this feature."
2.  **Gather Details**: Screens, data fields, user actions, layout preferences.
3.  **Generate**: Execute `skills/wireframe-generator/SKILL.md` for the feature.

## Step 9: ERD Extension Document

1.  **Interview**: Identify new or changed entities.
    *   *Question*: "What new entities or fields does this feature introduce?"
2.  **Generate**: Create `docs/features/[feature-name]/erd-extension.md` (Delta only).

## Step 10: API Contract (Versioned)

1.  **Interview**: Define endpoints for the feature.
    *   *Question*: "What new API endpoints are required?"
2.  **Gather Details**: HTTP methods, paths, request/response schemas, auth requirements.
3.  **Review**: API contracts must be reviewed before implementation.
4.  **Generate**: Create `docs/features/[feature-name]/api-contract.md`.

## Step 11: Functional Specification Document (FSD)

1.  **Interview**: Document functional requirements in detail.
    *   *Question*: "What are the detailed functional flows and business rules?"
2.  **Generate**: Create `docs/features/[feature-name]/fsd.md`.

## Step 12: Technical Design Document (TDD)

1.  **Input**: FSD, ERD Extension, API Contract, Wireframes.
2.  **Interview**: Technical implementation details.
    *   *Question*: "Any specific architecture, tech stack, or performance requirements for this feature?"
3.  **Generate**: Execute `skills/tdd-generator/SKILL.md` in **HEAVY mode**.

## Step 13: Sprint Stories

1.  **Generate**: Break TDD into sprint-ready, estimated stories.
2.  **Output**: Create `docs/features/[feature-name]/stories.md`.

---

# Completion

*   Notify the user that all documents have been generated.
*   Provide a summary of files created and their locations.
*   Remind user that ERD changes are explicit and audited, and stories are written *after* FSD/TDD approval.
