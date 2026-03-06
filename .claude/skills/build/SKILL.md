---
name: build
description: Structured end-to-end feature building workflow. Use when the user asks to "build a feature", "implement a user story", "add functionality", "create a new endpoint/page/component", or starts a significant piece of new work. Guides from requirements through design, implementation, testing, and verification.
disable-model-invocation: true
---

# Feature Building

Build features end-to-end with a structured workflow that prevents the most expensive mistake in development: jumping to code without thinking through requirements and edge cases.

## Phase 1: Requirements Clarification

Before writing any code, answer these questions:

- **What is the user-visible outcome?** Describe what changes from the user's perspective
- **What are the inputs and outputs?** Data flowing in and out of this feature
- **What are the acceptance criteria?** How do we know the feature is complete and correct?
- **What are the non-requirements?** What does this feature explicitly NOT do? (prevents scope creep)

If any question cannot be answered confidently, ASK the user. Do not assume. Wrong assumptions cost more than a quick clarification.

Identify the data flow: where does data originate, how is it transformed at each step, and where does it end up?

## Phase 2: Design Decisions

### Survey Existing Patterns
Search the codebase for similar implementations. Follow established patterns unless there is a strong, documented reason to deviate. Check:
- How do existing API routes handle auth, validation, and error responses?
- How do existing pages fetch data and handle loading/error states?
- How do existing components structure props, state, and events?
- What naming conventions are in use?

### Define the Change Surface
List every file that will be created or modified. Be explicit:
```
CREATE: src/app/api/extensions/[slug]/download/route.ts
CREATE: src/lib/db/queries/downloads.ts
MODIFY: src/types/extension.ts (add DownloadEvent type)
CREATE: src/components/extensions/download-button.tsx
```

### Design Contracts Before Implementation
- For API endpoints: define request schema, response schema, error responses, and auth requirements BEFORE writing handler code. See `references/api-contract-template.md`
- For UI components: identify every state (loading, empty, error, success, partial) BEFORE building
- For database changes: write the migration SQL BEFORE the application code that uses it

## Phase 3: Implementation

### Implementation Order
Build in this order to maximize type safety and testability — each layer's types are available to the next:

1. **Types/interfaces** — define data shapes in `src/types/`
2. **Data layer** — database schema, migrations, query functions
3. **Business logic** — pure functions for validation, transformation, computation
4. **API layer** — route handlers wiring data layer to HTTP
5. **UI layer** — components consuming the API
6. **Integration** — wire everything together, test the full flow

### Implementation Standards
- Every file has a clear single responsibility
- Error handling at every boundary: API calls fail, database queries fail, user input is invalid
- No hardcoded values: use constants, environment variables, or configuration
- Follow the project's existing patterns for imports, file naming, and export style
- When making a non-obvious decision, record the rationale briefly in a comment or use the `document-decision` skill

## Phase 4: Verification

Run through this checklist before declaring the feature complete:

- [ ] Feature works end-to-end (manual walkthrough of the user flow)
- [ ] Tests exist for the happy path and at least two error paths
- [ ] TypeScript is strict: no `any`, no type assertions without comments explaining why
- [ ] UI handles loading, error, and empty states (if applicable)
- [ ] New environment variables are documented
- [ ] `tsc --noEmit` passes with no errors
- [ ] The feature does not break existing functionality (run full test suite)

## Output on Completion

Provide a summary:

```
## Feature Complete: [feature name]

### What Was Built
[User-visible description of the feature]

### Files Changed
- [file path]: [brief description of change]

### Design Decisions
- [decision]: [rationale]

### Tests
- [test file]: [what it covers]

### Follow-up
- [anything deferred or needing attention]
```

For implementation patterns for common feature types, see `references/implementation-patterns.md`.
