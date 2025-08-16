# Vercel Database Setup Instructions w/ database snippets added
**Ghost Job Detector - Production Backend Setup**

ghost-job-postgres Prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url  	    = env("DATABASE_URL")
}

ghost-job-postgres .env.local
# Recommended for most uses
DATABASE_URL=postgres://neondb_owner:npg_Aja1LBSe3VXZ@ep-icy-breeze-ad4cwcc9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# For uses requiring a connection without pgbouncer
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_Aja1LBSe3VXZ@ep-icy-breeze-ad4cwcc9.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Parameters for constructing your own connection string
PGHOST=ep-icy-breeze-ad4cwcc9-pooler.c-2.us-east-1.aws.neon.tech
PGHOST_UNPOOLED=ep-icy-breeze-ad4cwcc9.c-2.us-east-1.aws.neon.tech
PGUSER=neondb_owner
PGDATABASE=neondb
PGPASSWORD=npg_Aja1LBSe3VXZ

# Parameters for Vercel Postgres Templates
POSTGRES_URL=postgres://neondb_owner:npg_Aja1LBSe3VXZ@ep-icy-breeze-ad4cwcc9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL_NON_POOLING=postgres://neondb_owner:npg_Aja1LBSe3VXZ@ep-icy-breeze-ad4cwcc9.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_USER=neondb_owner
POSTGRES_HOST=ep-icy-breeze-ad4cwcc9-pooler.c-2.us-east-1.aws.neon.tech
POSTGRES_PASSWORD=npg_Aja1LBSe3VXZ
POSTGRES_DATABASE=neondb
POSTGRES_URL_NO_SSL=postgres://neondb_owner:npg_Aja1LBSe3VXZ@ep-icy-breeze-ad4cwcc9-pooler.c-2.us-east-1.aws.neon.tech/neondb
POSTGRES_PRISMA_URL=postgres://neondb_owner:npg_Aja1LBSe3VXZ@ep-icy-breeze-ad4cwcc9-pooler.c-2.us-east-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require

# Neon Auth environment variables for Next.js
NEXT_PUBLIC_STACK_PROJECT_ID=84e93b82-6afa-49d7-a640-eab576e9cd40
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_3n6c5q2qn9jeseh9k58bf9dxaq430vxh2b5akmjs7epd0
STACK_SECRET_SERVER_KEY=ssk_th78101vgepdd1rxg90gr1crpcnkh5a76q1g39hnc0p9g


ghost-job-blob
import { put } from "@vercel/blob";
const { url } = await put('articles/blob.txt', 'Hello World!', { access: 'public' });
Unique Store ID = store_jaatsJ4mYEwWCIRk
Base URL = https://jaatsj4myewwcirk.public.blob.vercel-storage.com

ghost-job-kv TypeScript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: 'https://talented-tetra-18805.upstash.io',
  token: 'AUl1AAIncDFjMDQ4Njg2YWY0ODA0MTgzYTJkOTU5OTRlNzRkNzVjZXAxMTg4MDU',
})

await redis.set('foo', 'bar');
const data = await redis.get('foo');

ghost-job-kv .env.local
KV_URL="rediss://default:AUl1AAIncDFjMDQ4Njg2YWY0ODA0MTgzYTJkOTU5OTRlNzRkNzVjZXAxMTg4MDU@talented-tetra-18805.upstash.io:6379"
KV_REST_API_URL="https://talented-tetra-18805.upstash.io"
KV_REST_API_TOKEN="AUl1AAIncDFjMDQ4Njg2YWY0ODA0MTgzYTJkOTU5OTRlNzRkNzVjZXAxMTg4MDU"
KV_REST_API_READ_ONLY_TOKEN="Akl1AAIgcDGStLDZ3qQ613UpunaoSazI5MV-vOWgm22ZoiGQ5am2Zg"
REDIS_URL="rediss://default:AUl1AAIncDFjMDQ4Njg2YWY0ODA0MTgzYTJkOTU5OTRlNzRkNzVjZXAxMTg4MDU@talented-tetra-18805.upstash.io:6379"

## Overview
This guide sets up the three-database architecture:
1. **`ghost-job-postgres`** - Primary PostgreSQL database (Vercel Postgres/Neon)
2. **`ghost-job-kv`** - Key-Value store for queues and locks (Vercel KV/Upstash)
3. **`ghost-job-blob`** - Object storage for PDFs and HTML snapshots (Vercel Blob)



## Step 6: Install Dependencies

Add these to your `package.json`:

```bash
npm install prisma @prisma/client @vercel/kv @vercel/blob zod
npm install -D @types/node
```

---

## Step 7: Initialize Prisma

1. **Initialize Prisma** (if not already done):
```bash
npx prisma init
```

2. **Update `.env.local`**:
```env
# Database URLs (copy from Vercel dashboard)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# KV Configuration
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."

# Blob Configuration
BLOB_READ_WRITE_TOKEN="..."
```

3. **Generate Prisma Client**:
```bash
npx prisma generate
```

4. **Create and run migration**:
```bash
npx prisma migrate dev --name init
```

---

## Step 8: Set Up Cron Jobs

1. In Vercel dashboard, go to **Settings** → **Functions** → **Cron Jobs**
2. Add two cron jobs:

**Ingest Worker**:
- **Schedule**: `*/1 * * * *` (every minute)
- **Function**: `/api/ingest/tick`

**Analysis Worker**:
- **Schedule**: `*/1 * * * *` (every minute)  
- **Function**: `/api/analysis/tick`

---

## Step 9: Configure Environment Variables

Add these additional environment variables in **Settings** → **Environment Variables**:

```env
# Application Configuration
NEXTAUTH_SECRET=your-random-secret-here
FEATURE_LIVE_UPDATES=true
FEATURE_PDF_UPLOAD=true

# Model Configuration
ML_MODEL_VERSION=v1.0.0

# Rate Limiting
DEFAULT_RATE_LIMIT=1000

# Queue Configuration
QUEUE_BATCH_SIZE=10
QUEUE_RETRY_ATTEMPTS=3
```

---

## Step 10: Deploy and Test

1. **Deploy updated code**:
```bash
git add .
git commit -m "Add Vercel database integration"
git push
```

2. **Test database connections**:
   - Go to your deployed Vercel URL
   - Submit a test job analysis
   - Check Vercel dashboard logs for successful database writes

3. **Verify databases**:
   - **Postgres**: Use Vercel dashboard SQL console or Prisma Studio
   - **KV**: Monitor queue lengths in dashboard
   - **Blob**: Check uploaded files in dashboard

---

## Step 11: Production Checklist

### Database Optimization
- [ ] **Postgres**: Enable connection pooling
- [ ] **Postgres**: Set up read replicas (if needed)
- [ ] **KV**: Monitor usage and set alerts
- [ ] **Blob**: Configure CDN settings

### Security
- [ ] **Environment Variables**: Set for all environments (Development, Preview, Production)
- [ ] **Database Access**: Restrict to Vercel IP ranges only
- [ ] **Blob Access**: Configure proper read/write permissions
- [ ] **API Rate Limiting**: Implement user-based limits

### Monitoring
- [ ] **Database Performance**: Set up alerts for slow queries
- [ ] **Queue Health**: Monitor queue lengths and processing times
- [ ] **Storage Usage**: Set up billing alerts for Blob storage
- [ ] **Error Tracking**: Configure Sentry or similar

---

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Test connection locally
npx prisma db pull
```

**2. KV Connection Issues**
```typescript
// Test KV in API route
import { kv } from '@vercel/kv';
const result = await kv.set('test', 'value');
```

**3. Blob Upload Failures**
```typescript
// Check Blob token permissions
import { put } from '@vercel/blob';
// Ensure BLOB_READ_WRITE_TOKEN is set
```

### Database Console Access

**Postgres**:
- Vercel Dashboard → Storage → ghost-job-postgres → Query
- Or use: `npx prisma studio`

**KV**:
- Vercel Dashboard → Storage → ghost-job-kv → Data Browser

**Blob**:
- Vercel Dashboard → Storage → ghost-job-blob → Files

---

## Next Steps After Setup

1. **Test the full pipeline**:
   - Submit job analysis → Check Postgres tables
   - Verify queue processing → Check KV queues
   - Upload PDF → Check Blob storage

2. **Build admin dashboard**:
   - Create `/admin` route for monitoring
   - Display latest analyses from Postgres
   - Show queue health from KV

3. **Scale considerations**:
   - Monitor database performance
   - Implement caching strategies
   - Plan for backup and disaster recovery

---

## Cost Optimization Tips

- **Postgres**: Use connection pooling to reduce connection costs
- **KV**: Batch queue operations to reduce API calls  
- **Blob**: Implement lifecycle policies for old files
- **General**: Monitor usage dashboards and set billing alerts

Your three-database architecture will be ready for production use once these steps are completed!