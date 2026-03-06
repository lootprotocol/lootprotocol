import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth/guards';
import { validateExtension } from '@lootprotocol/validation';
import type { ExtensionType } from '@lootprotocol/shared-types';

export async function POST(request: Request) {
  try {
    await requireAuth(request);
    const formData = await request.formData();
    const file = formData.get('archive') as File;
    const type = formData.get('type') as ExtensionType;

    if (!file || !type) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Missing required fields: archive, type' } },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await validateExtension(type, buffer, file.name);
    return NextResponse.json(result);
  } catch (error) {
    return handleAuthError(error);
  }
}
