import { PrismaClient, ExtensionType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  'Development Tools',
  'Productivity',
  'Testing & QA',
  'Security',
  'Database & Backend',
  'DevOps & Deployment',
  'Design & Frontend',
  'Learning & Docs',
  'Integrations',
  'Other',
];

async function main() {
  console.log('Seeding database...');

  // Create test profiles
  const alice = await prisma.profile.upsert({
    where: { githubUsername: 'alice-dev' },
    update: {},
    create: {
      cognitoSub: 'cognito-sub-alice-000001',
      githubUsername: 'alice-dev',
      githubId: 100001n,
      displayName: 'Alice Developer',
      avatarUrl: 'https://avatars.githubusercontent.com/u/100001',
      bio: 'Full-stack developer and open source enthusiast',
      websiteUrl: 'https://alice.dev',
      role: UserRole.publisher,
    },
  });

  const bob = await prisma.profile.upsert({
    where: { githubUsername: 'bob-builder' },
    update: {},
    create: {
      cognitoSub: 'cognito-sub-bob-000002',
      githubUsername: 'bob-builder',
      githubId: 100002n,
      displayName: 'Bob Builder',
      avatarUrl: 'https://avatars.githubusercontent.com/u/100002',
      bio: 'DevOps engineer building tools for developers',
      role: UserRole.publisher,
    },
  });

  const charlie = await prisma.profile.upsert({
    where: { githubUsername: 'charlie-user' },
    update: {},
    create: {
      cognitoSub: 'cognito-sub-charlie-000003',
      githubUsername: 'charlie-user',
      githubId: 100003n,
      displayName: 'Charlie',
      avatarUrl: 'https://avatars.githubusercontent.com/u/100003',
      role: UserRole.user,
    },
  });

  console.log(`Created profiles: ${alice.githubUsername}, ${bob.githubUsername}, ${charlie.githubUsername}`);

  // Create sample extensions
  const extensions = [
    {
      slug: 'code-reviewer',
      name: 'code-reviewer',
      displayName: 'AI Code Reviewer',
      description: 'Automatically reviews pull requests and provides detailed feedback on code quality, security, and best practices.',
      extensionType: ExtensionType.skill,
      category: 'Development Tools',
      tags: ['code-review', 'quality', 'github'],
      publisherId: alice.id,
      isFeatured: true,
      downloadCount: 1250,
    },
    {
      slug: 'db-query-optimizer',
      name: 'db-query-optimizer',
      displayName: 'Database Query Optimizer',
      description: 'Analyzes SQL queries and suggests optimizations for better performance. Supports PostgreSQL, MySQL, and SQLite.',
      extensionType: ExtensionType.skill,
      category: 'Database & Backend',
      tags: ['sql', 'optimization', 'performance'],
      publisherId: alice.id,
      downloadCount: 830,
    },
    {
      slug: 'github-mcp',
      name: 'github-mcp',
      displayName: 'GitHub MCP Server',
      description: 'MCP server that provides tools for interacting with GitHub repositories, issues, and pull requests.',
      extensionType: ExtensionType.mcp_server,
      category: 'Integrations',
      tags: ['github', 'mcp', 'version-control'],
      publisherId: bob.id,
      isFeatured: true,
      downloadCount: 2100,
    },
    {
      slug: 'slack-mcp',
      name: 'slack-mcp',
      displayName: 'Slack MCP Server',
      description: 'MCP server for sending messages, reading channels, and managing Slack workspaces through AI agents.',
      extensionType: ExtensionType.mcp_server,
      category: 'Integrations',
      tags: ['slack', 'mcp', 'messaging'],
      publisherId: bob.id,
      downloadCount: 950,
    },
    {
      slug: 'test-generator',
      name: 'test-generator',
      displayName: 'Test Generator',
      description: 'Generates comprehensive unit and integration tests from source code. Supports Jest, Vitest, and Pytest.',
      extensionType: ExtensionType.skill,
      category: 'Testing & QA',
      tags: ['testing', 'jest', 'vitest', 'automation'],
      publisherId: alice.id,
      isFeatured: true,
      downloadCount: 1800,
    },
    {
      slug: 'docker-compose-plugin',
      name: 'docker-compose-plugin',
      displayName: 'Docker Compose Helper',
      description: 'Plugin that helps generate and validate docker-compose configurations for development environments.',
      extensionType: ExtensionType.plugin,
      category: 'DevOps & Deployment',
      tags: ['docker', 'compose', 'devops'],
      publisherId: bob.id,
      downloadCount: 620,
    },
    {
      slug: 'security-scanner',
      name: 'security-scanner',
      displayName: 'Security Vulnerability Scanner',
      description: 'Scans code for common security vulnerabilities including OWASP Top 10, dependency issues, and secrets exposure.',
      extensionType: ExtensionType.skill,
      category: 'Security',
      tags: ['security', 'vulnerability', 'owasp', 'scanning'],
      publisherId: alice.id,
      downloadCount: 1450,
    },
    {
      slug: 'api-doc-generator',
      name: 'api-doc-generator',
      displayName: 'API Documentation Generator',
      description: 'Automatically generates OpenAPI/Swagger documentation from your codebase. Supports REST and GraphQL.',
      extensionType: ExtensionType.skill,
      category: 'Learning & Docs',
      tags: ['documentation', 'openapi', 'swagger'],
      publisherId: bob.id,
      downloadCount: 720,
    },
    {
      slug: 'tailwind-assistant',
      name: 'tailwind-assistant',
      displayName: 'Tailwind CSS Assistant',
      description: 'Helps convert designs to Tailwind CSS classes and suggests responsive layouts.',
      extensionType: ExtensionType.plugin,
      category: 'Design & Frontend',
      tags: ['tailwind', 'css', 'design', 'responsive'],
      publisherId: alice.id,
      downloadCount: 540,
    },
    {
      slug: 'task-planner',
      name: 'task-planner',
      displayName: 'Task Planner',
      description: 'Breaks down complex tasks into manageable steps with time estimates and dependency tracking.',
      extensionType: ExtensionType.skill,
      category: 'Productivity',
      tags: ['planning', 'tasks', 'project-management'],
      publisherId: bob.id,
      downloadCount: 380,
    },
  ];

  for (const ext of extensions) {
    const created = await prisma.extension.upsert({
      where: { slug: ext.slug },
      update: {},
      create: ext,
    });

    // Create a version for each extension
    await prisma.extensionVersion.upsert({
      where: {
        extensionId_version: {
          extensionId: created.id,
          version: '1.0.0',
        },
      },
      update: {},
      create: {
        extensionId: created.id,
        version: '1.0.0',
        s3Key: `extensions/${ext.slug}/1.0.0/${ext.slug}-1.0.0.tar.gz`,
        packageSizeBytes: Math.floor(Math.random() * 500000) + 10000,
        metadata: {
          name: ext.name,
          description: ext.description,
          version: '1.0.0',
        },
        changelog: 'Initial release',
      },
    });
  }

  console.log(`Created ${extensions.length} extensions with versions`);
  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
