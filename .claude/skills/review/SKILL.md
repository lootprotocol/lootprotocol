---
name: review
description: Performs structured multi-dimensional code review. Use when the user asks to "review code", "check a PR", "look over changes", "find issues", or asks "is this code good?" Analyzes correctness, architecture, security, edge cases, error handling, naming, and testability. Always use this skill for any code review request, even partial reviews.
---

# Code Review

Perform a structured, multi-dimensional code review that catches what linters miss: logic errors, architectural drift, missing edge cases, and maintainability issues.

## Scope Determination

Determine what to review based on the argument or context:

- **File or directory path**: review that code directly
- **PR number**: fetch diff via `gh pr diff <number>` and review the changes
- **Git range** (e.g., `HEAD~3`): review via `git diff <range>`
- **No argument**: review staged changes via `git diff --cached`, falling back to `git diff`

Before reviewing, gather context: read the changed files fully (not just the diff), understand what the code is supposed to do, and check how it fits into the surrounding codebase.

## Review Dimensions

Analyze the code across these six dimensions. For each, ask the specific questions listed.

### 1. Correctness
- Does the code do what it claims? Trace through the logic mentally with concrete inputs
- Off-by-one errors in loops, array indexing, string slicing
- Null/undefined paths: what if an optional value is actually absent?
- Boolean logic: are conditions correct? Are De Morgan's laws applied properly?
- Missing return statements or early exits
- Race conditions in async code: can two operations interleave?
- Type coercion bugs: `==` vs `===`, string "0" vs number 0

### 2. Architecture
- Does this change fit existing codebase patterns? If not, is the deviation justified?
- Is the abstraction level right? Too abstract (premature indirection) or too concrete (duplication)?
- Coupling: does this module depend on internals of another module?
- Cohesion: does each function/class have a single, clear responsibility?
- Is this the right file/directory for this code?

### 3. Edge Cases
- Empty inputs: empty arrays, empty strings, null, undefined
- Boundary values: 0, -1, MAX_SAFE_INTEGER, empty objects
- Network failures: what happens if an API call times out or returns 500?
- Concurrent access: can this be called simultaneously from multiple places?
- Extremely large inputs: will this blow up with 10,000 items?

### 4. Error Handling
- Are errors caught at the right layer? Not too early (swallowing), not too late (crashing)
- Are error messages actionable? Could a developer or user understand what went wrong?
- Is there silent error swallowing? (`catch(e) {}` or `.catch(() => {})`)
- Are async errors properly awaited? Missing `await` on a promise that might reject?
- Do error responses leak internal details (stack traces, SQL queries, file paths)?

### 5. Naming & Readability
- Do names describe what things ARE, not how they work? (`userAge` not `calculatedValue`)
- Are names consistent with the rest of the codebase?
- Can a new developer understand this code in 30 seconds?
- Are there magic numbers or strings that should be named constants?
- Is the code self-documenting, or does it need comments to explain non-obvious logic?

### 6. Testability
- Could each public function be unit tested in isolation?
- Are dependencies injectable or is the code tightly coupled to globals/singletons?
- Are side effects separated from pure logic?
- Is there any untestable code (complex conditionals hidden inside large functions)?

## Output Format

Structure the review output as follows:

```
## Review Summary
[1-2 sentence overall assessment: quality level, key concern, or stamp of approval]

## Critical Issues
[Must fix. Each item: file:line, what is wrong, why it matters, concrete fix]

## Suggestions
[Would improve quality. Each item: file:line, what could be better, specific alternative]

## Positive Callouts
[What is done well. Reinforce good patterns. Be specific.]
```

Every issue must reference a specific **file:line** and include a **concrete fix suggestion** — not just "consider improving." If there are no critical issues, say so explicitly.

## Review Philosophy

- Assume the author is smart. Explain WHY something is a problem, not just THAT it is
- Distinguish preference from correctness. Only flag as "Critical" things that are objectively wrong or dangerous
- One actionable suggestion per issue. No vague "this could be better"
- Acknowledge good work. Positive callouts reinforce patterns worth repeating
- Read the full context before judging. A line that looks wrong in isolation may make sense in context

For detailed anti-pattern catalogs and a quick self-review checklist, see `references/common-patterns.md` and `references/review-checklist.md`.
