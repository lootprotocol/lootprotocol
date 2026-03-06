# Engineer 2: Authentication, User Domain & Layout Shell

## Overview

You own the **authentication system** (Amazon Cognito + GitHub OAuth), **JWT verification middleware**, **authorization guards**, the **root layout shell** (header, footer, nav), **user-facing pages** (dashboard, publisher profile), and **user API routes**. Your code is the gatekeeper for every protected action in the platform.

Since all 4 workstreams run in parallel, you work with a **mock database** (in-memory or SQLite) and a **mock Cognito** (local JWT issuer) during development. Real Cognito and Prisma are wired in during Phase 5 (Integration).

---

## File Ownership

```
src/
  lib/auth/
    cognito.ts                    # Cognito client, JWKS fetch, token verification
    middleware.ts                 # Next.js middleware for JWT verification
    guards.ts                    # requireAuth, requirePublisher, requireDownloadAuth
    session.ts                   # Cookie management (web), Bearer token parsing (CLI)
    mock.ts                      # Mock auth for local dev (issues/verifies local JWTs)
    types.ts                     # Auth-specific types (re-exports from shared-types)
  app/
    layout.tsx                   # Root layout (AuthProvider, Header, Footer)
    auth/
      callback/route.ts          # Cognito OAuth callback handler
    api/
      auth/
        token/route.ts           # CLI token exchange endpoint
      users/
        me/route.ts              # GET current user profile
        me/installs/route.ts     # GET user's install history
      publishers/
        [username]/route.ts      # GET publisher profile + extensions
    dashboard/
      page.tsx                   # User dashboard (my extensions, stats)
      layout.tsx                 # Dashboard layout (sidebar nav)
    publishers/
      [username]/page.tsx        # Publisher profile page
  components/
    auth/
      sign-in-button.tsx         # "Sign in with GitHub" button
      user-menu.tsx              # Avatar dropdown (profile, dashboard, sign out)
      auth-provider.tsx          # React context for auth state
      auth-guard.tsx             # Client-side route protection wrapper
    layout/
      header.tsx                 # Top nav: logo, links, auth state
      footer.tsx                 # Footer with links
      sidebar.tsx                # Dashboard sidebar nav
    dashboard/
      extension-list.tsx         # User's published extensions table
      stats-card.tsx             # Download count / install count card
      version-upload.tsx         # Upload new version to existing extension
  hooks/
    use-auth.ts                  # Client-side auth hook (user, login, logout)
  middleware.ts                  # Next.js root middleware (path matching + JWT check)
```

---

## Shared Contracts

### Interfaces You Implement

```typescript
// AuthUser — the shape returned after JWT verification
export interface AuthUser {
  id: string;          // Profile UUID
  cognitoSub: string;  // Cognito subject claim
  githubUsername: string;
  role: 'user' | 'publisher';
}

// Function signatures you export for other engineers
export async function verifyToken(token: string): Promise<AuthUser>;
export async function requireAuth(request: Request): Promise<AuthUser>;
export async function requirePublisher(request: Request, extensionSlug: string): Promise<AuthUser>;
export async function requireDownloadAuth(request: Request): Promise<AuthUser>;
```

### Interfaces You Consume

```typescript
// From E3 (Marketplace) — called in dashboard page
GET /api/extensions?publisherId={userId}  -> PaginatedResponse<Extension>

// From shared types
import { Profile, Extension, PaginatedResponse, ApiError } from '@lootprotocol/shared-types';
```

---

## Technical Decisions

| Decision | Choice | Rationale |
|---------|--------|-----------|
| JWT library | `jose` (v5+) | Edge-compatible, works in Next.js middleware, no native deps |
| Cookie library | `next/headers` cookies API | Built into Next.js App Router |
| Auth context | React Context + `useAuth()` hook | Simple, no extra state library needed |
| Mock auth | Local JWT signing with `jose` | Same verification code works for both real and mock tokens |
| UI components | shadcn/ui (Button, DropdownMenu, Avatar, Card, Dialog) | Consistent with project-wide choice |
| Form handling | React Hook Form + Zod | Type-safe validation on dashboard forms |

### Libraries to Install

```
pnpm add jose                    # JWT verification (Edge-compatible)
pnpm add -D @types/jsonwebtoken  # Type definitions
```

---

## Tasks (Ordered)

### Task 1: Auth Library Core

**Files:** `src/lib/auth/cognito.ts`, `src/lib/auth/session.ts`, `src/lib/auth/mock.ts`

**`cognito.ts` — Real Cognito JWT verification:**
```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

const COGNITO_ISSUER = process.env.COGNITO_ISSUER; // https://cognito-idp.{region}.amazonaws.com/{poolId}
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

const jwks = createRemoteJWKSet(
  new URL(`${COGNITO_ISSUER}/.well-known/jwks.json`)
);

export async function verifyCognitoToken(token: string): Promise<CognitoClaims> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: COGNITO_ISSUER,
    audience: COGNITO_CLIENT_ID,
  });
  return payload as CognitoClaims;
}
```

**`session.ts` — Token extraction:**
- `getTokenFromCookie(request)` — Read `lootprotocol_access_token` from HTTP-only cookie
- `getTokenFromHeader(request)` — Read `Authorization: Bearer <token>` header
- `getToken(request)` — Try cookie first, then header
- `setAuthCookies(response, tokens)` — Set HTTP-only, secure, SameSite=Lax cookies
- `clearAuthCookies(response)` — Clear auth cookies on logout

**`mock.ts` — Local development auth:**
```typescript
import { SignJWT, jwtVerify, generateKeyPair } from 'jose';

// Generate a local key pair on startup
const { publicKey, privateKey } = await generateKeyPair('RS256');

export async function createMockToken(user: AuthUser): Promise<string> {
  return new SignJWT({ sub: user.cognitoSub, ...user })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(privateKey);
}

export async function verifyMockToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, publicKey);
  return payload as AuthUser;
}
```

The `verifyToken()` function checks `AUTH_MOCK` env var and delegates to the right implementation.

### Task 2: Middleware & Guards

**Files:** `src/middleware.ts`, `src/lib/auth/middleware.ts`, `src/lib/auth/guards.ts`

**`src/middleware.ts` (Next.js root middleware):**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/publish/:path*',
    '/api/extensions/:slug/download',
    '/api/extensions/:slug/versions',
    '/api/users/:path*',
    '/api/validate',
  ],
};

export async function middleware(request: NextRequest) {
  // Verify JWT, attach user to request headers for API routes
  // Redirect to sign-in for page routes if unauthenticated
}
```

**`guards.ts`:**
- `requireAuth(request)` — Extract and verify JWT, return `AuthUser` or throw 401
- `requirePublisher(request, extensionSlug)` — Verify user owns the extension (query DB by slug + publisher_id). During mock phase, always return true for the mock user.
- `requireDownloadAuth(request)` — Same as requireAuth, semantically distinct for download tracking

### Task 3: OAuth Callback & Token Exchange

**Files:** `src/app/auth/callback/route.ts`, `src/app/api/auth/token/route.ts`

**Callback handler (`/auth/callback`):**
1. Receive `code` and `state` query params from Cognito redirect
2. Exchange authorization code for tokens with Cognito token endpoint
3. Extract GitHub user info from the ID token (Cognito maps GitHub attributes)
4. Upsert profile in database (create if new, update if existing)
5. Set HTTP-only cookies with access + refresh tokens
6. Redirect to dashboard (or stored return URL from `state`)

**Token exchange for CLI (`POST /api/auth/token`):**
1. Receive `{ code, redirect_uri }` in body
2. Exchange code with Cognito token endpoint
3. Return `{ access_token, refresh_token, expires_in, user: Profile }` as JSON
4. CLI stores this in `~/.lootprotocol/config.json`

**Mock mode:** Both endpoints work with the mock JWT issuer in dev.

### Task 4: User API Routes

**Files:** `src/app/api/users/me/route.ts`, `src/app/api/users/me/installs/route.ts`, `src/app/api/publishers/[username]/route.ts`

**`GET /api/users/me`:**
- Uses `requireAuth()`
- Returns the authenticated user's profile
- During mock phase: return hardcoded mock profile

**`GET /api/users/me/installs`:**
- Uses `requireAuth()`
- Query params: `page`, `limit`
- Returns `PaginatedResponse<UserInstall>` with extension details joined
- During mock phase: return empty array or mock data

**`GET /api/publishers/[username]`:**
- Public endpoint (no auth required)
- Returns publisher profile + their published extensions
- During mock phase: return mock data

### Task 5: Auth UI Components

**Files:** `src/components/auth/*`, `src/hooks/use-auth.ts`

**`auth-provider.tsx`:**
```typescript
'use client';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: () => void;    // Redirect to Cognito hosted UI
  logout: () => void;   // Clear cookies, redirect to home
}

// On mount: check for existing auth cookie via GET /api/users/me
// If 200: set user. If 401: set user to null.
```

**`sign-in-button.tsx`:**
- Renders "Sign in with GitHub" button with GitHub icon
- Calls `login()` from auth context (redirects to Cognito)
- Shows loading spinner during redirect

**`user-menu.tsx`:**
- Renders user avatar + dropdown (DropdownMenu from shadcn/ui)
- Menu items: "Dashboard", "My Extensions", "Sign Out"
- Uses `user` and `logout` from auth context

**`auth-guard.tsx`:**
- Wrapper component for protected pages
- If not authenticated: show sign-in prompt or redirect
- If loading: show skeleton

**`use-auth.ts`:**
- Convenience hook wrapping `useContext(AuthContext)`

### Task 6: Layout Shell

**Files:** `src/app/layout.tsx`, `src/components/layout/*`

**`layout.tsx`:**
```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
```

**`header.tsx`:**
- Logo (link to home)
- Nav links: Explore, Publish, Docs
- Right side: `SignInButton` (if no user) or `UserMenu` (if authenticated)
- Responsive: hamburger menu on mobile

**`footer.tsx`:**
- Links: About, Docs, GitHub, Terms, Privacy
- Copyright notice

### Task 7: Dashboard Page

**Files:** `src/app/dashboard/*`, `src/components/dashboard/*`

**`dashboard/page.tsx`:**
- Protected page (uses `AuthGuard`)
- Fetches user's extensions from API
- Shows stats cards (total extensions, total downloads)
- Shows extension list with actions (edit, view stats, upload new version)

**`dashboard/layout.tsx`:**
- Dashboard-specific sidebar with nav:
  - Overview
  - My Extensions
  - Install History
  - Settings (future)

**`extension-list.tsx`:**
- Table of user's published extensions
- Columns: name, type, version, downloads, status, actions
- Actions: view, edit metadata, upload version

**`stats-card.tsx`:**
- Card showing a metric (number + label + trend)
- Used for: total extensions, total downloads, this month downloads

**`version-upload.tsx`:**
- Dialog/modal for uploading a new version
- File upload zone + changelog textarea
- Calls `POST /api/extensions/[slug]/versions` (E3's endpoint)
- During mock phase: show success toast with mock response

### Task 8: Publisher Profile Page

**Files:** `src/app/publishers/[username]/page.tsx`

- Server component
- Fetches publisher data from `GET /api/publishers/[username]`
- Shows: avatar, display name, bio, website link, join date
- Grid of publisher's extensions (reuses extension-card component from E3, or builds own simple version)

---

## Mock Strategy

### Mock Database
During the parallel phase, use an **in-memory store** or simple JSON file for user/profile data:

```typescript
// src/lib/auth/mock-db.ts
const mockProfiles: Map<string, Profile> = new Map();
const mockUser: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  cognitoSub: 'mock-sub-123',
  githubUsername: 'test-publisher',
  githubId: 12345,
  displayName: 'Test Publisher',
  avatarUrl: 'https://github.com/identicons/test.png',
  bio: 'A test publisher for local development',
  role: 'publisher',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
mockProfiles.set(mockUser.id, mockUser);
```

### Mock Cognito
When `AUTH_MOCK=true`:
- `login()` skips Cognito redirect, directly creates a mock token and sets cookies
- `/auth/callback` accepts any code and creates a mock session
- `verifyToken()` uses local RSA key pair (not Cognito JWKS)
- This lets you test the entire auth flow locally without AWS

### Mock Extensions API
For dashboard, use hardcoded mock extension data or create a mock API handler that returns sample data. This avoids dependency on E3's API routes.

---

## Deliverables & Acceptance Criteria

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | `verifyToken()` | Returns `AuthUser` for valid JWT (both mock and real Cognito) |
| 2 | Middleware | Protected routes return 401 without token, 200 with valid token |
| 3 | Guards | `requireAuth` returns user, `requirePublisher` checks ownership |
| 4 | OAuth callback | Mock mode: visit `/auth/callback?code=mock` creates session + redirects |
| 5 | CLI token exchange | `POST /api/auth/token` returns JSON tokens |
| 6 | `/api/users/me` | Returns authenticated user's profile |
| 7 | `/api/users/me/installs` | Returns paginated install history |
| 8 | Auth UI components | Sign-in button redirects, user menu shows profile, logout clears session |
| 9 | Root layout | Header + footer rendered on all pages, auth state reflected |
| 10 | Dashboard | Shows user's extensions, stats, version upload dialog |
| 11 | Publisher profile | Shows publisher info + their extensions |

---

## Handoff to Integration (Phase 5)

You deliver:
- Complete auth library (`verifyToken`, `requireAuth`, `requirePublisher`, `requireDownloadAuth`)
- Working middleware that gates protected routes
- OAuth callback + CLI token exchange endpoints
- Root layout with header, footer, and auth context
- Dashboard page (will be wired to real extension data)
- Publisher profile page (will be wired to real extension data)
- Mock auth mode that Phase 5 can use for E2E testing

Phase 5 will:
- Replace mock DB with Prisma client
- Configure real Cognito credentials
- Wire dashboard to real extension API data from E3
- Wire `requirePublisher` guard to query real DB for extension ownership
- Test end-to-end OAuth flow with real GitHub
