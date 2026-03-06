# Code Smells — Detection Heuristics

## Size Smells

| Smell | Heuristic | Refactoring |
|-------|-----------|-------------|
| **Long function** | > 30 lines of logic (excluding comments/whitespace) | Extract Function |
| **Large file** | > 300 lines | Extract Module, Move to Module |
| **Long parameter list** | > 3 parameters | Introduce Parameter Object |
| **Deep nesting** | > 3 levels of indentation | Guard Clauses, Extract Function |
| **Large component** | React component > 150 lines | Extract Component |

## Duplication Smells

| Smell | Heuristic | Refactoring |
|-------|-----------|-------------|
| **Copy-paste code** | Same 3+ lines appear in 2+ places | Extract Function |
| **Similar conditionals** | Same if/switch structure in multiple places | Replace Conditional with Map/Polymorphism |
| **Repeated validation** | Same validation logic in multiple routes | Extract shared validation function |
| **Duplicated test setup** | Same 5+ lines of setup in multiple tests | Extract helper or use beforeEach |

## Naming Smells

| Smell | Heuristic | Refactoring |
|-------|-----------|-------------|
| **Generic name** | `data`, `result`, `item`, `temp`, `val`, `obj` | Rename to describe WHAT it holds |
| **Misleading name** | Name says X but code does Y | Rename to match actual behavior |
| **Inconsistent naming** | `getUser` in one file, `fetchUser` in another for same pattern | Rename for consistency |
| **Encoded type** | `userArray`, `nameString`, `isActiveBoolean` | Drop the type suffix: `users`, `name`, `isActive` |
| **Abbreviation** | `ext`, `usr`, `cfg`, `mgr` except in tiny scopes | Spell it out: `extension`, `user`, `config`, `manager` |

## Coupling Smells

| Smell | Heuristic | Refactoring |
|-------|-----------|-------------|
| **Feature envy** | Function accesses more data from another module than its own | Move function to the module it envies |
| **Inappropriate intimacy** | Module accesses internal details of another | Define a public interface, hide internals |
| **Middleman** | Module delegates everything to another without adding value | Inline the middleman |
| **Shotgun surgery** | Changing one behavior requires editing 5+ files | Consolidate related logic |

## Abstraction Smells

| Smell | Heuristic | Refactoring |
|-------|-----------|-------------|
| **Premature abstraction** | Utility/helper created from 1 usage | Inline until 2-3 usages exist |
| **Wrong abstraction** | Abstraction requires special cases or flags for different callers | Inline and re-extract with better boundaries |
| **Dead code** | Functions never called, imports never used, commented-out blocks | Delete it (git has history) |
| **Speculative generality** | Parameters, config, or flexibility nobody uses | Remove unused flexibility |

## React-Specific Smells

| Smell | Heuristic | Refactoring |
|-------|-----------|-------------|
| **God component** | Component manages state, fetches data, handles events, renders complex UI all in one | Extract hooks for logic, components for UI sections |
| **Prop drilling** | Same prop passed through 3+ components without being used | Use context or restructure component tree |
| **useEffect for derived data** | `useEffect` that sets state based on other state | Compute during render instead |
| **Stale closure** | useEffect/useCallback missing dependency | Add missing deps or restructure |
| **Render in render** | Component defined inside another component | Move to module level or use useMemo |

## How to Use This List

1. **Do not hunt for smells proactively** during feature development. That is refactoring work, not feature work.
2. **Notice smells as you work**. If you are editing a function and notice it is 50 lines, that is a signal.
3. **Fix only what is in your path**. If the smell is in code you are already changing, fix it. If it is elsewhere, note it for later.
4. **One smell at a time**. Do not try to fix every smell in a file at once. Pick the most impactful one.
5. **Verify the smell is real**. A 40-line function that is clear and linear is better than three 15-line functions with indirection. Size alone is not sufficient — clarity matters more.
