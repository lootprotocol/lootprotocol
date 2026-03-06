---
name: document-decision
description: Captures architectural and design decisions as lightweight ADRs at the moment they are made. Triggers when significant design choices occur during implementation — choosing between approaches, introducing new patterns, selecting libraries, deviating from existing conventions, or making trade-off decisions. Records context, decision, alternatives, and consequences while reasoning is fresh.
user-invocable: false
---

# Architecture Decision Recording

Capture significant design decisions as lightweight ADRs (Architecture Decision Records) the moment they happen. Do not wait — context fades fast.

## When to Trigger

Record a decision when any of these occur during implementation:

- A library or tool is chosen over alternatives
- A design pattern is adopted or deviated from
- A non-obvious technical approach is selected
- A trade-off is explicitly discussed ("we could do X but chose Y because...")
- An existing convention is intentionally broken
- A significant "should we do X or Y?" conversation happens
- An infrastructure or deployment choice is made

Do NOT trigger for:
- Routine implementation choices (variable names, minor code structure)
- Formatting or style decisions (covered by linter config)
- Obvious best practices that need no justification

## ADR Format

Create or append to `docs/decisions/NNNN-short-title.md`:

```markdown
# NNNN. Short Decision Title

**Date**: YYYY-MM-DD
**Status**: Accepted

## Context

What is the situation? What problem are we solving? What forces are at play?
(2-3 sentences. Explain to someone who was not in the room.)

## Decision

What did we decide? (1-2 sentences, stated as a fact.)

"Use Prisma as the ORM for database access."
"Store JWT tokens in HTTP-only cookies for web clients."

## Alternatives Considered

- **Alternative A**: brief description. Rejected because [specific reason].
- **Alternative B**: brief description. Rejected because [specific reason].

Only list alternatives that were genuinely considered. Do not pad with strawman options.

## Consequences

- **Positive**: what becomes easier or better as a result
- **Negative**: what becomes harder or worse (every decision has trade-offs — if you cannot identify a downside, you have not thought hard enough)
- **Neutral**: what changes but is neither better nor worse
```

## File Organization

- Location: `docs/decisions/` directory in the project root
- Numbering: sequential four-digit prefix: `0001`, `0002`, `0003`
- Filename: `NNNN-short-kebab-title.md` (e.g., `0003-jwt-in-httponly-cookies.md`)
- If the `docs/decisions/` directory does not exist, create it
- Check existing files to determine the next number

## Writing Standards

- **Context**: write for someone who joins the team in 6 months. They were not here for the discussion. What would they need to know?
- **Decision**: state it definitively. "We will use X" not "We might consider X"
- **Alternatives**: be honest about why they were rejected. "Did not evaluate" is acceptable — it is honest
- **Consequences**: be candid about trade-offs. If choosing Prisma means slower raw queries, say so. If choosing cookies means no mobile app support, say so

## Status Values

- **Accepted**: the decision is in effect
- **Superseded by NNNN**: replaced by a later decision (link to it)
- **Deprecated**: the decision is no longer relevant

When a decision is superseded, update the old ADR's status — do not delete it. The history of decisions is valuable.

For example ADRs showing the right level of detail, see `references/adr-examples.md`. For a blank template, see `assets/adr-template.md`.
