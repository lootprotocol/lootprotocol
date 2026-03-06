import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth/guards';
import type { PaginatedResponse } from '@lootprotocol/shared-types';

interface UserInstall {
  id: string;
  extensionSlug: string;
  extensionName: string;
  extensionType: string;
  version: string;
  installedAt: string;
}

// Mock install data for development
const mockInstalls: UserInstall[] = [
  {
    id: '1',
    extensionSlug: 'code-reviewer',
    extensionName: 'Code Reviewer',
    extensionType: 'skill',
    version: '1.2.0',
    installedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '2',
    extensionSlug: 'docker-helper',
    extensionName: 'Docker Helper',
    extensionType: 'mcp_server',
    version: '0.9.1',
    installedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    const total = mockInstalls.length;
    const start = (page - 1) * limit;
    const data = mockInstalls.slice(start, start + limit);

    const response: PaginatedResponse<UserInstall> = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleAuthError(error);
  }
}
