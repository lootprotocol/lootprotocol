# Quick Self-Review Checklist

Run through this before requesting a human code review. Each item takes seconds to verify.

## Correctness
- [ ] Traced through the main code path with a concrete example
- [ ] Checked null/undefined handling on optional values
- [ ] Verified boolean conditions are correct (no accidental negation)
- [ ] All async functions are properly awaited
- [ ] Error paths return appropriate status codes / error types

## Security
- [ ] No hardcoded secrets, tokens, or credentials
- [ ] User input is validated before use
- [ ] SQL queries use parameterized placeholders
- [ ] No `dangerouslySetInnerHTML` with user content
- [ ] Error responses do not leak internal details

## Edge Cases
- [ ] Empty input handled (empty array, empty string, null)
- [ ] List endpoints have pagination (LIMIT / max results)
- [ ] Forms handle concurrent submissions (disabled button, debounce)
- [ ] File uploads have size limits

## Code Quality
- [ ] No `any` types without a comment explaining why
- [ ] Names describe WHAT, not HOW (`getUserOrders` not `fetchData`)
- [ ] No commented-out code left in
- [ ] No console.log debugging statements left in
- [ ] New dependencies are justified (checked `package.json`)

## Testing
- [ ] New logic has at least one test for the happy path
- [ ] At least one error path is tested
- [ ] Tests describe behavior, not implementation

## UI (if applicable)
- [ ] Loading state exists for async data
- [ ] Error state exists with recovery action
- [ ] Empty state exists for lists
- [ ] Interactive elements are keyboard accessible
- [ ] Text is readable on mobile (no horizontal scroll)
