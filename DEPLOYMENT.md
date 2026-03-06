# Loot Protocol — AWS Deployment Guide

This document is the single source of truth for deploying Loot Protocol to AWS. It is written for an AI agent (or human operator) performing deployment tasks. Read it entirely before taking any action.

---

## Table of Contents

1. [Current Deployed State](#current-deployed-state)
2. [Architecture Overview](#architecture-overview)
3. [AWS Resource Inventory](#aws-resource-inventory)
4. [Routine Deployment (Code Changes)](#routine-deployment-code-changes)
5. [Infrastructure Changes (CDK)](#infrastructure-changes-cdk)
6. [First-Time / Fresh Deployment](#first-time--fresh-deployment)
7. [Troubleshooting Playbook](#troubleshooting-playbook)
8. [Known Gotchas](#known-gotchas)
9. [File Reference](#file-reference)

---

## Current Deployed State

**Account:** 603846588826
**Region:** us-east-1
**Stage:** dev

| Stack | CloudFormation Name | Status |
|-------|-------------------|--------|
| VPC | `LootProtocol-Vpc-dev` | Deployed |
| Database | `LootProtocol-Database-dev` | Deployed |
| Storage | `LootProtocol-Storage-dev` | Deployed |
| Auth | `LootProtocol-Auth-dev` | Deployed |
| Compute | `LootProtocol-Compute-dev` | Deployed |
| CDN | `LootProtocol-Cdn-dev` | Deployed |

**Live Endpoints:**

| Endpoint | URL |
|----------|-----|
| Custom domain | `https://www.lootprotocol.com` |
| CloudFront | `https://d20b1ep30zrqwn.cloudfront.net` |
| ALB (direct) | `https://LootPr-LootP-EOA1br4ugpiv-1193456457.us-east-1.elb.amazonaws.com` |
| Health check | `GET /api/health` → `{"status":"ok","timestamp":"..."}` |

**Key Resource Identifiers:**

```
VPC:              vpc-05aa7fe132eeccbcb
ECR Repository:   603846588826.dkr.ecr.us-east-1.amazonaws.com/lootprotocol
ECS Cluster:      lootprotocol-cluster
ECS Service:      lootprotocol-service
ALB:              LootPr-LootP-EOA1br4ugpiv-1193456457.us-east-1.elb.amazonaws.com
Target Group ARN: arn:aws:elasticloadbalancing:us-east-1:603846588826:targetgroup/LootPr-LootP-Z6JPVAMRKQ5S/b41f2a5463a08d45
S3 Bucket:        lootprotocol-packages-603846588826-us-east-1
RDS Endpoint:     lootprotocol-database-dev-lootprotocoldbc1b2cf7d-wfwuptrvkadf.cwlmueqceyb8.us-east-1.rds.amazonaws.com
RDS Secret ARN:   arn:aws:secretsmanager:us-east-1:603846588826:secret:LootProtocolDbSecretF856926-wqPQzZY3TXjG-RSUSBT
Cognito Pool:     us-east-1_faqKwbSl8
Cognito Client:   f0h5bi21guaplh3s090o86gcb
Cognito Domain:   lootprotocol-dev
ACM Certificate:  arn:aws:acm:us-east-1:603846588826:certificate/cfdafc69-9fa8-45f4-a259-512e495e7fb7
CloudFront Dist:  E2U008XXVHKFXJ (d20b1ep30zrqwn.cloudfront.net)
Log Group:        /ecs/lootprotocol
```

---

## Architecture Overview

```
User → CloudFront (HTTPS) → ALB (HTTP, port 80) → ECS Fargate (port 3000) → RDS / S3 / Cognito
```

**Traffic flow:**
1. Users hit CloudFront over HTTPS
2. CloudFront forwards to ALB over HTTP (port 80). This is intentional — the ALB cert is for `lootprotocol.com`, not the ALB DNS name, so CloudFront cannot TLS-handshake with the ALB directly. The CF→ALB link is within AWS networking.
3. ALB port 80 forwards to the ECS target group on port 3000
4. ALB port 443 also forwards to the same target group (for direct ALB access via custom domain)
5. ECS tasks run in private subnets with egress via NAT gateway
6. RDS is in private subnets, accessible only from the ECS security group on port 5432

**Security groups:**

| SG | Inbound | Source |
|----|---------|--------|
| ALB SG (`sg-00b2d7607239ea1dc`) | TCP 80, 443 | 0.0.0.0/0 |
| ECS SG (`sg-0a0c8b924f60287b0`) | TCP 3000 | ALB SG |
| RDS SG (`sg-01cc9ca3f2d4f5303`) | TCP 5432 | ECS SG |

**CDK stack dependencies:**

```
VPC ──┬──→ Database ──┐
      ├──→ Storage ───┤
      └──→ Auth ──────┼──→ Compute ──→ CDN
```

---

## Routine Deployment (Code Changes)

This is the most common operation. Application code changed, infrastructure unchanged.

### Via CI/CD (Preferred)

Push to `main`. The GitHub Actions workflow (`.github/workflows/deploy.yml`) will:
1. Run `pnpm lint`, `pnpm type-check`, `pnpm test`
2. Build the Docker image for `linux/amd64`
3. Push to ECR tagged with the commit SHA
4. Force a new ECS deployment

**Required GitHub secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`

> `COGNITO_CLIENT_ID` = the Cognito User Pool Client ID (e.g., `f0h5bi21guaplh3s090o86gcb`)
> `COGNITO_DOMAIN` = the full Cognito hosted UI URL (e.g., `https://lootprotocol-dev.auth.us-east-1.amazoncognito.com`)

### Manual Deployment

When CI/CD is unavailable or you need to deploy from a local machine.

**Step 1 — Authenticate to ECR:**

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 603846588826.dkr.ecr.us-east-1.amazonaws.com
```

**Step 2 — Build the image:**

```bash
docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_COGNITO_CLIENT_ID=f0h5bi21guaplh3s090o86gcb \
  --build-arg NEXT_PUBLIC_COGNITO_DOMAIN=https://lootprotocol-dev.auth.us-east-1.amazoncognito.com \
  -t 603846588826.dkr.ecr.us-east-1.amazonaws.com/lootprotocol:latest \
  --load .
```

> **CRITICAL:** You MUST pass the `NEXT_PUBLIC_` build args. Next.js inlines these into the JavaScript bundle at build time — they have no effect if set only at runtime.

> **CRITICAL:** You MUST build for `linux/amd64`. ECS Fargate does not support ARM images. If building on Apple Silicon, `docker buildx` with `--platform linux/amd64` handles cross-compilation via QEMU. If the build fails with OOM during the Next.js compilation step, increase Docker/Colima memory to at least 8 GB.

**Step 3 — Push:**

```bash
docker push 603846588826.dkr.ecr.us-east-1.amazonaws.com/lootprotocol:latest
```

**Step 4 — Deploy to ECS:**

```bash
aws ecs update-service \
  --cluster lootprotocol-cluster \
  --service lootprotocol-service \
  --force-new-deployment
```

**Step 5 — Verify:**

```bash
# Wait ~60-90 seconds, then:
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:603846588826:targetgroup/LootPr-LootP-Z6JPVAMRKQ5S/b41f2a5463a08d45

# Should show State: "healthy"
# Then test:
curl -sk https://www.lootprotocol.com/api/health
# Or via CloudFront directly:
curl -sk https://d20b1ep30zrqwn.cloudfront.net/api/health
```

### What Happens on Deployment

1. ECS pulls the new image from ECR
2. A new task starts. The `docker-entrypoint.sh` runs:
   - Builds `DATABASE_URL` from env vars (`DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, etc.)
   - Runs `prisma db push` to sync the schema (creates missing tables, non-destructive for existing data)
3. `node server.js` starts Next.js standalone on port 3000
4. ALB health check hits `GET /api/health` every 30s — needs 2 consecutive 200s to mark healthy
5. Once healthy, the old task is drained and stopped
6. The ECS circuit breaker will rollback if 3 consecutive health checks fail

---

## Infrastructure Changes (CDK)

When you need to modify AWS resources (not just application code).

### Pre-flight

```bash
cd infra
npx cdk diff \
  -c certificateArn=arn:aws:acm:us-east-1:603846588826:certificate/cfdafc69-9fa8-45f4-a259-512e495e7fb7
```

Always run `diff` first. Review the output carefully — look for resources being **replaced** or **deleted**.

### Deploy

```bash
cd infra
npx cdk deploy --all --require-approval never \
  -c certificateArn=arn:aws:acm:us-east-1:603846588826:certificate/cfdafc69-9fa8-45f4-a259-512e495e7fb7 \
  --parameters LootProtocol-Auth-dev:GitHubClientId=Ov23liV3xjy9GdzggEuT \
  --parameters LootProtocol-Auth-dev:GitHubClientSecret=24bb7311a04d79cbde8f4a350a3feae4f8e420e1 \
  --parameters LootProtocol-Auth-dev:GoogleClientId=<YOUR_GOOGLE_CLIENT_ID> \
  --parameters LootProtocol-Auth-dev:GoogleClientSecretParam=<YOUR_GOOGLE_CLIENT_SECRET>
```

**Required context values:**
- `certificateArn` — The ACM certificate for the HTTPS listener. Must be in us-east-1.
- `stage` — Defaults to `dev`. Pass `-c stage=prod` for production.
- `domainName` — Defaults to `lootprotocol.com`.

**Required parameters (Auth stack):**
- `GitHubClientId` — GitHub OAuth App client ID
- `GitHubClientSecret` — GitHub OAuth App client secret
- `GoogleClientId` — Google OAuth Client ID
- `GoogleClientSecretParam` — Google OAuth Client Secret

### Deploy a single stack

```bash
npx cdk deploy LootProtocol-Compute-dev \
  -c certificateArn=arn:aws:acm:us-east-1:603846588826:certificate/cfdafc69-9fa8-45f4-a259-512e495e7fb7 \
  --parameters LootProtocol-Auth-dev:GitHubClientId=Ov23liV3xjy9GdzggEuT \
  --parameters LootProtocol-Auth-dev:GitHubClientSecret=24bb7311a04d79cbde8f4a350a3feae4f8e420e1 \
  --parameters LootProtocol-Auth-dev:GoogleClientId=<YOUR_GOOGLE_CLIENT_ID> \
  --parameters LootProtocol-Auth-dev:GoogleClientSecretParam=<YOUR_GOOGLE_CLIENT_SECRET>
```

> Note: CDK will automatically deploy dependency stacks if they have changes, even when targeting a single stack.

### CDN deployments are slow

CloudFront distribution updates take 3-5 minutes. This is normal. Do not cancel the deployment.

---

## First-Time / Fresh Deployment

If deploying to a new AWS account or rebuilding from scratch.

### Prerequisites

1. AWS CLI configured with credentials for the target account
2. Node.js 20+, pnpm, Docker
3. A registered domain (currently `lootprotocol.com`)
4. A GitHub OAuth App (Settings → Developer Settings → OAuth Apps)
   - Callback URL: `https://<cognito-domain>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
   - Homepage URL: `https://lootprotocol.com`
5. A Google OAuth Client (Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs)
   - Authorized redirect URI: `https://<cognito-domain>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

### Step-by-step

**1. Bootstrap CDK:**

```bash
cd infra
npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1
```

**2. Deploy infrastructure (without a running container):**

Before deploying, temporarily set `desiredCount: 0` in `infra/lib/compute-stack.ts` line 104. This lets the Compute stack create the ECR repository without needing a Docker image.

```bash
npx cdk deploy --all \
  --parameters LootProtocol-Auth-dev:GitHubClientId=<YOUR_GITHUB_CLIENT_ID> \
  --parameters LootProtocol-Auth-dev:GitHubClientSecret=<YOUR_GITHUB_CLIENT_SECRET> \
  --parameters LootProtocol-Auth-dev:GoogleClientId=<YOUR_GOOGLE_CLIENT_ID> \
  --parameters LootProtocol-Auth-dev:GoogleClientSecretParam=<YOUR_GOOGLE_CLIENT_SECRET>
```

> The Compute stack will create an ACM certificate that requires DNS validation. Watch the CloudFormation events for a CNAME record you must add to your DNS. The deploy will block until the certificate is validated. This can take 5-30 minutes after adding the record.

**3. Note the outputs:** After deploy, collect:
- ECR repository URI (from Compute stack output)
- ACM certificate ARN (from the AWS Console or `aws acm list-certificates`)

**4. Build and push the Docker image:**

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_COGNITO_CLIENT_ID=<COGNITO_CLIENT_ID> \
  --build-arg NEXT_PUBLIC_COGNITO_DOMAIN=https://<COGNITO_DOMAIN_PREFIX>.auth.us-east-1.amazoncognito.com \
  -t <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/lootprotocol:latest --load .

docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/lootprotocol:latest
```

**5. Scale up the service:**

Revert `desiredCount` back to `1` in `compute-stack.ts`, then:

```bash
npx cdk deploy LootProtocol-Compute-dev \
  -c certificateArn=<YOUR_CERT_ARN> \
  --parameters LootProtocol-Auth-dev:GitHubClientId=<ID> \
  --parameters LootProtocol-Auth-dev:GitHubClientSecret=<SECRET> \
  --parameters LootProtocol-Auth-dev:GoogleClientId=<ID> \
  --parameters LootProtocol-Auth-dev:GoogleClientSecretParam=<SECRET>
```

Or use the AWS CLI directly:

```bash
aws ecs update-service --cluster lootprotocol-cluster \
  --service lootprotocol-service --desired-count 1 --force-new-deployment
```

**6. Verify health:**

```bash
# Wait ~90 seconds
aws elbv2 describe-target-health --target-group-arn <TARGET_GROUP_ARN>
curl -sk https://<ALB_DNS>/api/health
```

**7. Deploy CDN stack** (if not already deployed in step 2):

```bash
npx cdk deploy LootProtocol-Cdn-dev \
  -c certificateArn=<YOUR_CERT_ARN> \
  --parameters LootProtocol-Auth-dev:GitHubClientId=<ID> \
  --parameters LootProtocol-Auth-dev:GitHubClientSecret=<SECRET> \
  --parameters LootProtocol-Auth-dev:GoogleClientId=<ID> \
  --parameters LootProtocol-Auth-dev:GoogleClientSecretParam=<SECRET>
```

**8. Configure DNS:**

Point your domain to the CloudFront distribution:
- `www.lootprotocol.com` → CNAME → `<distribution>.cloudfront.net`
- For apex domain (`lootprotocol.com`), use a 301 redirect to `https://www.lootprotocol.com` (GoDaddy Forwarding), or use Route 53 ALIAS / a DNS provider that supports CNAME flattening

---

## Troubleshooting Playbook

### Health checks failing — ECS tasks keep cycling

**Symptoms:** `runningCount: 0`, events show "is unhealthy in target-group", circuit breaker triggers.

**Diagnosis steps:**

```bash
# 1. Check service events
aws ecs describe-services --cluster lootprotocol-cluster \
  --services lootprotocol-service --query 'services[0].events[:10]'

# 2. Check stopped task reason
aws ecs list-tasks --cluster lootprotocol-cluster --desired-status STOPPED --query 'taskArns[:1]' --output text
# Then:
aws ecs describe-tasks --cluster lootprotocol-cluster --tasks <TASK_ARN> \
  --query 'tasks[0].{stoppedReason:stoppedReason,containers:containers[0].{exitCode:exitCode,reason:reason}}'

# 3. Check container logs
aws logs describe-log-streams --log-group-name /ecs/lootprotocol \
  --order-by LastEventTime --descending --limit 1 --query 'logStreams[0].logStreamName' --output text
# Then:
aws logs get-log-events --log-group-name /ecs/lootprotocol \
  --log-stream-name <STREAM_NAME> --limit 50 --query 'events[*].message' --output json

# 4. Check target group health
aws elbv2 describe-target-health --target-group-arn <TARGET_GROUP_ARN>

# 5. Check security groups allow ALB → ECS on port 3000
aws ec2 describe-security-groups --group-ids sg-0a0c8b924f60287b0 \
  --query 'SecurityGroups[0].IpPermissions'
```

**Common causes:**

| Cause | Log evidence | Fix |
|-------|-------------|-----|
| Wrong platform | `CannotPullContainerError: image Manifest does not contain descriptor matching platform 'linux/amd64'` | Rebuild with `--platform linux/amd64` |
| Next.js binds to wrong host | Logs show `http://localhost:3000` not `http://0.0.0.0:3000` | The Dockerfile sets `ENV HOSTNAME=0.0.0.0` but ECS Fargate overrides `HOSTNAME` at runtime. The server binds to the container hostname which IS reachable by the ALB — this is normal and correct. Do NOT force `HOSTNAME=0.0.0.0` in the entrypoint; it causes failures. |
| Prisma errors (tables missing) | `The table 'public.extensions' does not exist` | The entrypoint runs `prisma db push` automatically. If it failed, check that `DATABASE_URL` is built correctly from env vars. Check RDS security group allows ECS. |
| OOM during startup | Container killed with no logs | Increase task memory from 512 to 1024 in `compute-stack.ts` |
| Circuit breaker locked | Deployment stuck at 0 running | The circuit breaker may have set `desiredCount` to 0 after rollback. Run: `aws ecs update-service --cluster lootprotocol-cluster --service lootprotocol-service --desired-count 1 --force-new-deployment` |

### CloudFront returning 502

**Cause:** CloudFront cannot reach the ALB origin.

**Check:**
- The CDN stack must use `HTTP_ONLY` origin protocol (not HTTPS). The ALB cert is for `lootprotocol.com`, not the ALB DNS name. CloudFront cannot TLS-handshake with the ALB.
- The ALB port 80 listener must **forward** to the target group (not redirect to HTTPS).
- Verify in `infra/lib/cdn-stack.ts`: `protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY`
- Verify in `infra/lib/compute-stack.ts` the HTTP listener: `defaultAction: elbv2.ListenerAction.forward([targetGroup])`

### Database connection failures

```bash
# Check the secret value
aws secretsmanager get-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-1:603846588826:secret:LootProtocolDbSecretF856926-wqPQzZY3TXjG-RSUSBT \
  --query 'SecretString' --output text

# Check RDS is running
aws rds describe-db-instances \
  --query 'DBInstances[?DBInstanceIdentifier==`lootprotocol-database-dev`].DBInstanceStatus'
```

The entrypoint builds `DATABASE_URL` from individual env vars injected by ECS:
- `DB_HOST`, `DB_PORT`, `DB_NAME` — plain environment variables
- `DB_USERNAME`, `DB_PASSWORD` — injected from Secrets Manager at task startup

### CDK deploy fails with "already exists"

If a resource was manually created outside of CDK:

```bash
# Example: ECR repository manually created
aws ecr delete-repository --repository-name lootprotocol --force
# Then re-run cdk deploy
```

Never manually create resources that CDK manages. CDK expects to own the full lifecycle.

### CDK deploy fails with circuit breaker

If the Compute stack deploy triggers a new ECS deployment that fails health checks:

1. The CloudFormation update will roll back automatically
2. Fix the underlying issue (usually the Docker image)
3. Push a working image to ECR
4. Re-run `cdk deploy`

To unblock without CDK: set `desiredCount: 0` temporarily in the CDK code, deploy, then push image, then set back to 1.

---

## Known Gotchas

### 1. Fargate overrides the HOSTNAME env var

ECS Fargate sets `HOSTNAME` to the container's hostname (e.g., `ip-10-0-2-47.ec2.internal`). The Dockerfile's `ENV HOSTNAME=0.0.0.0` is overridden at runtime. **This is fine.** The ALB routes to the container's private IP, which matches the hostname. Do not try to force `HOSTNAME=0.0.0.0` in the entrypoint — it caused health check failures during initial deployment.

### 2. The Docker image MUST be linux/amd64

ECS Fargate runs on x86_64. If you build on Apple Silicon without `--platform linux/amd64`, the image will be ARM and Fargate will reject it with `CannotPullContainerError`. Always use `docker buildx build --platform linux/amd64`.

### 3. Cross-platform builds need memory

Building Next.js under QEMU emulation (amd64 on ARM host) is memory-hungry. The Next.js compilation step needs ~6 GB. If using Colima, start with at least 8 GB:

```bash
colima stop && colima start --memory 8 --cpu 4
```

### 4. No Prisma migration files — schema is pushed directly

The project does not use `prisma migrate`. There are no migration files in `prisma/migrations/`. The `docker-entrypoint.sh` runs `prisma db push --accept-data-loss` on every container start. This syncs the schema from `prisma/schema.prisma` to the database. It creates missing tables and columns but does NOT drop existing data columns. For destructive schema changes, you must handle the migration manually.

### 5. Auth stack requires CloudFormation parameters

The Auth stack uses `CfnParameter` for GitHub and Google OAuth credentials. Every `cdk deploy` that includes the Auth stack (including `--all`) must pass:

```
--parameters LootProtocol-Auth-dev:GitHubClientId=...
--parameters LootProtocol-Auth-dev:GitHubClientSecret=...
--parameters LootProtocol-Auth-dev:GoogleClientId=...
--parameters LootProtocol-Auth-dev:GoogleClientSecretParam=...
```

Omitting these will cause the deploy to prompt interactively (which fails in CI) or use previous values.

### 6. ACM certificate DNS validation

When CDK creates a new ACM certificate (no `certificateArn` context provided), the deploy blocks until DNS validation completes. You must add the CNAME record shown in the CloudFormation events to your DNS provider. Use `aws acm describe-certificate --certificate-arn <ARN>` to find the required CNAME. Validation can take 5-30+ minutes after the record propagates.

### 7. CloudFront updates are slow

Any change to the CloudFront distribution takes 3-5 minutes to propagate. This is normal AWS behavior. Do not cancel CDK deploys during this phase.

### 8. The S3 bucket has RETAIN removal policy

`StorageStack` sets `removalPolicy: cdk.RemovalPolicy.RETAIN` on the S3 bucket. Running `cdk destroy` will NOT delete the bucket or its contents. You must delete it manually via the AWS Console or CLI if needed.

### 9. NEXT_PUBLIC_ env vars must be set at Docker build time

Next.js inlines `NEXT_PUBLIC_*` variables into the JavaScript bundle during `next build`. Setting them only at ECS runtime (in `compute-stack.ts` environment) has **no effect** on client-side code. The Dockerfile declares `NEXT_PUBLIC_COGNITO_CLIENT_ID` and `NEXT_PUBLIC_COGNITO_DOMAIN` as build args — these must be passed via `--build-arg` during `docker build`. If omitted, auth redirects will break (Cognito domain and client ID will be empty strings, causing 404s).

### 10. ECS circuit breaker and rollback

The ECS service has `circuitBreaker: { rollback: true }`. If new tasks fail health checks, ECS automatically rolls back to the previous working task definition. This can also set `desiredCount` to 0 during CDK rollbacks. Check and reset if needed:

```bash
aws ecs update-service --cluster lootprotocol-cluster \
  --service lootprotocol-service --desired-count 1
```

---

## File Reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: deps → builder → runner. Installs `prisma` globally in runner for schema push. |
| `scripts/docker-entrypoint.sh` | Builds `DATABASE_URL` from env vars, runs `prisma db push`, then `exec`s the CMD. |
| `.github/workflows/deploy.yml` | CI/CD: test → build → push to ECR → force ECS deployment. Triggers on push to `main`. |
| `infra/bin/app.ts` | CDK app entry. Defines all 6 stacks, their props, and dependency order. Reads `stage`, `domainName`, `certificateArn` from CDK context. |
| `infra/lib/vpc-stack.ts` | VPC (10.0.0.0/16), 2 AZs, 1 NAT gateway, 3 security groups (ALB, ECS, RDS). |
| `infra/lib/database-stack.ts` | RDS PostgreSQL 16 (t4g.micro), private subnets, 20-100 GB storage, 7-day backups. Exports endpoint, port, secret ARN. |
| `infra/lib/storage-stack.ts` | S3 bucket (versioned, encrypted, CORS enabled, RETAIN policy). |
| `infra/lib/auth-stack.ts` | Cognito User Pool + GitHub OIDC provider + Google identity provider + User Pool Client. Takes GitHub and Google OAuth creds as CloudFormation parameters. Callback URLs include `lootprotocol.com`, `www.lootprotocol.com`, CloudFront URL, and localhost. |
| `infra/lib/compute-stack.ts` | ECR repo, ECS cluster, Fargate task def (256 CPU / 512 MB), ALB with HTTP+HTTPS listeners, target group with `/api/health` check. |
| `infra/lib/cdn-stack.ts` | CloudFront distribution. HTTP_ONLY origin to ALB. Caches `/_next/static/*` and `/images/*`. Custom domain names (`lootprotocol.com`, `www.lootprotocol.com`) attached via ACM certificate when `certificateArn` context is provided. |
| `prisma/schema.prisma` | 5 models: Profile, Extension, ExtensionVersion, DownloadEvent, UserInstall. |
| `src/app/api/health/route.ts` | Health endpoint. Returns `{"status":"ok","timestamp":"..."}` with HTTP 200. No database dependency. |
| `src/middleware.ts` | Route protection. Matcher does NOT include `/api/health` — health checks are always unauthenticated. |

---

## Environment Variables (ECS Task)

Set in `infra/lib/compute-stack.ts`:

| Variable | Source | Value |
|----------|--------|-------|
| `NODE_ENV` | Hardcoded | `production` |
| `S3_BUCKET` | StorageStack output | `lootprotocol-packages-603846588826-us-east-1` |
| `S3_REGION` | CDK `Aws.REGION` | `us-east-1` |
| `COGNITO_USER_POOL_ID` | AuthStack output | `us-east-1_faqKwbSl8` |
| `COGNITO_CLIENT_ID` | AuthStack output | `f0h5bi21guaplh3s090o86gcb` |
| `COGNITO_DOMAIN` | AuthStack output | `lootprotocol-dev` |
| `NEXT_PUBLIC_APP_URL` | Derived from `domainName` | `https://lootprotocol.com` |
| `NEXT_PUBLIC_API_URL` | Derived from `domainName` | `https://lootprotocol.com/api` |
| `DB_HOST` | DatabaseStack output | RDS endpoint |
| `DB_PORT` | DatabaseStack output | `5432` |
| `DB_NAME` | Hardcoded | `lootprotocol` |
| `DB_USERNAME` | Secrets Manager | `postgres` |
| `DB_PASSWORD` | Secrets Manager | (auto-generated by RDS) |

The entrypoint assembles these into `DATABASE_URL=postgresql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}`.

---

## Quick Reference Commands

```bash
# Check service health
aws ecs describe-services --cluster lootprotocol-cluster --services lootprotocol-service \
  --query 'services[0].{desired:desiredCount,running:runningCount,status:status}'

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:603846588826:targetgroup/LootPr-LootP-Z6JPVAMRKQ5S/b41f2a5463a08d45

# Get latest logs
STREAM=$(aws logs describe-log-streams --log-group-name /ecs/lootprotocol \
  --order-by LastEventTime --descending --limit 1 \
  --query 'logStreams[0].logStreamName' --output text)
aws logs get-log-events --log-group-name /ecs/lootprotocol \
  --log-stream-name "$STREAM" --limit 50 --query 'events[*].message' --output json

# Force new deployment
aws ecs update-service --cluster lootprotocol-cluster \
  --service lootprotocol-service --force-new-deployment

# Scale to 0 (emergency stop)
aws ecs update-service --cluster lootprotocol-cluster \
  --service lootprotocol-service --desired-count 0

# Scale back up
aws ecs update-service --cluster lootprotocol-cluster \
  --service lootprotocol-service --desired-count 1

# CDK synth (dry run)
cd infra && npx cdk synth \
  -c certificateArn=arn:aws:acm:us-east-1:603846588826:certificate/cfdafc69-9fa8-45f4-a259-512e495e7fb7

# CDK diff (preview changes)
cd infra && npx cdk diff \
  -c certificateArn=arn:aws:acm:us-east-1:603846588826:certificate/cfdafc69-9fa8-45f4-a259-512e495e7fb7

# Get DB credentials
aws secretsmanager get-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-1:603846588826:secret:LootProtocolDbSecretF856926-wqPQzZY3TXjG-RSUSBT \
  --query 'SecretString' --output text
```
