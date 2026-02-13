---
description: HEAVY complexity feature addition — generates full documentation suite for new features in an existing enterprise or platform project.
---

# Add Feature Workflow (HEAVY)

This workflow is for adding new features or modules to an **enterprise, platform, regulated, or multi-team project**. It ensures consistent documentation standards for everything added post-kickoff.

## Step 1: Feature PRD Addendum

1.  **Interview**: Scope the specific feature.
    *   *Question*: "What is the feature name and its specific requirements?"
2.  **Generate**: Execute `skills/prd-generator/SKILL.md`.
    *   Output: `docs/features/[feature-name]/prd-addendum.md`.
3.  **Approve**: Wait for user approval before proceeding.

## Step 2: Feature Epic(s)

1.  **Interview**: Break down into high-level deliverables.
2.  **Generate**: Execute `skills/epic-generator/SKILL.md`.
    *   Output: `docs/features/[feature-name]/epic.md`.
3.  **Approve**: Wait for user approval before proceeding.

## Step 3: UI Wireframes

1.  **Interview**: Detail the key screens.
    *   *Question*: "Walk me through the user flow for this feature."
2.  **Gather Details**: Screens, data fields, user actions, layout preferences.
3.  **Generate**: Execute `skills/wireframe-generator/SKILL.md` for the feature.
4.  **Approve**: Wait for user approval before proceeding.

## Step 4: ERD Extension Document

1.  **Interview**: Identify new or changed entities.
    *   *Question*: "What new entities or fields does this feature introduce?"
2.  **Generate**: Execute `skills/erd-generator/SKILL.md` (Delta only).
    *   Output: `docs/features/[feature-name]/erd-extension.md`.
3.  **Approve**: Wait for user approval before proceeding.

## Step 5: API Contract (Versioned)

1.  **Interview**: Define endpoints for the feature.
    *   *Question*: "What new API endpoints are required?"
2.  **Gather Details**: HTTP methods, paths, request/response schemas, auth requirements.
3.  **Review**: API contracts must be reviewed before implementation.
4.  **Generate**: Execute `skills/api-contract-generator/SKILL.md`.
    *   Output: `docs/features/[feature-name]/api-contract.md`.
5.  **Approve**: Wait for user approval before proceeding.

## Step 6: Functional Specification Document (FSD)

1.  **Interview**: Document functional requirements in detail.
    *   *Question*: "What are the detailed functional flows and business rules?"
2.  **Generate**: Execute `skills/fsd-generator/SKILL.md`.
    *   Output: `docs/features/[feature-name]/fsd.md`.
3.  **Approve**: Wait for user approval before proceeding.

## Step 7: Technical Design Document (TDD)

1.  **Input**: FSD, ERD Extension, API Contract, Wireframes.
2.  **Interview**: Technical implementation details.
    *   *Question*: "Any specific architecture, tech stack, or performance requirements for this feature?"
3.  **Generate**: Execute `skills/tdd-generator/SKILL.md` in **HEAVY mode**.
4.  **Approve**: Wait for user approval before proceeding.

## Step 8: Sprint Stories

1.  **Generate**: Break TDD into sprint-ready, estimated stories via `skills/story-generator/SKILL.md`.
2.  **Output**: Create `docs/features/[feature-name]/stories.md`.
3.  **Approve**: Wait for user approval before completion.

---

# Completion

*   Notify the user that feature documentation is complete.
*   Provide a summary of files created and their locations.
*   Remind user that ERD changes are explicit and audited, and stories are written *after* FSD/TDD approval.
