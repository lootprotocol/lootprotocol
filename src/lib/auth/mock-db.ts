import type { Profile } from '@lootprotocol/shared-types';

const mockProfiles: Map<string, Profile> = new Map();

const mockUser: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  cognitoSub: 'mock-sub-123',
  username: 'test-publisher',
  email: 'test@example.com',
  authProvider: 'github',
  githubUsername: 'test-publisher',
  githubId: 12345,
  googleId: null,
  displayName: 'Test Publisher',
  avatarUrl: 'https://github.com/identicons/test.png',
  bio: 'A test publisher for local development',
  websiteUrl: null,
  role: 'publisher',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockGoogleUser: Profile = {
  id: '00000000-0000-0000-0000-000000000002',
  cognitoSub: 'mock-sub-google-456',
  username: 'google-tester',
  email: 'tester@gmail.com',
  authProvider: 'google',
  githubUsername: null,
  githubId: null,
  googleId: '123456789012345678901',
  displayName: 'Google Tester',
  avatarUrl: null,
  bio: 'A Google-authenticated test user',
  websiteUrl: null,
  role: 'user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

mockProfiles.set(mockUser.id, mockUser);
mockProfiles.set(mockUser.username, mockUser);
mockProfiles.set(mockGoogleUser.id, mockGoogleUser);
mockProfiles.set(mockGoogleUser.username, mockGoogleUser);

export function getMockProfile(idOrUsername: string): Profile | undefined {
  return mockProfiles.get(idOrUsername);
}

export function getMockProfileBySub(sub: string): Profile | undefined {
  for (const profile of mockProfiles.values()) {
    if (profile.cognitoSub === sub) return profile;
  }
  return undefined;
}

export function upsertMockProfile(profile: Profile): Profile {
  mockProfiles.set(profile.id, profile);
  mockProfiles.set(profile.username, profile);
  return profile;
}

export function getAllMockProfiles(): Profile[] {
  const seen = new Set<string>();
  const profiles: Profile[] = [];
  for (const profile of mockProfiles.values()) {
    if (!seen.has(profile.id)) {
      seen.add(profile.id);
      profiles.push(profile);
    }
  }
  return profiles;
}

export const DEFAULT_MOCK_USER = mockUser;
export const MOCK_GOOGLE_USER = mockGoogleUser;
