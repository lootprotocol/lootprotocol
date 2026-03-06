'use client';

import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/google-icon';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      fallback ?? (
        <div className="flex flex-col gap-4 p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      )
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-semibold">Sign in required</h2>
        <p className="text-muted-foreground">You need to sign in to access this page.</p>
        <div className="flex gap-3">
          <Button onClick={() => login('github', window.location.pathname)} size="lg">
            <Github className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>
          <Button onClick={() => login('google', window.location.pathname)} size="lg" variant="outline">
            <GoogleIcon className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
