# Before/After UI Improvement Examples

## Example 1: Extension List — Missing States

### Before
```tsx
function ExtensionList({ extensions }: { extensions: Extension[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {extensions.map(ext => (
        <ExtensionCard key={ext.id} extension={ext} />
      ))}
    </div>
  );
}
```

**Problems:**
- No loading state (blank screen while fetching)
- No empty state (renders empty grid when no results)
- No error handling
- Fixed 3-column grid breaks on mobile
- No skeleton placeholder

### After
```tsx
function ExtensionList({ extensions, isLoading, error }: ExtensionListProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Failed to load extensions</p>
        <p className="text-muted-foreground mt-1">{error.message}</p>
        <Button variant="outline" className="mt-4" onClick={error.retry}>
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <ExtensionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (extensions.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Package className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-lg font-medium">No extensions found</p>
        <p className="text-muted-foreground mt-1">
          Try adjusting your search or browse all categories.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {extensions.map(ext => (
        <ExtensionCard key={ext.id} extension={ext} />
      ))}
    </div>
  );
}
```

**Improvements:**
- Loading: skeleton grid matching real layout shape
- Empty: helpful message with guidance
- Error: actionable message with retry button
- Responsive: 1 column on mobile, 2 on tablet, 3 on desktop
- Accessible: `aria-busy` on loading state

---

## Example 2: Download Button — No Feedback

### Before
```tsx
function DownloadButton({ slug }: { slug: string }) {
  return (
    <button onClick={() => fetch(`/api/extensions/${slug}/download`, { method: 'POST' })}>
      Download
    </button>
  );
}
```

**Problems:**
- No loading state during download request
- No success/failure feedback
- `<button>` has no accessible name for icon-only variant
- No disabled state to prevent double-clicks
- Raw `fetch` with no error handling

### After
```tsx
function DownloadButton({ slug, downloadCount }: DownloadButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleDownload() {
    if (state === 'loading') return;
    setState('loading');

    try {
      const res = await fetch(`/api/extensions/${slug}/download`, { method: 'POST' });
      if (!res.ok) throw new Error('Download failed');
      const { url } = await res.json();

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.click();

      setState('success');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={state === 'loading'}
      variant={state === 'error' ? 'destructive' : 'default'}
      aria-label={`Download extension (${downloadCount} downloads)`}
    >
      {state === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
      {state === 'success' && <Check className="mr-2 h-4 w-4" aria-hidden />}
      {state === 'error' && <X className="mr-2 h-4 w-4" aria-hidden />}
      {state === 'loading' ? 'Downloading...' :
       state === 'success' ? 'Downloaded!' :
       state === 'error' ? 'Failed — Retry' :
       `Download (${downloadCount})`}
    </Button>
  );
}
```

**Improvements:**
- Loading: spinner and "Downloading..." text, button disabled
- Success: checkmark with "Downloaded!" confirmation
- Error: red button with "Failed — Retry" action
- Accessible: descriptive aria-label, disabled state, icon hidden from SR
- Double-click prevention: disabled during loading

---

## Example 3: Search Input — Accessibility

### Before
```tsx
function SearchBar() {
  const [query, setQuery] = useState('');
  return (
    <div>
      <input
        placeholder="Search extensions..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
    </div>
  );
}
```

**Problems:**
- No label (screen readers announce nothing useful)
- No search icon or visual affordance
- No keyboard shortcut hint
- No clear button for entered text
- No loading indicator during search

### After
```tsx
function SearchBar({ onSearch, isSearching }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative" role="search" aria-label="Search extensions">
      <label htmlFor="extension-search" className="sr-only">
        Search extensions
      </label>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
      <Input
        ref={inputRef}
        id="extension-search"
        type="search"
        placeholder="Search extensions..."
        className="pl-10 pr-20"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onSearch(e.target.value);
        }}
        aria-busy={isSearching}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {query && (
          <button
            onClick={() => { setQuery(''); onSearch(''); }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs bg-muted rounded border text-muted-foreground">
          /
        </kbd>
      </div>
    </div>
  );
}
```

**Improvements:**
- Accessible: `<label>`, `role="search"`, `aria-label`, `aria-busy`
- Keyboard: "/" shortcut to focus, visible hint
- Clear button: appears when text is entered, with `aria-label`
- Loading indicator: `aria-busy` during search
- Visual: search icon, clear button, keyboard hint
