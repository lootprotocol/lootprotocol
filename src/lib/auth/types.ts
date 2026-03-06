export type { AuthUser, Profile, UserRole, AuthProvider } from '@lootprotocol/shared-types';

export interface CognitoClaims {
  sub: string;
  'custom:github_username'?: string;
  'custom:github_id'?: string;
  'custom:google_id'?: string;
  'custom:auth_provider'?: string;
  'custom:username'?: string;
  'custom:role'?: string;
  'custom:profile_id'?: string;
  email?: string;
  name?: string;
  picture?: string;
  identities?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  token_use: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
}
