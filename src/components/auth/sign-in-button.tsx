'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Github, Loader2 } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/google-icon';

export function SignInButton() {
  const { login } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLogin = (provider: 'github' | 'google') => {
    setIsRedirecting(true);
    login(provider);
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={() => handleLogin('github')} disabled={isRedirecting} variant="default" size="sm">
        {isRedirecting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Github className="mr-2 h-4 w-4" />
        )}
        GitHub
      </Button>
      <Button onClick={() => handleLogin('google')} disabled={isRedirecting} variant="outline" size="sm">
        {isRedirecting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="mr-2 h-4 w-4" />
        )}
        Google
      </Button>
    </div>
  );
}
