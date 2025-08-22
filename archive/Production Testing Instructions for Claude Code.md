## Production Testing Instructions for Claude Code

**Primary Rule:** Never run database operations locally. Always test on live production environment.

### Required Commands for Claude Code:

```bash
# Deploy changes to production
git add .
git commit -m "Phase X: [description]"
git push origin main

# Verify deployment
vercel --prod
```

### Testing Workflow:
1. **Make code changes** in files
2. **Deploy immediately** using git push (triggers auto-deployment)
3. **Test endpoints** using curl against production URLs
4. **Check logs** with `vercel logs --prod`
5. **Verify database** using production API endpoints, not local queries

### Database Operations:
- **Schema changes**: Edit `prisma/schema.prisma` then deploy
- **Migrations**: Let Vercel auto-run migrations on deployment
- **Testing**: Use `/api/db-check` endpoint instead of local Prisma commands
- **Debugging**: Check Neon dashboard for database issues

### API Testing Commands:
```bash
# Test parsing endpoint
curl -X POST https://ghost-job-detector-lilac.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"test-url"}'

# Check database health
curl https://ghost-job-detector-lilac.vercel.app/api/db-check
```

### Never Run Locally:
- `npm run dev`
- `npx prisma migrate`
- `npx prisma studio`
- `npx prisma generate`
- Any database connections

This approach eliminates Prisma local issues and tests in the actual production environment.