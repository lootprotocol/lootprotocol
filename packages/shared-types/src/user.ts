export type UserRole = 'user' | 'publisher';

export type AuthProvider = 'github' | 'google';

export interface Profile {
  id: string;
  cognitoSub: string;
  username: string;
  email: string | null;
  authProvider: AuthProvider;
  githubUsername: string | null;
  githubId: number | null;
  googleId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  websiteUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  cognitoSub: string;
  username: string;
  authProvider: AuthProvider;
  avatarUrl?: string;
  role: UserRole;
}
