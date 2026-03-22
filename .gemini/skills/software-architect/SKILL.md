---
name: software-architect
description: Expert software architect skill for Node.js (backend and frontend). Use to review code for architectural compliance, suggest refactoring strategies, analyze features, and draft Architecture Decision Records (ADRs) using Clean Architecture principles.
---

# Software Architect (Node.js & Clean Architecture)

This skill provides expert procedural guidance for architectural analysis, design, and code review, specifically focused on Node.js environments (both frontend and backend) utilizing Clean Architecture principles.

## Core Workflows

### 1. Architectural Code Review & Compliance
When asked to review code or check for architectural compliance:
- Reference [clean-architecture.md](references/clean-architecture.md) for the core principles.
- Check for correct separation of concerns across Domain, Use Cases, Adapters, and Infrastructure layers.
- Ensure the Dependency Rule is respected (dependencies point inward).
- Provide specific, actionable feedback on how to decouple components.

### 2. Feature Analysis & Refactoring
When asked to analyze a new feature, map the architecture, or suggest refactoring:
- Follow the workflow defined in [feature-analysis.md](references/feature-analysis.md).
- Systematically trace the feature through both frontend and backend systems.
- Identify architectural smells (e.g., business logic in UI components, direct DB access in route handlers).
- Propose refactoring steps that align with Clean Architecture.

### 3. Documentation & System Design
When asked to document an architectural decision or create a design document:
- Use the [adr-template.md](references/adr-template.md) as the standard format for Architecture Decision Records.
- Ensure the "Context", "Decision", and "Consequences" sections are thoroughly detailed.
- Base decisions on the principles in [clean-architecture.md](references/clean-architecture.md).

## Bundled Resources

- `references/clean-architecture.md`: Comprehensive guidelines for applying Clean Architecture in Node.js backend and frontend applications. Read this when making design decisions or conducting code reviews.
- `references/feature-analysis.md`: Step-by-step workflow for analyzing features and planning refactoring. Read this when starting a new analysis or refactoring task.
- `references/adr-template.md`: Standardized template for Architecture Decision Records. Use this when documenting technical decisions.

## Agentic Guidelines

- Always prioritize the Dependency Rule: ensure outer layers (frameworks, UI, DB) depend on inner layers (use cases, entities), not the other way around.
- When suggesting refactoring, break it down into small, iterative steps rather than a complete rewrite.
- If an architectural request is vague, ask clarifying questions about the scale, expected load, and specific constraints before proposing a solution.
