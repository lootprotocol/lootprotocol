# AWS Security Checklist

## IAM Policies

### Do
- [ ] Use least-privilege: only grant actions the service actually needs
- [ ] Scope `Resource` to specific ARNs, never `"*"` for data resources
- [ ] Use managed policies over inline policies when possible
- [ ] Use conditions to restrict access (e.g., `aws:SourceVpc`, `aws:SourceIp`)

### Avoid
- [ ] `"Action": "*"` — grants all permissions
- [ ] `"Resource": "*"` — applies to all resources
- [ ] `"Effect": "Allow"` without conditions on sensitive actions
- [ ] Inline policies on users (use groups or roles instead)

### Example: Scoped S3 Policy for ECS Task
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject"
  ],
  "Resource": "arn:aws:s3:::lootprotocol-packages/*"
}
```

## S3 Buckets

- [ ] `BlockPublicAccess` enabled on all buckets (all 4 settings: BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, RestrictPublicBuckets)
- [ ] Server-side encryption enabled (SSE-S3 minimum, SSE-KMS for sensitive data)
- [ ] Bucket policy does not grant `s3:GetObject` to `"Principal": "*"`
- [ ] CORS configuration limited to specific origins (not `"*"`)
- [ ] Versioning enabled for package storage (prevents accidental deletion)
- [ ] Lifecycle rules configured for old versions (archive to Glacier or delete after N days)
- [ ] Access logging enabled for audit trail

### CDK Check Pattern
```typescript
// S3 bucket should have:
const bucket = new s3.Bucket(this, 'Packages', {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
  versioned: true,
  enforceSSL: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});
```

## RDS PostgreSQL

- [ ] `publiclyAccessible: false` (database not accessible from internet)
- [ ] Security group allows inbound 5432 only from ECS security group
- [ ] Encryption at rest enabled
- [ ] Automated backups enabled (retention: 7+ days)
- [ ] Credentials in Secrets Manager (not environment variables or code)
- [ ] Multi-AZ for production (optional for MVP/dev)
- [ ] `deletionProtection: true` for production
- [ ] SSL/TLS enforced for connections (`sslmode=require` in connection string)

### CDK Check Pattern
```typescript
const database = new rds.DatabaseInstance(this, 'Database', {
  publiclyAccessible: false,
  storageEncrypted: true,
  deletionProtection: true,
  credentials: rds.Credentials.fromGeneratedSecret('lootprotocol'),
  // securityGroups should only allow ECS SG
});
```

## ECS / Fargate

- [ ] Task execution role is minimally scoped (ECR pull, CloudWatch logs, Secrets Manager read)
- [ ] Task role is minimally scoped (only S3, RDS access needed)
- [ ] Container images from ECR (private registry), not Docker Hub
- [ ] No secrets in environment variables — use `secrets` with Secrets Manager ARNs
- [ ] Health check configured with proper path and thresholds
- [ ] Logging to CloudWatch enabled
- [ ] Platform version set to `LATEST` for security patches

### Secret Injection Pattern
```typescript
// Good: inject from Secrets Manager
secrets: {
  DATABASE_URL: ecs.Secret.fromSecretsManager(dbSecret, 'connectionString'),
}

// Bad: plaintext in environment
environment: {
  DATABASE_URL: 'postgresql://user:password@host/db',  // NEVER DO THIS
}
```

## Cognito

- [ ] Token expiration configured (access: 1 hour, refresh: 30 days max)
- [ ] Callback URLs strictly whitelisted (no wildcards)
- [ ] PKCE enforced for public clients (CLI)
- [ ] Advanced security features enabled (compromised credential detection)
- [ ] User pool deletion protection enabled

## CloudFront

- [ ] Origin protocol policy set to HTTPS-only
- [ ] Minimum TLS version: TLSv1.2_2021
- [ ] Custom error pages configured (hide server details)
- [ ] Geo-restriction if applicable
- [ ] Origin access control (OAC) for S3 origins (not OAI)
- [ ] WAF web ACL attached (post-MVP, but plan for it)

## VPC / Networking

- [ ] Database in private subnets (no internet gateway route)
- [ ] ECS tasks in private subnets with NAT gateway for outbound
- [ ] ALB in public subnets
- [ ] Security group rules follow least-privilege:
  - ALB-SG: inbound 443 from `0.0.0.0/0`
  - ECS-SG: inbound only from ALB-SG
  - RDS-SG: inbound 5432 only from ECS-SG
- [ ] VPC flow logs enabled for network debugging
- [ ] No overly permissive security group rules (`0.0.0.0/0` on non-ALB groups)

## General

- [ ] CloudTrail enabled for API audit logging
- [ ] Cost alerts configured (prevent surprise bills)
- [ ] No root account usage (use IAM users/roles)
- [ ] MFA enabled on AWS account
