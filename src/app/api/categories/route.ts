import { NextResponse } from 'next/server';

const CATEGORIES = [
  { slug: 'development-tools', name: 'Development Tools', description: 'Code editors, linters, formatters' },
  { slug: 'productivity', name: 'Productivity', description: 'Workflow automation, task management' },
  { slug: 'testing-qa', name: 'Testing & QA', description: 'Test runners, assertions, mocking' },
  { slug: 'security', name: 'Security', description: 'Vulnerability scanning, auth tools' },
  { slug: 'database-backend', name: 'Database & Backend', description: 'ORMs, query builders, API tools' },
  { slug: 'devops-deployment', name: 'DevOps & Deployment', description: 'CI/CD, containers, monitoring' },
  { slug: 'design-frontend', name: 'Design & Frontend', description: 'UI components, styling, accessibility' },
  { slug: 'learning-docs', name: 'Learning & Docs', description: 'Documentation, tutorials, examples' },
  { slug: 'integrations', name: 'Integrations', description: 'Third-party service connectors' },
  { slug: 'other', name: 'Other', description: "Extensions that don't fit other categories" },
];

export async function GET() {
  return NextResponse.json({ categories: CATEGORIES });
}
