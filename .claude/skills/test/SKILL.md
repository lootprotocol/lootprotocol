---
name: test
description: Writes and runs comprehensive tests that verify behavior, not implementation. Use when the user asks to "write tests", "add test coverage", "test this", "make sure this works", "add specs", or "verify this function." Supports unit, integration, and component tests for TypeScript/React/Node.js.
---

# Test Writing & Execution

Write tests with real regression-catching value. Test what the code DOES (behavior), not how it does it (implementation).

## Test Framework Detection

Detect the project's test setup before writing anything:
- Check `package.json` for test runner: Jest, Vitest, Playwright, Cypress
- Check for test config files: `jest.config.*`, `vitest.config.*`, `playwright.config.*`
- Check existing test files for conventions: `*.test.ts`, `*.spec.ts`, `__tests__/`
- Identify assertion library: built-in expect, chai, testing-library matchers

If the argument is "run" (no file path), execute existing tests and report results. Do not write new tests.

## Core Philosophy: Test Behavior, Not Implementation

### What to Test
- **Public contract**: given these inputs, expect these outputs
- **Boundary conditions**: empty inputs, zero, null, maximum values, single-element arrays
- **Error paths**: invalid inputs, network failures, missing data, permission denied
- **State transitions**: from loading to success, from empty to populated, from valid to invalid

### What NOT to Test
- Internal state or private methods
- Implementation order (which helper was called first)
- Mock call counts (`expect(mock).toHaveBeenCalledTimes(3)` is brittle)
- Framework internals (React re-render counts, middleware execution order)

### The Deletion Test
Ask: "If I refactor the implementation completely (different algorithm, different internal structure) but keep the same external behavior, would this test still pass?" If no, the test is testing implementation and will break on every refactor. Rewrite it to test the output instead.

## Test Structure

### Arrange-Act-Assert
Every test follows this pattern:
```typescript
it('returns empty array when user has no extensions', async () => {
  // Arrange: set up preconditions
  const userId = 'user-with-no-extensions';

  // Act: perform the action under test
  const result = await getExtensionsByPublisher(userId);

  // Assert: verify the outcome
  expect(result).toEqual([]);
});
```

### Naming Convention
Test names should read as specifications. Use present tense, describe the behavior:
- "returns empty array when user has no extensions"
- "throws ValidationError when SKILL.md is missing"
- "redirects to login when session expires"
- NOT: "test getExtensions", "should work", "handles edge case"

### Grouping
Group with `describe` by method or feature, not by "happy path" vs "sad path":
```typescript
describe('validateSkillArchive', () => {
  it('accepts archive with valid SKILL.md and frontmatter', ...);
  it('rejects archive missing SKILL.md', ...);
  it('rejects archive with empty frontmatter description', ...);
  it('rejects archive exceeding 5MB size limit', ...);
});
```

### Setup
Use `beforeEach` only for shared setup that every test in the block needs. Keep test-specific setup inside the test itself for clarity.

## Mocking Strategy

### Mock at Boundaries
- Network calls (fetch, HTTP clients)
- Database queries (the pool/client, not the ORM)
- File system operations
- Time (`Date.now()`, timers)
- External services (S3, Cognito, etc.)

### Do NOT Mock
- The code under test (defeats the purpose)
- Utility functions (if they are pure, they do not need mocking)
- Simple data transformations
- Child components in React (test through the parent)

### Framework-Specific Mocking
- **React components**: mock API calls (fetch or msw), render with Testing Library, query by role/text
- **API routes**: mock database client, call the handler directly with a mock request
- **Server functions**: mock external service clients (S3, Cognito), test the function logic

### Verify Mocks Work
After writing a test, intentionally break the assertion to confirm it fails. If a test passes no matter what, the mock is misconfigured and the test is worthless.

## Execution Loop

1. **Write tests** targeting the specified code
2. **Run tests** and examine results
3. **Fix infrastructure issues** (imports, configuration, mock setup) — not the code under test
4. **Verify tests can fail** — break an assertion, confirm it turns red
5. **Iterate** until all tests pass and each test actually validates something
6. **Report results**: pass/fail counts, what is covered, any flaky warnings

## Output Format

```
## Tests Written

### [test-file-path]
- [test name]: [what it verifies]
- [test name]: [what it verifies]

## Test Results
[pass/fail summary, failure details if any]

## Coverage Impact
[which previously uncovered code paths are now tested]
```

For testing patterns for async code, hooks, API routes, and database queries, see `references/testing-patterns.md`. For copy-paste mock setups, see `references/mock-recipes.md`.
