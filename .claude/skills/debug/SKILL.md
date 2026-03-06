---
name: debug
description: Applies systematic debugging methodology to identify and fix root causes. Use when the user reports a bug, encounters an error, sees unexpected behavior, says "this isn't working", "why is this happening?", pastes an error message or stack trace, or describes something behaving differently than expected.
---

# Systematic Debugging

Debug by methodology, not by guessing. Follow the structured approach: Reproduce, Isolate, Identify Root Cause, Fix, Verify. Every step builds on the previous one.

## Step 1: Capture the Problem

Before touching code, establish clarity:

- **Expected behavior**: what SHOULD happen?
- **Actual behavior**: what IS happening? (exact error message, wrong output, crash, hang)
- **When did it start?** Recent code change? New dependency? Environment change?

Classify the problem:
| Category | Characteristics |
|----------|----------------|
| Crash/Exception | Stack trace, error code, process exits |
| Wrong Output | Code runs but produces incorrect results |
| Performance | Slow response, high memory, timeout |
| Intermittent | Works sometimes, fails other times |
| Build/Compile | TypeScript errors, missing modules, config issues |
| Environment | Works locally, fails in staging/production |

## Step 2: Reproduce

Cannot debug what cannot be reproduced. Find the minimal steps:

- **API errors**: reproduce with `curl` or a minimal fetch call. Check request headers, body, and auth token
- **UI bugs**: identify the exact click sequence. What page state triggers it?
- **Server crashes**: check logs first (`console.error`, CloudWatch, process stderr)
- **Intermittent bugs**: identify environmental conditions — timing, data state, request order, concurrent users

If the bug cannot be reproduced: add targeted logging at suspected failure points, then trigger the flow again. Do not guess blindly.

## Step 3: Isolate

Narrow down WHERE the bug is. Use binary search on the problem space:

### Trace the Data Flow
For wrong output, follow the data from source to destination. At each transformation point, check: is the value correct here? Find the first point where it becomes wrong.

```
Input → [Parse] → [Validate] → [Transform] → [Query DB] → [Format] → Output
  ✓         ✓          ✓            ✗ BUG IS HERE
```

### Read Stack Traces Bottom-to-Top
The root cause is usually NOT at the top of the stack trace. Read from the bottom (your code's entry point) upward. The transition from your code to library code often reveals the mistake.

### Diff Environments
For "works locally, fails in production" bugs:
- Environment variables: missing, different value, wrong format
- Node/runtime version differences
- Dependency version differences (`package-lock.json` in sync?)
- Database state: different data, missing migrations
- Network: CORS, DNS, firewall, VPC security groups

### Check Recent Changes
```bash
git log --oneline -20        # What changed recently?
git diff HEAD~5              # What is different from 5 commits ago?
git bisect                   # Binary search through commit history
```

## Step 4: Identify Root Cause (Five Whys)

Distinguish the symptom from the cause. Apply Five Whys:

> "The API returns 500"
> → Why? The database query fails
> → Why? The column `display_name` does not exist
> → Why? The migration was not run
> → Why? The deploy script skips migrations on hotfix branches
> → **ROOT CAUSE**: Deploy script conditionally skips migrations

Common root cause categories:

| Category | Examples |
|----------|---------|
| **State** | Stale closure, missing useEffect dependency, race condition |
| **Data Flow** | Wrong prop threading, missing null check, incorrect type coercion |
| **Environment** | Missing env var, wrong DB URL, CORS misconfiguration |
| **Timing** | Missing `await`, async operations completing out of order |
| **Type Mismatch** | Runtime type differs from TypeScript type (string "5" vs number 5) |
| **Dependency** | Breaking change in updated package, version conflict |

## Step 5: Fix and Verify

### Fix the Root Cause, Not the Symptom
If the root cause is "deploy script skips migrations," fix the deploy script — do not add a column existence check as a workaround.

### Write a Regression Test
Write a test that:
1. Fails WITHOUT the fix (reproduces the bug)
2. Passes WITH the fix (proves the fix works)
This prevents the same bug from returning.

### Check for the Same Pattern Elsewhere
Grep the codebase for the same mistake. If the bug was a missing `await`, search for other places where the same async function is called without `await`.

### Verify No Side Effects
Run the full test suite. Confirm the fix does not break other functionality.

## Output Format

```
## Bug Report

### Problem
[One-sentence description]

### Root Cause
[What actually went wrong and why — the deepest "why"]

### Fix
[What was changed, with file:line references]

### Regression Test
[Test that prevents recurrence, or why one is not needed]

### Related Risk
[Other places in the codebase where the same pattern might cause issues]
```

For common error messages and their typical root causes, see `references/error-patterns.md`. For debugging tool usage, see `references/debugging-tools.md`.
