# Feature Analysis & Refactoring Workflow

When requested to analyze a feature or suggest refactoring strategies, follow this workflow:

1. **Understand the Goal**: Identify the exact business requirement or performance goal for the feature.
2. **Current State Analysis**:
   - Use `codebase_investigator` or `grep_search` to map existing architecture.
   - Identify which layers (Domain, Application, Adapters, Infrastructure) the feature currently touches.
   - Look for violations of Clean Architecture principles (e.g., controllers containing business logic, domains depending on frameworks).
3. **Frontend Impact**:
   - Identify affected UI components and state managers.
   - Evaluate if the UI is too tightly coupled to data fetching or business logic.
4. **Backend Impact**:
   - Identify affected Use Cases, Entities, and Database adapters.
   - Ensure the new feature maintains separation of concerns.
5. **Refactoring Suggestions**:
   - Propose clear, actionable steps to migrate the current state toward Clean Architecture.
   - Recommend extracting business logic into Use Cases or Entities.
   - Recommend abstracting external dependencies behind interfaces (Dependency Inversion).
6. **Documentation**: Provide a high-level summary or draft an ADR if the changes involve a significant architectural decision.