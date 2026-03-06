import type { Extension, ExtensionVersion, Profile } from '@lootprotocol/shared-types';

// ---------------------------------------------------------------------------
// Mock Publisher
// ---------------------------------------------------------------------------

export const MOCK_PUBLISHER: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  cognitoSub: 'mock-sub-123',
  username: 'test-publisher',
  email: 'test@example.com',
  authProvider: 'github',
  githubUsername: 'test-publisher',
  githubId: 12345,
  googleId: null,
  displayName: 'Test Publisher',
  avatarUrl: 'https://github.com/identicons/test.png',
  bio: 'A test publisher for local development',
  websiteUrl: null,
  role: 'publisher',
  createdAt: '2025-01-15T08:00:00.000Z',
  updatedAt: '2025-06-01T12:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Download records
// ---------------------------------------------------------------------------

export interface DownloadRecord {
  id: string;
  extensionId: string;
  versionId: string | null;
  userId: string;
  source: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

export const extensions: Map<string, Extension> = new Map();
export const versions: Map<string, ExtensionVersion[]> = new Map();
export const downloads: DownloadRecord[] = [];
export const publishers: Map<string, Profile> = new Map();

// ---------------------------------------------------------------------------
// Helper to build extension records
// ---------------------------------------------------------------------------

function ext(
  id: string,
  slug: string,
  name: string,
  displayName: string,
  description: string,
  extensionType: Extension['extensionType'],
  category: string,
  tags: string[],
  latestVersion: string,
  downloadCount: number,
  isFeatured: boolean,
  readmeText: string,
  createdAt: string,
  updatedAt: string,
): Extension {
  return {
    id,
    slug,
    name,
    displayName,
    description,
    extensionType,
    category,
    tags,
    latestVersion,
    readmeHtml: `<p>${readmeText}</p>`,
    readmeText,
    downloadCount,
    publisherId: MOCK_PUBLISHER.id,
    publisher: MOCK_PUBLISHER,
    isPublished: true,
    isFeatured,
    createdAt,
    updatedAt,
  };
}

function ver(
  id: string,
  extensionId: string,
  version: string,
  packageSizeBytes: number,
  changelog: string | null,
  downloadCount: number,
  createdAt: string,
): ExtensionVersion {
  return {
    id,
    extensionId,
    version,
    s3Key: `extensions/${extensionId}/${version}/package.tar.gz`,
    packageSizeBytes,
    metadata: { name: extensionId, version },
    changelog,
    downloadCount,
    createdAt,
  };
}

// ---------------------------------------------------------------------------
// Seed data - 10 sample extensions
// ---------------------------------------------------------------------------

const SEED_EXTENSIONS: Extension[] = [
  ext(
    'a0000000-0000-0000-0000-000000000001',
    'code-review',
    'code-review',
    'Code Review Assistant',
    'An AI-powered skill that reviews pull requests, identifies bugs, suggests improvements, and enforces coding standards automatically.',
    'skill',
    'development-tools',
    ['code-review', 'pull-request', 'linting', 'ai'],
    '2.1.0',
    15230,
    true,
    '# Code Review Assistant\n\nAutomatically review pull requests with AI-powered analysis.\n\n## Features\n- Bug detection\n- Style enforcement\n- Security vulnerability scanning\n- Performance suggestions\n\n## Usage\nAdd `code-review` to your Claude configuration and mention it in PR comments.',
    '2025-02-10T10:00:00.000Z',
    '2025-08-20T14:30:00.000Z',
  ),
  ext(
    'a0000000-0000-0000-0000-000000000002',
    'git-commit',
    'git-commit',
    'Git Commit Composer',
    'Generates meaningful, conventional-commit-style messages by analyzing staged changes and project history.',
    'skill',
    'development-tools',
    ['git', 'commit', 'conventional-commits', 'productivity'],
    '1.4.2',
    9870,
    true,
    '# Git Commit Composer\n\nNever write a commit message again. This skill analyzes your staged changes and generates conventional commit messages.\n\n## Supported Formats\n- Conventional Commits\n- Angular style\n- Custom templates\n\n## Configuration\n```json\n{ "format": "conventional", "maxLength": 72 }\n```',
    '2025-03-05T09:00:00.000Z',
    '2025-09-10T11:00:00.000Z',
  ),
  ext(
    'a0000000-0000-0000-0000-000000000003',
    'sql-navigator',
    'sql-navigator',
    'SQL Navigator',
    'An MCP server that connects to PostgreSQL, MySQL, and SQLite databases, enabling schema exploration, query building, and data analysis.',
    'mcp_server',
    'database-backend',
    ['sql', 'database', 'postgres', 'mysql', 'sqlite', 'mcp'],
    '3.0.1',
    7450,
    false,
    '# SQL Navigator\n\nConnect Claude to your databases via the Model Context Protocol.\n\n## Supported Databases\n- PostgreSQL 12+\n- MySQL 8+\n- SQLite 3\n\n## Tools Provided\n- `query` - Execute read-only SQL queries\n- `schema` - Explore database schema\n- `explain` - Analyze query execution plans\n\n## Security\nAll queries are executed in read-only transactions by default.',
    '2025-01-20T12:00:00.000Z',
    '2025-10-05T16:45:00.000Z',
  ),
  ext(
    'a0000000-0000-0000-0000-000000000004',
    'docker-helper',
    'docker-helper',
    'Docker Helper',
    'Assists with Dockerfile creation, docker-compose configuration, container debugging, and image optimization.',
    'skill',
    'devops-deployment',
    ['docker', 'containers', 'devops', 'dockerfile', 'compose'],
    '1.2.0',
    4320,
    false,
    '# Docker Helper\n\nYour AI-powered Docker companion.\n\n## Capabilities\n- Generate optimized Dockerfiles\n- Create docker-compose.yml configurations\n- Debug container issues\n- Suggest multi-stage build optimizations\n- Analyze image sizes\n\n## Example\nAsk Claude to "create a Dockerfile for a Node.js app with multi-stage build".',
    '2025-04-12T08:30:00.000Z',
    '2025-07-18T10:15:00.000Z',
  ),
  ext(
    'a0000000-0000-0000-0000-000000000005',
    'test-generator',
    'test-generator',
    'Test Generator',
    'Automatically generates unit tests, integration tests, and test fixtures by analyzing your source code and existing test patterns.',
    'skill',
    'testing-qa',
    ['testing', 'unit-tests', 'jest', 'vitest', 'tdd', 'coverage'],
    '2.0.0',
    11560,
    true,
    '# Test Generator\n\nGenerate comprehensive test suites with a single command.\n\n## Supported Frameworks\n- Jest\n- Vitest\n- Mocha\n- Pytest\n- Go testing\n\n## Features\n- Analyzes code to determine edge cases\n- Generates mocks and fixtures\n- Follows existing test patterns in your project\n- Coverage-aware: targets uncovered code paths\n\n## Usage\n```\nGenerate tests for src/utils/parser.ts\n```',
    '2025-02-28T15:00:00.000Z',
    '2025-11-01T09:20:00.000Z',
  ),
  ext(
    'a0000000-0000-0000-0000-000000000006',
    'api-designer',
    'api-designer',
    'API Designer',
    'An MCP server that helps design, document, and mock REST and GraphQL APIs with OpenAPI spec generation.',
    'mcp_server',
    'development-tools',
    ['api', 'openapi', 'graphql', 'rest', 'swagger', 'mcp'],
    '1.1.0',
    3210,
    false,
    '# API Designer\n\nDesign APIs conversationally and get production-ready specs.\n\n## Tools Provided\n- `design` - Create API endpoints interactively\n- `generate-spec` - Output OpenAPI 3.1 or GraphQL SDL\n- `mock` - Start a mock server for testing\n- `validate` - Check spec conformance\n\n## Output Formats\n- OpenAPI 3.1 (YAML/JSON)\n- GraphQL SDL\n- Postman Collection\n- Bruno Collection',
    '2025-05-15T11:00:00.000Z',
    '2025-08-30T13:00:00.000Z',
  ),
  ext(
    'a0000000-0000-0000-0000-000000000007',
    'security-scanner',
    'security-scanner',
    'Security Scanner',
    'A plugin that scans code for vulnerabilities, checks dependencies for CVEs, and suggests security best practices.',
    'plugin',
    'security',
    ['security', 'vulnerabilities', 'cve', 'dependencies', 'sast'],
    '1.3.5',
    6780,
    false,
    '# Security Scanner\n\nKeep your code secure with automated vulnerability detection.\n\n## Scan Types\n- **SAST**: Static analysis for common vulnerability patterns\n- **Dependency**: Check npm/pip/cargo dependencies against CVE databases\n- **Secrets**: Detect hardcoded secrets and API keys\n- **Config**: Audit configuration files for insecure settings\n\n## Integration\nRuns automatically on code changes or on demand.',
    '2025-03-22T07:00:00.000Z',
    '2025-10-15T08:30:00.000Z',
  ),
  ext(
    'a0000000-0000-0000-0000-000000000008',
    'ui-component-gen',
    'ui-component-gen',
    'UI Component Generator',
    'Generates React, Vue, and Svelte components from descriptions or design mockups, with Tailwind CSS styling.',
    'skill',
    'design-frontend',
    ['react', 'vue', 'svelte', 'ui', 'components', 'tailwind', 'frontend'],
    '1.0.3',
    5430,
    false,
    '# UI Component Generator\n\nDescribe a component and get production-ready code.\n\n## Supported Frameworks\n- React (TSX)\n- Vue 3 (SFC)\n- Svelte\n\n## Styling\n- Tailwind CSS\n- CSS Modules\n- Styled Components\n\n## Features\n- Accessibility-first output (ARIA attributes included)\n- Responsive design by default\n- Storybook stories generated alongside components\n- Dark mode support',
    '2025-06-01T10:00:00.000Z',
    '2025-09-25T17:00:00.000Z',
  ),
  ext(
    'a0000000-0000-0000-0000-000000000009',
    'docs-writer',
    'docs-writer',
    'Docs Writer',
    'Generates and maintains project documentation, API references, and user guides from code analysis.',
    'skill',
    'learning-docs',
    ['documentation', 'markdown', 'api-docs', 'jsdoc', 'readme'],
    '1.5.0',
    3890,
    false,
    '# Docs Writer\n\nAutomate your documentation workflow.\n\n## Capabilities\n- Generate README files from project structure\n- Create API references from source code\n- Maintain changelogs from git history\n- Write user guides and tutorials\n\n## Output Formats\n- Markdown\n- MDX\n- reStructuredText\n- HTML\n\n## Integration\nWorks with Docusaurus, VitePress, MkDocs, and more.',
    '2025-04-08T14:00:00.000Z',
    '2025-08-12T09:45:00.000Z',
  ),
  ext(
    'a0000000-0000-0000-0000-000000000010',
    'slack-integration',
    'slack-integration',
    'Slack Integration',
    'An MCP server that connects to Slack workspaces, enabling channel management, message search, and automated notifications.',
    'mcp_server',
    'integrations',
    ['slack', 'messaging', 'notifications', 'mcp', 'automation'],
    '2.2.1',
    8120,
    false,
    '# Slack Integration\n\nBring Slack into your Claude workflow via MCP.\n\n## Tools Provided\n- `send-message` - Post messages to channels or DMs\n- `search` - Search message history\n- `list-channels` - Browse workspace channels\n- `set-status` - Update your Slack status\n- `create-reminder` - Set Slack reminders\n\n## Authentication\nUses Slack Bot Token (xoxb-). Configure via environment variable `SLACK_BOT_TOKEN`.\n\n## Permissions Required\n- channels:read\n- chat:write\n- search:read\n- users:read',
    '2025-02-01T13:00:00.000Z',
    '2025-11-10T11:30:00.000Z',
  ),
];

// ---------------------------------------------------------------------------
// Seed version data
// ---------------------------------------------------------------------------

const SEED_VERSIONS: Record<string, ExtensionVersion[]> = {
  'a0000000-0000-0000-0000-000000000001': [
    ver('v0000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0000-000000000001', '1.0.0', 245_000, 'Initial release', 5200, '2025-02-10T10:00:00.000Z'),
    ver('v0000000-0000-0000-0001-000000000002', 'a0000000-0000-0000-0000-000000000001', '2.0.0', 312_000, 'Major rewrite with improved analysis engine', 7800, '2025-06-15T12:00:00.000Z'),
    ver('v0000000-0000-0000-0001-000000000003', 'a0000000-0000-0000-0000-000000000001', '2.1.0', 318_000, 'Added security vulnerability scanning', 2230, '2025-08-20T14:30:00.000Z'),
  ],
  'a0000000-0000-0000-0000-000000000002': [
    ver('v0000000-0000-0000-0002-000000000001', 'a0000000-0000-0000-0000-000000000002', '1.0.0', 128_000, 'Initial release', 3100, '2025-03-05T09:00:00.000Z'),
    ver('v0000000-0000-0000-0002-000000000002', 'a0000000-0000-0000-0000-000000000002', '1.4.0', 156_000, 'Added Angular and custom template support', 4500, '2025-07-22T10:00:00.000Z'),
    ver('v0000000-0000-0000-0002-000000000003', 'a0000000-0000-0000-0000-000000000002', '1.4.2', 158_000, 'Bug fix for monorepo detection', 2270, '2025-09-10T11:00:00.000Z'),
  ],
  'a0000000-0000-0000-0000-000000000003': [
    ver('v0000000-0000-0000-0003-000000000001', 'a0000000-0000-0000-0000-000000000003', '1.0.0', 890_000, 'Initial release with PostgreSQL support', 1200, '2025-01-20T12:00:00.000Z'),
    ver('v0000000-0000-0000-0003-000000000002', 'a0000000-0000-0000-0000-000000000003', '2.0.0', 1_020_000, 'Added MySQL and query explain support', 3400, '2025-05-10T14:00:00.000Z'),
    ver('v0000000-0000-0000-0003-000000000003', 'a0000000-0000-0000-0000-000000000003', '3.0.1', 1_050_000, 'SQLite support and bugfixes', 2850, '2025-10-05T16:45:00.000Z'),
  ],
  'a0000000-0000-0000-0000-000000000004': [
    ver('v0000000-0000-0000-0004-000000000001', 'a0000000-0000-0000-0000-000000000004', '1.0.0', 210_000, 'Initial release', 2100, '2025-04-12T08:30:00.000Z'),
    ver('v0000000-0000-0000-0004-000000000002', 'a0000000-0000-0000-0000-000000000004', '1.2.0', 234_000, 'Added multi-stage build optimization', 2220, '2025-07-18T10:15:00.000Z'),
  ],
  'a0000000-0000-0000-0000-000000000005': [
    ver('v0000000-0000-0000-0005-000000000001', 'a0000000-0000-0000-0000-000000000005', '1.0.0', 340_000, 'Initial release with Jest support', 4200, '2025-02-28T15:00:00.000Z'),
    ver('v0000000-0000-0000-0005-000000000002', 'a0000000-0000-0000-0000-000000000005', '1.5.0', 412_000, 'Vitest and Mocha support', 3800, '2025-06-20T08:00:00.000Z'),
    ver('v0000000-0000-0000-0005-000000000003', 'a0000000-0000-0000-0000-000000000005', '2.0.0', 478_000, 'Coverage-aware generation, Pytest and Go testing support', 3560, '2025-11-01T09:20:00.000Z'),
  ],
  'a0000000-0000-0000-0000-000000000006': [
    ver('v0000000-0000-0000-0006-000000000001', 'a0000000-0000-0000-0000-000000000006', '1.0.0', 520_000, 'Initial release with OpenAPI generation', 1900, '2025-05-15T11:00:00.000Z'),
    ver('v0000000-0000-0000-0006-000000000002', 'a0000000-0000-0000-0000-000000000006', '1.1.0', 548_000, 'Added GraphQL SDL and mock server', 1310, '2025-08-30T13:00:00.000Z'),
  ],
  'a0000000-0000-0000-0000-000000000007': [
    ver('v0000000-0000-0000-0007-000000000001', 'a0000000-0000-0000-0000-000000000007', '1.0.0', 290_000, 'Initial release with SAST scanning', 2400, '2025-03-22T07:00:00.000Z'),
    ver('v0000000-0000-0000-0007-000000000002', 'a0000000-0000-0000-0000-000000000007', '1.2.0', 345_000, 'Dependency CVE scanning', 2100, '2025-07-05T09:00:00.000Z'),
    ver('v0000000-0000-0000-0007-000000000003', 'a0000000-0000-0000-0000-000000000007', '1.3.5', 362_000, 'Secrets detection and config audit', 2280, '2025-10-15T08:30:00.000Z'),
  ],
  'a0000000-0000-0000-0000-000000000008': [
    ver('v0000000-0000-0000-0008-000000000001', 'a0000000-0000-0000-0000-000000000008', '1.0.0', 185_000, 'Initial release with React support', 3200, '2025-06-01T10:00:00.000Z'),
    ver('v0000000-0000-0000-0008-000000000002', 'a0000000-0000-0000-0000-000000000008', '1.0.3', 198_000, 'Added Vue and Svelte support, dark mode', 2230, '2025-09-25T17:00:00.000Z'),
  ],
  'a0000000-0000-0000-0000-000000000009': [
    ver('v0000000-0000-0000-0009-000000000001', 'a0000000-0000-0000-0000-000000000009', '1.0.0', 172_000, 'Initial release', 1500, '2025-04-08T14:00:00.000Z'),
    ver('v0000000-0000-0000-0009-000000000002', 'a0000000-0000-0000-0000-000000000009', '1.3.0', 204_000, 'Added changelog generation and MDX output', 1200, '2025-06-30T10:00:00.000Z'),
    ver('v0000000-0000-0000-0009-000000000003', 'a0000000-0000-0000-0000-000000000009', '1.5.0', 218_000, 'VitePress and MkDocs integration', 1190, '2025-08-12T09:45:00.000Z'),
  ],
  'a0000000-0000-0000-0000-000000000010': [
    ver('v0000000-0000-0000-0010-000000000001', 'a0000000-0000-0000-0000-000000000010', '1.0.0', 430_000, 'Initial release', 2000, '2025-02-01T13:00:00.000Z'),
    ver('v0000000-0000-0000-0010-000000000002', 'a0000000-0000-0000-0000-000000000010', '2.0.0', 510_000, 'Added search and reminder tools', 3500, '2025-07-15T09:00:00.000Z'),
    ver('v0000000-0000-0000-0010-000000000003', 'a0000000-0000-0000-0000-000000000010', '2.2.1', 525_000, 'Bug fixes and status update tool', 2620, '2025-11-10T11:30:00.000Z'),
  ],
};

// ---------------------------------------------------------------------------
// Initialize stores
// ---------------------------------------------------------------------------

function seed(): void {
  // Publisher
  publishers.set(MOCK_PUBLISHER.id, MOCK_PUBLISHER);

  // Extensions
  for (const e of SEED_EXTENSIONS) {
    extensions.set(e.slug, e);
  }

  // Versions
  for (const [extensionId, versionList] of Object.entries(SEED_VERSIONS)) {
    versions.set(extensionId, [...versionList]);
  }
}

seed();

// ---------------------------------------------------------------------------
// Reset (useful for tests)
// ---------------------------------------------------------------------------

export function resetStore(): void {
  extensions.clear();
  versions.clear();
  downloads.length = 0;
  publishers.clear();
  seed();
}
