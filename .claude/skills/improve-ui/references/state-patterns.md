# React State Patterns

## Loading States with Suspense

### Route-Level Loading (Next.js)
```typescript
// app/explore/loading.tsx
export default function ExploreLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <ExtensionCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ExtensionCardSkeleton matches the real card's dimensions
function ExtensionCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-3 animate-pulse">
      <div className="h-5 w-2/3 bg-muted rounded" />
      <div className="h-4 w-full bg-muted rounded" />
      <div className="h-4 w-4/5 bg-muted rounded" />
      <div className="flex gap-2 mt-4">
        <div className="h-6 w-16 bg-muted rounded-full" />
        <div className="h-6 w-16 bg-muted rounded-full" />
      </div>
    </div>
  );
}
```

### Component-Level Suspense
```typescript
// Wrap individual async sections, not the entire page
export default async function ExplorePage() {
  return (
    <div>
      <SearchBar />
      <Suspense fallback={<ExtensionGridSkeleton />}>
        <ExtensionGrid />
      </Suspense>
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategorySidebar />
      </Suspense>
    </div>
  );
}
```

## Error Boundaries (Next.js)

```typescript
// app/explore/error.tsx
'use client';

export default function ExploreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to load extensions</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {error.message || 'Something went wrong while loading the extension catalog.'}
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
```

## Empty States

```typescript
// Reusable empty state component
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; href: string } | { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {action && (
        'href' in action
          ? <Button asChild><Link href={action.href}>{action.label}</Link></Button>
          : <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

// Usage for different contexts
<EmptyState
  icon={Package}
  title="No extensions found"
  description="Try adjusting your search or browse all categories."
  action={{ label: "Browse All", href: "/explore" }}
/>

<EmptyState
  icon={Upload}
  title="No extensions published yet"
  description="Share your first extension with the community."
  action={{ label: "Publish Extension", href: "/publish" }}
/>

<EmptyState
  icon={Download}
  title="No installations yet"
  description="Discover extensions to supercharge your workflow."
  action={{ label: "Explore Extensions", href: "/explore" }}
/>
```

## Mutation Feedback

### Form Submission with Loading
```typescript
'use client';

function PublishForm() {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await publishExtension(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Extension published successfully!');
        router.push(`/extensions/${result.slug}`);
      }
    });
  }

  return (
    <form action={handleSubmit}>
      {/* form fields */}
      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Publishing...
          </>
        ) : (
          'Publish Extension'
        )}
      </Button>
    </form>
  );
}
```

### Optimistic Updates
```typescript
'use client';

function DownloadButton({ extensionSlug, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    setCount(c => c + 1); // Optimistic

    try {
      const { downloadUrl } = await downloadExtension(extensionSlug);
      window.open(downloadUrl);
    } catch (error) {
      setCount(c => c - 1); // Revert on failure
      toast.error('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Button onClick={handleDownload} disabled={isDownloading}>
      {isDownloading ? 'Downloading...' : `Download (${count})`}
    </Button>
  );
}
```

## Partial Data / Graceful Degradation

```typescript
// Show what loaded, handle missing pieces gracefully
function ExtensionDetail({ extension }: { extension: Extension }) {
  return (
    <div>
      <h1>{extension.displayName || extension.name}</h1>
      <p>{extension.description}</p>

      {/* Publisher info might fail to load */}
      <Suspense fallback={<PublisherBadgeSkeleton />}>
        <PublisherBadge publisherId={extension.publisherId} />
      </Suspense>

      {/* README might be missing */}
      {extension.readmeHtml ? (
        <div dangerouslySetInnerHTML={{ __html: extension.readmeHtml }} />
      ) : (
        <p className="text-muted-foreground italic">No README provided.</p>
      )}

      {/* Versions list is non-critical */}
      <Suspense fallback={<VersionListSkeleton />}>
        <VersionList extensionId={extension.id} />
      </Suspense>
    </div>
  );
}
```
