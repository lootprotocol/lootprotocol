'use client';

import { createContext, useCallback, useEffect, useState } from 'react';
import type { AuthUser, AuthProvider as AuthProviderType } from '@/lib/auth/types';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (provider?: AuthProviderType, returnTo?: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/users/me');
        if (res.ok) {
          const { data } = await res.json();
          setUser({
            id: data.id,
            cognitoSub: data.cognitoSub,
            username: data.username,
            authProvider: data.authProvider,
            avatarUrl: data.avatarUrl,
            role: data.role,
          });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = useCallback((provider: AuthProviderType = 'github', returnTo?: string) => {
    const isMock = process.env.NEXT_PUBLIC_AUTH_MOCK === 'true';

    if (isMock) {
      const state = returnTo ? btoa(JSON.stringify({ returnTo })) : undefined;
      const url = new URL('/auth/callback', window.location.origin);
      url.searchParams.set('code', 'mock-code');
      url.searchParams.set('provider', provider);
      if (state) url.searchParams.set('state', state);
      window.location.href = url.toString();
      return;
    }

    // Redirect to Cognito hosted UI
    const APP_URL = window.location.origin;
    const state = returnTo ? btoa(JSON.stringify({ returnTo })) : undefined;
    const identityProvider = provider === 'google' ? 'Google' : 'GitHub';
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
      response_type: 'code',
      scope: 'openid profile email',
      redirect_uri: `${APP_URL}/auth/callback`,
      identity_provider: identityProvider,
    });
    if (state) params.set('state', state);

    const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? '';
    window.location.href = `${cognitoDomain}/oauth2/authorize?${params.toString()}`;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
