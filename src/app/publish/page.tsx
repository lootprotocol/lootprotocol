'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { PublishForm } from '@/components/publish/publish-form';

export default function PublishPage() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Publish Extension</h1>
          <p className="mt-1 text-muted-foreground">
            Share your extension with the AI agent community
          </p>
        </div>
        <PublishForm />
      </div>
    </AuthGuard>
  );
}
