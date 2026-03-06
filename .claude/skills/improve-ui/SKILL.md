---
name: improve-ui
description: Performs a systematic UI quality improvement pass on React/Next.js components. Use when the user asks to "improve UI", "fix accessibility", "make it responsive", "add loading states", "improve UX", "polish a component", "add error handling to the UI", or "make this accessible." Covers state completeness, accessibility, responsive design, and visual consistency.
---

# UI Improvement Pass

Systematically improve UI component quality. Not a redesign — improve what exists across four dimensions: state completeness, accessibility, responsive design, and visual consistency.

## Step 1: Component Analysis

Read the target component(s) and establish context:

- What data does it display? Where does the data come from?
- What user interactions does it support? (clicks, form inputs, navigation)
- What states can the component be in? (initial, loading, populated, error, empty)
- What design system is in use? Check imports for shadcn/ui, Tailwind utilities, custom component library

## Step 2: State Completeness Audit

This is the highest-impact dimension. For every component that depends on data:

### Required States
| State | What It Looks Like | Common Mistake |
|-------|-------------------|----------------|
| **Loading** | Skeleton/shimmer matching the layout shape | Using a centered spinner instead |
| **Empty** | Helpful message + call-to-action | Blank screen or "No data" |
| **Error** | Actionable message + retry button | "Something went wrong" with no recovery |
| **Partial** | Graceful degradation when some data loads | All-or-nothing rendering |
| **Success** | Confirmation for mutations (toast, inline) | No feedback after form submit |

### Checklist
- For every **list**: what renders with 0 items? 1 item? 1,000 items?
- For every **form**: loading state on submit button? Disabled during submission? Validation feedback inline?
- For every **async action**: optimistic update or loading indicator? What if it fails?
- For every **image**: what shows while loading? What if the image fails to load?

## Step 3: Accessibility Audit

### Semantic HTML
- Are interactive elements using correct tags? `<button>` not `<div onClick>`, `<a>` for navigation, `<nav>` for navigation sections
- Are headings hierarchical? `h1` → `h2` → `h3`, never skipping levels
- Are lists using `<ul>/<ol>` and `<li>`, not styled divs?
- Are form inputs associated with `<label>` elements?

### Keyboard Navigation
- Can every interactive element be reached via Tab?
- Is focus visible? (no `outline: none` without an alternative focus style)
- Is focus trapped in modals/dialogs? Does Escape close them?
- Do custom components (dropdowns, tabs) support arrow key navigation?

### Screen Reader Support
- Do images have descriptive `alt` text? (decorative images: `alt=""`)
- Do icon-only buttons have `aria-label`?
- Are dynamic content changes announced? (`aria-live` for notifications, loading status)
- Are expandable sections using `aria-expanded`?
- Are form errors linked to inputs via `aria-describedby`?

### Color and Contrast
- Text contrast meets WCAG AA: 4.5:1 for normal text, 3:1 for large text (18px+ bold)
- Information is not conveyed by color alone (add icons, text, or patterns)
- Focus indicators have sufficient contrast against the background

## Step 4: Responsive Design Check

Test at these breakpoints (or verify Tailwind responsive classes):

| Breakpoint | Target | Check |
|------------|--------|-------|
| 320px | Small phone | Nothing overflows, text is readable |
| 375px | iPhone | Primary layout works |
| 768px | Tablet | Sidebar collapses or adapts |
| 1024px | Laptop | Full layout functional |
| 1440px | Desktop | Content does not stretch uncomfortably wide |

### Common Issues
- Touch targets too small on mobile (minimum 44x44px)
- Tables that do not convert to cards or horizontal scroll on small screens
- Text that requires horizontal scrolling
- Fixed-width elements that overflow the viewport
- Navigation that does not collapse to a mobile menu

## Step 5: Visual Consistency Check

- **Spacing**: consistent use of the design system's spacing scale, not arbitrary pixel values
- **Typography**: heading sizes follow a hierarchy, body text is consistent, no orphaned text styles
- **Colors**: using design tokens or CSS variables, not hardcoded hex values
- **Borders, shadows, radii**: consistent with other components in the project
- **Icons**: consistent size, style, and alignment across the interface

## Output Format

```
## UI Improvement Report

### Current State
[Brief assessment of the component's quality before changes]

### Fixes Applied
#### State Completeness
- [what was added: loading skeleton, empty state, error boundary, etc.]

#### Accessibility
- [what was fixed: semantic HTML, keyboard nav, ARIA labels, etc.]

#### Responsive
- [what was adjusted: breakpoint behavior, touch targets, overflow, etc.]

#### Visual Consistency
- [what was aligned: spacing, typography, colors, etc.]

### Remaining Recommendations
[Things requiring design decisions — not auto-fixable]
```

For React state management patterns (Suspense, error boundaries), see `references/state-patterns.md`. For the full accessibility checklist, see `references/a11y-checklist.md`. For before/after examples, see `examples/before-after.md`.
