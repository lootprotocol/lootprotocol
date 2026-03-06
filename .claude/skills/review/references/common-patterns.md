# Common Anti-Patterns by Framework

## TypeScript

### Type Safety
| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `any` type | Disables type checking entirely | Use `unknown` and narrow with type guards |
| Non-null assertion `!` | Hides potential null crashes | Handle the null case explicitly |
| Type assertion `as X` | Lies to the compiler | Use type guards or narrow properly |
| `// @ts-ignore` | Suppresses real errors | Fix the type error or use `@ts-expect-error` with comment |
| Enum for string unions | Generates runtime code unnecessarily | Use `type Status = 'active' \| 'inactive'` |

### Async/Await
| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Missing `await` | Promise resolves silently, errors lost | Always await promises that can reject |
| `await` in loop | Sequential when could be parallel | Use `Promise.all(items.map(...))` |
| `.then().catch()` mixed with `await` | Inconsistent error handling | Stick to `try/catch` with `await` |
| Catching and re-throwing unchanged | Pointless try/catch | Only catch if you handle or transform the error |
| Floating promises in event handlers | Unhandled rejections crash the process | Wrap in async IIFE or add `.catch()` |

### General
| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Mutable default parameters | Shared reference across calls | Use `= undefined` and create inside function |
| Index signatures `[key: string]: any` | No type safety on access | Use `Record<string, T>` or `Map<string, T>` |
| `Object.keys()` returns `string[]` | Loses key type information | Use `(Object.keys(obj) as Array<keyof typeof obj>)` or iterate entries |
| Optional chaining without fallback | `undefined` propagates silently | Provide default: `obj?.name ?? 'Unknown'` |

## React / Next.js

### Component Patterns
| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Everything is `"use client"` | Loses server-side rendering benefits | Default to server components; only add `"use client"` for interactivity |
| `useEffect` for data fetching | Race conditions, loading states, no SSR | Use server components or React Query/SWR |
| State for derived values | Extra re-renders, stale derived state | Compute during render: `const total = items.reduce(...)` |
| Props drilling 3+ levels | Tight coupling, hard to refactor | Use context, composition, or restructure components |
| `key={index}` on dynamic lists | Wrong items update on reorder/delete | Use stable unique IDs from data |
| Inline object/array as props | New reference every render, breaks memo | Define outside component or useMemo |
| `useEffect` with missing deps | Stale closures, subtle bugs | Include all deps, or restructure to avoid the effect |

### Next.js App Router
| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `fetch('/api/...')` from server component | Unnecessary network hop | Call the data function directly in server component |
| Client component for static content | Larger JS bundle, no SSR | Keep as server component |
| Layout that fetches per-page data | Layouts are shared, data is not | Fetch in page.tsx, not layout.tsx |
| Missing `loading.tsx` | White screen during navigation | Add loading.tsx with skeleton matching layout |
| Missing `error.tsx` | Unhandled errors show Next.js default | Add error.tsx with retry action |

## Node.js / API

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Synchronous file reads in request handlers | Blocks event loop | Use `fs.promises` or streaming |
| `JSON.parse()` without try/catch | Crashes on malformed input | Wrap in try/catch with 400 response |
| String concatenation in SQL | SQL injection vulnerability | Use parameterized queries: `$1, $2` |
| Returning full database rows to client | Leaks internal fields (IDs, timestamps) | Map to response DTOs |
| No request body size limit | Memory exhaustion DoS | Set `bodyParser.json({ limit: '1mb' })` |
| Logging sensitive data | Credential/PII exposure | Redact tokens, passwords, emails in logs |
| `process.exit()` in library code | Kills the entire process | Throw errors, let the caller decide |

## SQL / Database

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `SELECT *` | Returns unnecessary columns, breaks on schema change | List specific columns |
| N+1 queries | 1 query for list + N queries for details | Use JOINs or batch queries |
| Missing indexes on foreign keys | Slow JOINs and WHERE clauses | Add indexes on all FK columns |
| No pagination on list queries | Returns unbounded results | Always use LIMIT/OFFSET or cursor |
| `COUNT(*)` as separate query | Two round-trips for paginated lists | Use `COUNT(*) OVER()` window function |
| Transactions for single operations | Unnecessary overhead | Only wrap multi-statement operations |
