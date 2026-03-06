---
name: refactor
description: Performs safe, incremental refactoring that preserves behavior while improving code structure. Use when the user asks to "clean up", "simplify", "refactor", "extract", "rename", "reduce duplication", "improve code structure", or "make this more maintainable." Every change is behavior-preserving and verified.
---

# Safe Code Refactoring

Refactor incrementally with one clear goal per session. Every change preserves existing behavior. Tests run after every move.

## Pre-Refactoring Safety Check

Before changing anything:

1. **Run existing tests.** If tests fail, STOP. Do not refactor broken code — fix the bugs first
2. **If no tests exist** for the target code: write characterization tests first. These capture the current behavior (even if it has bugs). They protect against accidentally changing behavior during refactoring
3. **Identify the blast radius**: what other files import or depend on this code? Use grep for imports and references
4. **Note the current behavior**: run the code or trace through it mentally. After refactoring, behavior must be identical

## Identify ONE Refactoring Goal

Each session targets ONE structural problem. If multiple issues exist, address them in separate passes.

| Goal | When to Apply |
|------|--------------|
| **Extract duplication** | Same logic appears in 2+ places |
| **Reduce complexity** | Function has too many branches or nesting levels (>3 deep) |
| **Separate concerns** | One function/component does two unrelated things |
| **Improve naming** | Names do not communicate intent |
| **Simplify interface** | Too many parameters, confusing API surface |
| **Remove dead code** | Unreachable code, unused exports, commented-out blocks |
| **Flatten nesting** | Deep if/else chains or nested callbacks |

State the goal explicitly before starting: "Goal: extract duplicated validation logic from `createExtension` and `updateExtension` into a shared function."

## Incremental Change Process

Make the smallest possible change that moves toward the goal. After each change, run tests.

### Refactoring Moves

| Move | What It Does | When to Use |
|------|-------------|------------|
| **Extract Function** | Pull a block into a named function | Logic block has a clear purpose and is reusable or too long |
| **Extract Component** | Pull JSX + logic into a new component | UI section has its own state or is reusable |
| **Move to Module** | Relocate a function to a more appropriate file | Function is used by multiple files but lives in one |
| **Inline** | Replace a function call with its body | Abstraction adds no value (single caller, trivial logic) |
| **Rename** | Change a name to better communicate intent | Current name is misleading, too generic, or inconsistent |
| **Replace Conditional with Map/Polymorphism** | Convert if/switch chains to lookup objects or class hierarchies | Long switch/if chains mapping values to behavior |
| **Introduce Parameter Object** | Group related parameters into an object | Function takes more than 3 related parameters |
| **Guard Clauses** | Replace nested if/else with early returns | Deep nesting from multiple precondition checks |

### The Process

```
1. Make ONE small change (extract, rename, move, inline)
2. Run tests
   ├── Tests pass → continue to next change
   └── Tests fail → revert this change, try a different approach
3. Repeat until the goal is achieved
```

Never combine multiple refactoring moves in a single step. If extracting a function AND renaming it, do those as separate steps with test runs between them.

## What NOT to Do During Refactoring

- **No features.** Refactoring and feature work are separate activities. If you discover a missing feature, note it and move on
- **No bug fixes** (unless the bug IS the structural problem). File the bug separately
- **No formatting changes** mixed with structural changes. Formatting should be its own commit
- **No refactoring code you do not understand.** Read it first, write characterization tests, then refactor
- **No premature abstraction.** Do not extract a "reusable" utility from one usage. Wait for the second or third usage

## Output Format

```
## Refactoring Complete

### Goal
[What structural problem was addressed]

### Changes Applied
1. [Refactoring move]: [what changed and why]
2. [Refactoring move]: [what changed and why]

### Before → After
[Key code snippet showing the structural improvement]

### Test Results
[All tests pass. N tests run, N passed]

### Behavior Verification
[Confirmation that functionality is unchanged]
```

For the full catalog of refactoring moves with TypeScript examples, see `references/refactoring-catalog.md`. For code smell detection heuristics, see `references/code-smells.md`.
