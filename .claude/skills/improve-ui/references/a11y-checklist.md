# Accessibility Checklist for React + Tailwind + shadcn/ui

## Semantic HTML

- [ ] Buttons use `<button>` or shadcn `<Button>`, not `<div onClick>`
- [ ] Links use `<a>` or Next.js `<Link>`, not `<span onClick>`
- [ ] Navigation sections use `<nav>` with `aria-label` if multiple navs exist
- [ ] Main content wrapped in `<main>`
- [ ] Page sections use `<section>` with headings
- [ ] Lists use `<ul>`/`<ol>` + `<li>`, not styled divs
- [ ] Headings follow hierarchy: `h1` -> `h2` -> `h3` (never skip levels)
- [ ] There is exactly one `<h1>` per page

## Forms

- [ ] Every input has an associated `<label>` (use `htmlFor` or wrap input in label)
- [ ] Required fields are indicated (not just by color)
- [ ] Error messages are linked to inputs via `aria-describedby`
- [ ] Form validation errors are announced to screen readers
- [ ] Submit button text describes the action ("Publish Extension", not just "Submit")
- [ ] Disabled inputs have `aria-disabled` and visual indication

```tsx
// Good: accessible form field
<div>
  <Label htmlFor="extension-name">Extension Name</Label>
  <Input
    id="extension-name"
    aria-describedby={error ? "name-error" : undefined}
    aria-invalid={!!error}
  />
  {error && (
    <p id="name-error" className="text-sm text-destructive mt-1" role="alert">
      {error}
    </p>
  )}
</div>
```

## Interactive Elements

- [ ] All interactive elements are focusable via Tab
- [ ] Focus order follows visual order (no unexpected tab jumps)
- [ ] Focus is visible: no `outline-none` without `focus-visible:ring-2`
- [ ] Custom components support keyboard: Enter/Space to activate, Escape to close
- [ ] Modals/dialogs trap focus (shadcn `<Dialog>` does this automatically)
- [ ] Dropdown menus support arrow keys (shadcn `<DropdownMenu>` handles this)

```tsx
// Good: focus styles with Tailwind
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">

// Bad: removes all focus indication
<button className="outline-none focus:outline-none">
```

## Images and Icons

- [ ] Informative images have descriptive `alt` text
- [ ] Decorative images have `alt=""`
- [ ] Icon-only buttons have `aria-label`
- [ ] Icon + text buttons: icon has `aria-hidden="true"` (text provides the label)

```tsx
// Icon-only button
<Button size="icon" aria-label="Delete extension">
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</Button>

// Icon + text button
<Button>
  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
  Download
</Button>
```

## Dynamic Content

- [ ] Loading states announced: `aria-busy="true"` on the loading region
- [ ] Toast notifications use `role="alert"` or `aria-live="polite"`
- [ ] Route changes announced (Next.js handles this, but verify)
- [ ] Expanding/collapsing sections use `aria-expanded`
- [ ] Tab panels use proper ARIA roles (shadcn `<Tabs>` handles this)

```tsx
// Loading region
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? <Skeleton /> : <Content />}
</div>
```

## Color and Contrast

- [ ] Normal text (< 18px): contrast ratio >= 4.5:1
- [ ] Large text (>= 18px bold or >= 24px): contrast ratio >= 3:1
- [ ] UI components and focus indicators: contrast ratio >= 3:1
- [ ] Information not conveyed by color alone (add icons, text, patterns)
- [ ] Links distinguishable from surrounding text (underline or non-color indicator)

### Tailwind Tips
- `text-muted-foreground` on `background`: verify contrast (often borderline)
- `text-primary` on `background`: usually safe
- `text-destructive` for errors: add an icon too, not just red text
- Use browser DevTools contrast checker or axe extension

## Responsive Accessibility

- [ ] Touch targets minimum 44x44px on mobile
- [ ] Text resizable to 200% without loss of content
- [ ] No horizontal scrolling at 320px width
- [ ] Content reflows in a single column on small screens

## Testing Approach

1. **Keyboard-only test**: navigate the entire page using only Tab, Enter, Space, Escape, arrow keys
2. **Screen reader test**: use VoiceOver (macOS) or NVDA to verify announcement quality
3. **Zoom test**: zoom to 200% and verify layout does not break
4. **axe DevTools**: run the axe browser extension for automated checks
5. **Lighthouse**: check the Accessibility score (target 90+)
