# Common Error Patterns and Root Causes

## TypeScript / Node.js

| Error | Likely Root Cause | Fix |
|-------|------------------|-----|
| `TypeError: Cannot read properties of undefined (reading 'x')` | Accessing a property on a value that is undefined. Check the variable before the `.x` | Add null check, optional chaining `?.`, or fix the source of the undefined value |
| `TypeError: x is not a function` | Variable is not what you think it is. Common: importing default when named, or object when function | Check import statement. `import { fn }` vs `import fn` |
| `ReferenceError: x is not defined` | Variable used before declaration, wrong scope, or typo in name | Check spelling, import, or move declaration before usage |
| `SyntaxError: Unexpected token` | JSON.parse on non-JSON, or imported ESM from CJS | Wrap `JSON.parse` in try/catch; check `"type": "module"` in package.json |
| `ERR_MODULE_NOT_FOUND` | Import path wrong, file extension missing, or package not installed | Check path, add `.js` extension for ESM, run `npm install` |
| `ENOENT: no such file or directory` | File path is wrong or file does not exist | Verify path with `fs.existsSync()`, check working directory |
| `EACCES: permission denied` | Insufficient file system permissions | Check file ownership and permissions with `ls -la` |
| `ENOMEM: not enough memory` | Process exceeds memory limit. Large file in memory, unbounded array, memory leak | Stream large files, paginate data, check for retained references |
| `ERR_HTTP_HEADERS_SENT` | Trying to send response after already sending one. Double `res.send()` or missing `return` | Add `return` before response in conditional branches |

## React / Next.js

| Error | Likely Root Cause | Fix |
|-------|------------------|-----|
| `Hydration mismatch` | Server and client render different HTML. Date/time, random values, browser-only APIs | Use `useEffect` for client-only values, `suppressHydrationWarning` for dates |
| `Cannot update a component while rendering a different component` | Setting state during render of another component. Usually in a `useMemo` or derived calculation | Move the state update to `useEffect` or restructure the data flow |
| `Invalid hook call` | Hook called outside component, wrong React version, or duplicate React in bundle | Check hook rules, `npm ls react` for duplicates |
| `Objects are not valid as a React child` | Rendering `{object}` instead of `{object.property}` or `{JSON.stringify(object)}` | Render specific properties, not the whole object |
| `Each child should have a unique key prop` | Missing or non-unique `key` on list items | Use stable unique ID from data, not array index |
| `Maximum update depth exceeded` | Infinite re-render loop. useEffect sets state that triggers itself | Check useEffect deps, add missing deps or restructure to break the cycle |
| `Next.js 404 on API route` | File named wrong, export named wrong, or in wrong directory | Verify `export async function GET/POST/etc`, check file is in `app/api/` |
| `"use client" errors` | Using hooks in server component, or importing client component wrong | Add `"use client"` directive, or restructure to keep interactivity in client components |

## PostgreSQL

| Error | Likely Root Cause | Fix |
|-------|------------------|-----|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL is not running, or wrong host/port | Start PostgreSQL, check `DATABASE_URL` |
| `password authentication failed` | Wrong password or user does not exist | Verify credentials in connection string |
| `relation "x" does not exist` | Table not created yet, wrong schema, or case-sensitive name | Run migrations, check schema name, use `"tableName"` for case-sensitive |
| `duplicate key value violates unique constraint` | Inserting a row that conflicts with a unique index | Use `ON CONFLICT` clause or check before inserting |
| `null value in column "x" violates not-null constraint` | Inserting null where the column does not allow it | Provide a value, add a default in the schema, or make the column nullable |
| `column "x" does not exist` | Typo in column name, or migration not run | Check column name against schema, run pending migrations |
| `deadlock detected` | Two transactions waiting on each other | Consistent lock ordering, reduce transaction scope, add retry logic |
| `connection terminated unexpectedly` | Database restarted, connection pool exhausted, or idle timeout | Add connection pool health checks, handle reconnection |
| `too many clients already` | Connection pool too large or connections not released | Check pool size, ensure `.release()` is called in `finally` blocks |

## AWS

| Error | Likely Root Cause | Fix |
|-------|------------------|-----|
| `AccessDenied` (S3) | IAM policy missing required S3 actions, or bucket policy denies | Check task role IAM policy, check bucket policy |
| `NoSuchBucket` | Bucket name wrong or bucket does not exist | Verify bucket name, check region |
| `NoSuchKey` (S3) | Object key does not exist. Wrong path or file not uploaded | Verify the S3 key, check if upload succeeded |
| `ExpiredToken` / `TokenExpired` | AWS credentials expired. Common with temporary credentials | Refresh credentials, check token lifetime configuration |
| `UnrecognizedClientException` (Cognito) | Wrong user pool ID or region | Verify `COGNITO_USER_POOL_ID` and `AWS_REGION` |
| `NotAuthorizedException` (Cognito) | Invalid or expired token, wrong client ID | Verify token, check `COGNITO_CLIENT_ID` |
| `ResourceNotFoundException` (RDS) | Database instance not found. Wrong identifier | Check RDS instance identifier and region |
| `timeout` (ECS health check) | App not responding on health check port/path | Verify health check path returns 200, check container port mapping |
| `CannotPullContainerError` | ECR image not found or permissions issue | Check image URI, verify ECR permissions in task execution role |

## Network / HTTP

| Error | Likely Root Cause | Fix |
|-------|------------------|-----|
| `CORS error` | Missing or wrong CORS headers on server | Configure `Access-Control-Allow-Origin` on API |
| `ERR_CERT_AUTHORITY_INVALID` | Self-signed cert or missing CA in chain | Add cert to trust store, or fix cert chain |
| `429 Too Many Requests` | Rate limit hit | Add retry with exponential backoff, reduce request frequency |
| `502 Bad Gateway` | Backend crashed or not responding, ALB timeout | Check app logs, increase ALB timeout, fix crash |
| `504 Gateway Timeout` | Backend too slow, ALB/CloudFront timeout | Optimize slow queries, increase timeout, add caching |
