export type UserRole = 'user' | 'publisher';
export interface Profile {
    id: string;
    cognitoSub: string;
    githubUsername: string;
    githubId: number;
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
    githubUsername: string;
    role: UserRole;
}
//# sourceMappingURL=user.d.ts.map