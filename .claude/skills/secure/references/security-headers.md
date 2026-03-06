# Security Headers for Next.js

## Recommended Headers

Configure in `next.config.ts`:

```typescript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Tighten after initial setup
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.amazonaws.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];
```

## Header Explanations

| Header | Purpose | Risk if Missing |
|--------|---------|----------------|
| Content-Security-Policy | Controls which resources can load | XSS via injected scripts |
| Strict-Transport-Security | Forces HTTPS | Downgrade attacks, cookie theft |
| X-Content-Type-Options | Prevents MIME sniffing | Script execution via MIME confusion |
| X-Frame-Options | Prevents iframe embedding | Clickjacking attacks |
| Referrer-Policy | Controls referrer info in requests | URL parameter leakage |
| Permissions-Policy | Restricts browser APIs | Unauthorized device access |

## Next.js Configuration

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## CORS Configuration (API Routes)

```typescript
// For API routes that need CORS
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  // Add CLI/skill origins as needed
];

function corsHeaders(origin: string | null) {
  const headers = new Headers();
  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}
```

## Cookie Security Flags

```typescript
// For authentication cookies
const cookieOptions = {
  httpOnly: true,      // Cannot be read by JavaScript
  secure: true,        // Only sent over HTTPS
  sameSite: 'lax',     // Prevents CSRF in most cases
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days
};
```
