# Testing Patterns

## Async Code

### Testing async functions
```typescript
describe('getExtensionBySlug', () => {
  it('returns the extension when it exists', async () => {
    // Arrange
    await insertTestExtension({ slug: 'my-skill', name: 'My Skill' });

    // Act
    const result = await getExtensionBySlug('my-skill');

    // Assert
    expect(result).toMatchObject({
      slug: 'my-skill',
      name: 'My Skill',
    });
  });

  it('returns null when extension does not exist', async () => {
    const result = await getExtensionBySlug('nonexistent');
    expect(result).toBeNull();
  });
});
```

### Testing rejected promises
```typescript
it('throws ValidationError when archive is too large', async () => {
  const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB, exceeds 5MB limit

  await expect(
    validateSkillArchive(oversizedBuffer)
  ).rejects.toThrow(ValidationError);

  // Or check specific message:
  await expect(
    validateSkillArchive(oversizedBuffer)
  ).rejects.toThrow('Archive exceeds 5MB limit');
});
```

### Testing timeouts / delays
```typescript
// Use fake timers for time-dependent code
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('retries after 1 second delay on failure', async () => {
  const mockFetch = vi.fn()
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 'ok' }) });

  const promise = fetchWithRetry('/api/test', { fetch: mockFetch });

  // Fast-forward past the retry delay
  await vi.advanceTimersByTimeAsync(1000);

  const result = await promise;
  expect(result.data).toBe('ok');
  expect(mockFetch).toHaveBeenCalledTimes(2);
});
```

## React Components (Testing Library)

### Basic component test
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ExtensionCard', () => {
  const defaultProps = {
    extension: {
      slug: 'my-skill',
      displayName: 'My Skill',
      description: 'A test skill',
      downloadCount: 42,
      extensionType: 'skill' as const,
    },
  };

  it('renders extension name and description', () => {
    render(<ExtensionCard {...defaultProps} />);

    expect(screen.getByText('My Skill')).toBeInTheDocument();
    expect(screen.getByText('A test skill')).toBeInTheDocument();
  });

  it('displays download count', () => {
    render(<ExtensionCard {...defaultProps} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('links to extension detail page', () => {
    render(<ExtensionCard {...defaultProps} />);
    const link = screen.getByRole('link', { name: /my skill/i });
    expect(link).toHaveAttribute('href', '/extensions/my-skill');
  });
});
```

### Testing user interactions
```typescript
describe('SearchBar', () => {
  it('calls onSearch when user types', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole('searchbox');
    await user.type(input, 'code review');

    // Depending on debounce, check the final call
    expect(onSearch).toHaveBeenLastCalledWith('code review');
  });

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole('searchbox');
    await user.type(input, 'something');

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(input).toHaveValue('');
    expect(onSearch).toHaveBeenLastCalledWith('');
  });
});
```

### Testing forms
```typescript
describe('PublishForm', () => {
  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    render(<PublishForm />);

    // Submit without filling required fields
    await user.click(screen.getByRole('button', { name: /publish/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/description is required/i)).toBeInTheDocument();
  });

  it('disables submit button while publishing', async () => {
    const user = userEvent.setup();
    render(<PublishForm />);

    // Fill form
    await user.type(screen.getByLabelText(/name/i), 'my-skill');
    await user.type(screen.getByLabelText(/description/i), 'A great skill');

    const submitButton = screen.getByRole('button', { name: /publish/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/publishing/i)).toBeInTheDocument();
  });
});
```

## API Route Handlers

### Testing Next.js route handlers
```typescript
import { POST } from '@/app/api/extensions/route';
import { NextRequest } from 'next/server';

function createMockRequest(body: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/extensions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

describe('POST /api/extensions', () => {
  it('returns 401 when no auth token provided', async () => {
    const req = createMockRequest({ name: 'test' });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when body is invalid', async () => {
    const req = createMockRequest(
      { name: '' }, // empty name
      { Authorization: 'Bearer valid-token' }
    );
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates extension and returns 201', async () => {
    const req = createMockRequest(
      { name: 'my-skill', description: 'A skill', extensionType: 'skill', category: 'dev' },
      { Authorization: 'Bearer valid-token' }
    );
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.slug).toBe('my-skill');
  });
});
```

## Database Query Functions

### Testing with a real test database
```typescript
import { Pool } from 'pg';
import { createExtension, getExtensionBySlug } from '@/lib/db/queries/extensions';

let pool: Pool;

beforeAll(() => {
  pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // Clean tables before each test
  await pool.query('DELETE FROM extensions');
  await pool.query('DELETE FROM profiles');
});

describe('createExtension', () => {
  it('inserts extension and returns it with generated UUID', async () => {
    const publisher = await createTestProfile(pool);

    const extension = await createExtension(pool, {
      name: 'test-skill',
      description: 'A test skill',
      extensionType: 'skill',
      category: 'development',
      publisherId: publisher.id,
    });

    expect(extension.id).toBeDefined();
    expect(extension.slug).toBe('test-skill');
    expect(extension.publisherId).toBe(publisher.id);
  });

  it('rejects duplicate slugs', async () => {
    const publisher = await createTestProfile(pool);
    const data = {
      name: 'duplicate',
      description: 'First',
      extensionType: 'skill' as const,
      category: 'dev',
      publisherId: publisher.id,
    };

    await createExtension(pool, data);

    await expect(
      createExtension(pool, { ...data, description: 'Second' })
    ).rejects.toThrow(/unique/i);
  });
});
```

## Error Boundaries

### Testing error boundary behavior
```typescript
// Suppress console.error for expected errors in tests
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  consoleSpy.mockRestore();
});

it('renders error UI when child component throws', () => {
  function BrokenComponent() {
    throw new Error('Test error');
  }

  render(
    <ErrorBoundary fallback={<p>Something went wrong</p>}>
      <BrokenComponent />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```
