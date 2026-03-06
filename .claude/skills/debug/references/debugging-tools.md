# Debugging Tools Reference

## Node.js Debugging

### Console methods beyond console.log
```typescript
// Structured object inspection (better than JSON.stringify)
console.dir(object, { depth: null, colors: true });

// Table format for arrays of objects
console.table(users, ['id', 'name', 'role']);

// Timing
console.time('db-query');
await pool.query(sql);
console.timeEnd('db-query'); // db-query: 45.123ms

// Stack trace without throwing
console.trace('How did we get here?');

// Group related logs
console.group('Request processing');
console.log('Auth:', userId);
console.log('Body:', body);
console.groupEnd();
```

### Node.js inspector
```bash
# Start with inspector (opens Chrome DevTools)
node --inspect src/server.ts

# Break on first line
node --inspect-brk src/server.ts

# Attach to running process
kill -USR1 <pid>  # Enables inspector on running Node process
```

### Heap snapshots for memory leaks
```bash
# Generate heap snapshot
node --inspect --expose-gc app.js
# In Chrome DevTools: Memory tab → Take heap snapshot → Compare snapshots
```

## PostgreSQL Query Analysis

### EXPLAIN for slow queries
```sql
-- Basic execution plan
EXPLAIN SELECT * FROM extensions WHERE slug = 'my-skill';

-- With actual execution stats (runs the query)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT e.*, p.github_username
FROM extensions e
JOIN profiles p ON p.id = e.publisher_id
WHERE e.search_vector @@ plainto_tsquery('english', 'code review')
ORDER BY ts_rank(e.search_vector, plainto_tsquery('english', 'code review')) DESC
LIMIT 20;
```

### What to look for in EXPLAIN output
| Pattern | Problem | Fix |
|---------|---------|-----|
| `Seq Scan` on large table | Missing index | Add index on filtered/joined columns |
| `Sort` with high cost | Sorting in memory without index | Add index matching the ORDER BY |
| `Nested Loop` with high rows | N+1 query pattern | Use JOINs or batch queries |
| `Hash Join` with wrong estimate | Stale statistics | Run `ANALYZE table_name` |
| High `actual time` vs `rows` | Processing too much data | Add WHERE clauses, use LIMIT |

### Useful diagnostic queries
```sql
-- Currently running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Index usage (find unused indexes)
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Slow queries log (if configured)
-- Set in postgresql.conf: log_min_duration_statement = 100  (ms)
```

## AWS CloudWatch

### Log Insights queries
```
# Find errors in ECS logs
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50

# Find slow API responses
fields @timestamp, @message
| filter @message like /response_time/
| parse @message '"response_time":*,' as response_ms
| filter response_ms > 1000
| sort response_ms desc

# Count errors per endpoint
fields @timestamp, @message
| filter @message like /ERROR/
| parse @message '"path":"*"' as path
| stats count() by path
| sort count desc
```

### Tailing ECS logs from CLI
```bash
# Stream logs from ECS service
aws logs tail /ecs/lootprotocol --follow --since 10m

# Filter for errors
aws logs tail /ecs/lootprotocol --follow --filter-pattern "ERROR"

# Get logs for specific time range
aws logs get-log-events \
  --log-group-name /ecs/lootprotocol \
  --log-stream-name "ecs/lootprotocol/TASK_ID" \
  --start-time $(date -d '1 hour ago' +%s000)
```

## Network Debugging

### curl for API testing
```bash
# GET with headers
curl -v http://localhost:3000/api/extensions \
  -H "Authorization: Bearer TOKEN"

# POST with JSON body
curl -X POST http://localhost:3000/api/extensions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "test", "type": "skill"}'

# POST with file upload
curl -X POST http://localhost:3000/api/extensions \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@archive.tar.gz" \
  -F "type=skill"

# Show response headers and timing
curl -o /dev/null -w "HTTP %{http_code} | Time: %{time_total}s | DNS: %{time_namelookup}s\n" \
  http://localhost:3000/api/extensions

# Follow redirects (for OAuth)
curl -L -v http://localhost:3000/api/auth/login
```

### DNS/network checks
```bash
# DNS resolution
dig lootprotocol.example.com
nslookup lootprotocol.example.com

# Port check
nc -zv hostname 5432  # PostgreSQL
nc -zv hostname 443   # HTTPS

# SSL certificate info
openssl s_client -connect lootprotocol.example.com:443 -servername lootprotocol.example.com
```

## Docker Debugging

```bash
# Check container logs
docker logs CONTAINER_ID --tail 100 -f

# Exec into running container
docker exec -it CONTAINER_ID /bin/sh

# Check container resource usage
docker stats CONTAINER_ID

# Inspect container configuration
docker inspect CONTAINER_ID | jq '.[0].Config.Env'
docker inspect CONTAINER_ID | jq '.[0].NetworkSettings'

# Check if port is exposed
docker port CONTAINER_ID
```

## Git Bisect (Finding Which Commit Broke Things)

```bash
# Start bisect
git bisect start

# Mark current commit as bad
git bisect bad

# Mark a known good commit
git bisect good abc123

# Git checks out a middle commit. Test it, then:
git bisect good  # if this commit works
git bisect bad   # if this commit is broken

# Repeat until git identifies the first bad commit

# Automate with a test script
git bisect start HEAD abc123
git bisect run npm test

# Clean up
git bisect reset
```
