---
description: Start working on a story — automatically loads all relevant context documents (Design System, Wireframes, TDD, Stories, API Contract, etc.) to begin implementation.
---

# Start Story Workflow

Use this workflow when you're ready to begin implementing a specific story. It automatically loads all necessary context documents so you don't have to manually reference each one.

---

## Step 1: Identify the Story

1.  **Ask**: "Which story are you working on? Provide the story title or ID."
2.  **Locate**: Find the story in `docs/features/[feature-name]/stories.md`.
3.  **Confirm**: Display the story details and confirm this is the correct story.
4.  **Approve**: Wait for user approval before proceeding.

---

## Step 2: Load Context Documents

Automatically read and understand the following documents for the feature:

### Required Documents
1.  **Design System**: Read `docs/design-system.md` for UI/styling guidelines.
2.  **Wireframes**: Read `docs/features/[feature-name]/wireframes.md` for screen layouts and user flows.
3.  **Stories**: Read `docs/features/[feature-name]/stories.md` to understand all related stories and dependencies.
4.  **TDD (Technical Design Document)**: Read `docs/features/[feature-name]/tdd.md` for architecture, data flows, and implementation guidance.

### Optional Documents (if available)
5.  **API Contract**: Read `docs/features/[feature-name]/api-contract.md` for endpoint specifications.
6.  **ERD Extension**: Read `docs/features/[feature-name]/erd-extension.md` for data model changes.
7.  **FSD (Functional Specification)**: Read `docs/features/[feature-name]/fsd.md` for detailed functional requirements.
8.  **PRD Addendum**: Read `docs/features/[feature-name]/prd-addendum.md` for feature requirements.
9.  **Core ERD**: Read `docs/erd/core-erd.md` for existing data model context.
10. **API Standards**: Read `docs/api-standards.md` for platform-wide conventions.

---

## Step 3: Summarize Context

Provide a brief summary to the user:

1.  **Story Overview**: What the story aims to achieve.
2.  **Relevant Wireframe(s)**: Which screens are affected.
3.  **Technical Approach**: Key implementation points from the TDD.
4.  **API Endpoints**: Any endpoints to implement or consume.
5.  **Dependencies**: Related stories or components.

---

## Step 4: Begin Implementation

1.  **Ask**: "Ready to start? Any questions before we begin coding?"
2.  **Clarify**: Address any questions or ambiguities.
3.  **Implement**: Start coding with full context loaded.

---

# Notes

-   This workflow assumes the project has gone through the kickoff workflow and has the standard documentation structure.
-   If any document is missing, notify the user and proceed with available context.
-   Keep all loaded context in mind throughout the implementation session.
