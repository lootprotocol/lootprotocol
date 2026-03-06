# Refactoring Catalog

## Extract Function

**When:** A block of code has a clear purpose and is either reusable or making the parent function too long.

**Before:**
```typescript
async function publishExtension(data: PublishInput) {
  // Validate archive
  const buffer = await readFile(data.archivePath);
  if (buffer.length > MAX_SIZE) throw new ValidationError('Too large');
  const entries = await extractArchive(buffer);
  const skillMd = entries.find(e => e.name === 'SKILL.md');
  if (!skillMd) throw new ValidationError('Missing SKILL.md');
  const frontmatter = parseFrontmatter(skillMd.content);
  if (!frontmatter.description) throw new ValidationError('Missing description');

  // Upload to S3
  const key = `${data.slug}/${data.version}.tar.gz`;
  await s3.putObject({ Bucket: BUCKET, Key: key, Body: buffer });

  // Save to database
  return await createExtension(pool, { ...data, s3Key: key });
}
```

**After:**
```typescript
async function publishExtension(data: PublishInput) {
  const buffer = await readFile(data.archivePath);
  await validateSkillArchive(buffer);

  const s3Key = await uploadPackage(data.slug, data.version, buffer);

  return await createExtension(pool, { ...data, s3Key });
}

async function validateSkillArchive(buffer: Buffer): Promise<void> {
  if (buffer.length > MAX_SIZE) throw new ValidationError('Too large');
  const entries = await extractArchive(buffer);
  const skillMd = entries.find(e => e.name === 'SKILL.md');
  if (!skillMd) throw new ValidationError('Missing SKILL.md');
  const frontmatter = parseFrontmatter(skillMd.content);
  if (!frontmatter.description) throw new ValidationError('Missing description');
}

async function uploadPackage(slug: string, version: string, buffer: Buffer): Promise<string> {
  const key = `${slug}/${version}.tar.gz`;
  await s3.putObject({ Bucket: BUCKET, Key: key, Body: buffer });
  return key;
}
```

---

## Extract Component

**When:** A section of JSX has its own state or is reusable.

**Before:**
```tsx
function ExtensionPage({ extension }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <h1>{extension.name}</h1>
      <p>{extension.description}</p>

      {/* This section has its own state */}
      <div className="flex items-center gap-2 p-3 bg-muted rounded">
        <code>lootprotocol install {extension.slug}</code>
        <button onClick={() => {
          navigator.clipboard.writeText(`lootprotocol install ${extension.slug}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
```

**After:**
```tsx
function ExtensionPage({ extension }: Props) {
  return (
    <div>
      <h1>{extension.name}</h1>
      <p>{extension.description}</p>
      <InstallCommand slug={extension.slug} />
    </div>
  );
}

function InstallCommand({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const command = `lootprotocol install ${slug}`;

  function handleCopy() {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-muted rounded">
      <code>{command}</code>
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
}
```

---

## Rename

**When:** A name does not communicate intent.

**Before:**
```typescript
const data = await pool.query('SELECT * FROM extensions WHERE slug = $1', [s]);
const r = data.rows[0];
if (!r) return null;
return { id: r.id, name: r.name, desc: r.description };
```

**After:**
```typescript
const result = await pool.query('SELECT * FROM extensions WHERE slug = $1', [slug]);
const extension = result.rows[0];
if (!extension) return null;
return { id: extension.id, name: extension.name, description: extension.description };
```

---

## Guard Clauses (Flatten Nesting)

**When:** Deep nesting from multiple precondition checks.

**Before:**
```typescript
async function handleDownload(slug: string, userId: string | null) {
  if (userId) {
    const extension = await getExtensionBySlug(slug);
    if (extension) {
      if (extension.isPublished) {
        const url = await generatePresignedUrl(extension.s3Key);
        await recordDownload(extension.id, userId);
        return { url };
      } else {
        throw new ForbiddenError('Extension is not published');
      }
    } else {
      throw new NotFoundError('Extension not found');
    }
  } else {
    throw new UnauthorizedError('Authentication required');
  }
}
```

**After:**
```typescript
async function handleDownload(slug: string, userId: string | null) {
  if (!userId) throw new UnauthorizedError('Authentication required');

  const extension = await getExtensionBySlug(slug);
  if (!extension) throw new NotFoundError('Extension not found');
  if (!extension.isPublished) throw new ForbiddenError('Extension is not published');

  const url = await generatePresignedUrl(extension.s3Key);
  await recordDownload(extension.id, userId);
  return { url };
}
```

---

## Replace Conditional with Map

**When:** A switch/if chain maps values to behavior.

**Before:**
```typescript
function getMaxArchiveSize(type: ExtensionType): number {
  if (type === 'skill') return 5 * 1024 * 1024;
  if (type === 'mcp_server') return 50 * 1024 * 1024;
  if (type === 'plugin') return 100 * 1024 * 1024;
  throw new Error(`Unknown type: ${type}`);
}

function getRequiredFiles(type: ExtensionType): string[] {
  if (type === 'skill') return ['SKILL.md'];
  if (type === 'mcp_server') return ['mcp.json', 'README.md'];
  if (type === 'plugin') return ['.claude-plugin/plugin.json', 'README.md'];
  throw new Error(`Unknown type: ${type}`);
}
```

**After:**
```typescript
const EXTENSION_CONFIG: Record<ExtensionType, { maxSize: number; requiredFiles: string[] }> = {
  skill: { maxSize: 5 * 1024 * 1024, requiredFiles: ['SKILL.md'] },
  mcp_server: { maxSize: 50 * 1024 * 1024, requiredFiles: ['mcp.json', 'README.md'] },
  plugin: { maxSize: 100 * 1024 * 1024, requiredFiles: ['.claude-plugin/plugin.json', 'README.md'] },
};

function getMaxArchiveSize(type: ExtensionType): number {
  return EXTENSION_CONFIG[type].maxSize;
}

function getRequiredFiles(type: ExtensionType): string[] {
  return EXTENSION_CONFIG[type].requiredFiles;
}
```

---

## Introduce Parameter Object

**When:** A function takes more than 3 related parameters.

**Before:**
```typescript
async function listExtensions(
  search: string | undefined,
  category: string | undefined,
  type: ExtensionType | undefined,
  sort: SortOption,
  page: number,
  pageSize: number,
) { ... }

// Calling code is hard to read:
await listExtensions(undefined, 'development', 'skill', 'popular', 1, 20);
```

**After:**
```typescript
interface ListExtensionsOptions {
  search?: string;
  category?: string;
  type?: ExtensionType;
  sort: SortOption;
  page: number;
  pageSize: number;
}

async function listExtensions(options: ListExtensionsOptions) { ... }

// Calling code is self-documenting:
await listExtensions({ category: 'development', type: 'skill', sort: 'popular', page: 1, pageSize: 20 });
```

---

## Inline

**When:** An abstraction adds no value (single caller, trivial logic).

**Before:**
```typescript
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function formatSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

// Both used only once:
const slug = formatSlug(input.name);
if (!isValidSlug(slug)) throw new Error('Invalid slug');
```

**After (if truly single-use):**
```typescript
const slug = input.name.toLowerCase().replace(/\s+/g, '-');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid slug');
```

**Note:** Only inline if the function is truly single-use AND the logic is trivial. If the regex is used in multiple places, keep the function.

---

## Move to Module

**When:** A function is used by multiple files but lives in the wrong one.

**Signs it is in the wrong file:**
- Imported by 3+ files from a directory that is not its home
- Does not use any other function/state from its current file
- Its name suggests a different domain than its current file

**Process:**
1. Create the new file in the appropriate directory
2. Move the function (and its dependencies) to the new file
3. Update all import statements across the codebase
4. Run tests to verify nothing broke
