---
name: secure
description: Performs threat-model-driven security audit of code, configuration, and infrastructure. Use when the user asks to "check security", "audit for vulnerabilities", "review auth code", "harden this", "is this safe?", or when working with user input handling, authentication, authorization, secrets management, or cloud infrastructure (AWS/IAM/S3/RDS).
---

# Security Audit

Perform a targeted security audit using threat-model-driven analysis. Not a generic vulnerability scan — identify the actual threat surface, then systematically verify mitigations.

## Step 1: Identify Threat Surface

Detect the technology stack and map the attack surface:

- Scan `package.json`, `tsconfig.json`, infrastructure files to identify the stack
- Map all entry points: API endpoints, form inputs, file uploads, URL parameters, WebSocket messages
- Map all trust boundaries: authentication checks, authorization gates, server/client boundary
- Map all sensitive assets: credentials, tokens, PII, payment data, admin functionality

If argument is "full": scan the entire project. Otherwise scope to specified files/directory.

## Step 2: OWASP-Driven Analysis

Analyze the code against real-world attack vectors, organized by risk.

### Injection
- **SQL injection**: are all queries parameterized (`$1, $2` placeholders)? Search for string concatenation in SQL
- **XSS**: is user-generated content sanitized before rendering? Check for `dangerouslySetInnerHTML`, unescaped template variables
- **Command injection**: is `child_process.exec` or `eval` used with user input? Use `execFile` with argument arrays instead
- **Path traversal**: are file paths constructed from user input? Check for `../` patterns and use `path.resolve` with validation

### Broken Authentication
- **JWT verification**: is the token signature actually verified? Is the issuer and audience checked? Are expired tokens rejected?
- **Session management**: are cookies `HttpOnly`, `Secure`, and `SameSite`? Is session fixation prevented?
- **CSRF**: are state-changing requests protected? Check for anti-CSRF tokens or SameSite cookie policy
- **Password handling**: if applicable, is bcrypt/argon2 used? Are timing attacks prevented?
- **OAuth callback**: is the `state` parameter validated? Are redirect URIs strictly whitelisted?

### Broken Authorization
- **Ownership checks**: can user A access user B's resources? Search for missing `where user_id = $1` clauses
- **IDOR**: are resource IDs in URLs validated against the authenticated user's permissions?
- **Privilege escalation**: can a regular user access admin endpoints? Are role checks applied consistently?
- **Horizontal access**: search API routes for missing authorization checks after authentication

### Sensitive Data Exposure
- **Secrets in code**: search for hardcoded API keys, passwords, tokens in source files
- **Secrets in git history**: check `.gitignore` for `.env`, credentials files; suggest `git log --all -p -S "password"` check
- **Error verbosity**: do error responses include stack traces, SQL queries, or internal file paths?
- **HTTPS enforcement**: is HTTP-to-HTTPS redirect configured? Are mixed content issues possible?
- **PII handling**: is personally identifiable information encrypted at rest? Logged unnecessarily?

### Security Misconfiguration
- **CORS**: is `Access-Control-Allow-Origin: *` used? Are allowed origins explicitly whitelisted?
- **Security headers**: check for Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy
- **Debug mode**: are debug endpoints or verbose logging enabled in production config?
- **Default credentials**: are default passwords, API keys, or admin accounts present?

## Step 3: AWS-Specific Checks

If the project uses AWS (CDK, CloudFormation, SDK):

### IAM
- Principle of least privilege: no `Action: "*"` or `Resource: "*"` unless absolutely required
- Are IAM roles scoped to specific services and resources?
- Are there inline policies that should be managed policies?

### S3
- Public access blocks enabled on all buckets?
- Bucket policies do not grant `s3:GetObject` to `*` (public read)?
- Server-side encryption enabled (SSE-S3 or SSE-KMS)?
- CORS configuration scoped to specific origins?

### RDS
- Not publicly accessible (`publiclyAccessible: false`)?
- Security group allows access only from application subnets?
- Encryption at rest enabled?
- Credentials stored in Secrets Manager, not environment variables?

### ECS/Fargate
- Task execution role is minimally scoped?
- Container images from trusted registries only?
- No secrets in environment variables (use Secrets Manager or Parameter Store)?
- Health check configured?

### CloudFront
- HTTPS-only origin protocol policy?
- Minimum TLS version 1.2?
- Custom error pages configured (no default server info)?

## Step 4: Dependency Audit

- Run `npm audit` and interpret results: critical/high vulnerabilities require action
- Check for known vulnerable packages: `lodash` < 4.17.21, `express` < 4.17.3, etc.
- Flag packages with no updates in 2+ years (potential unmaintained risk)
- Check for typosquatting: package names similar to popular packages but slightly different

## Output Format

```
## Security Audit Report

### Threat Model
- **Assets**: [what are we protecting]
- **Threats**: [who might attack and how]
- **Entry Points**: [API endpoints, forms, file uploads]

### Critical Vulnerabilities
[Exploitable now. file:line, the vulnerability, how to exploit, how to fix]

### High-Risk Issues
[Exploitable under specific conditions. Same format as above]

### Hardening Recommendations
[Defense-in-depth improvements, not urgent but valuable]

### Dependency Status
[npm audit results summary, flagged packages]
```

For security header configurations, see `references/security-headers.md`. For AWS-specific checks, see `references/aws-security-checklist.md`. For input validation patterns, see `references/input-validation-patterns.md`.
