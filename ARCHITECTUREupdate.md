# Architecture Update — Ghost Job Detector (Vercel)

**Decision**: Remove Edge Config from the runtime path. Adopt a durable SQL system-of-record (Vercel Postgres/Neon), a high-throughput coordination layer (Vercel KV), and object storage for raw artifacts (Vercel Blob). Keep the API surface and user flows intact; replace Edge Config reads/writes with typed queries and feature flags sourced from environment variables.

---

## Scope

* **In scope**: Data ingestion, parsing, scoring, persistence, admin visibility, and background processing.
* **Out of scope**: Model training pipeline, public analytics dashboards beyond current UI, multi-region failover.

---

## Why change?

* **Edge Config** is optimized for low-latency configuration, not as a primary datastore. We need durable history, relational queries, and auditability.
* **Postgres + JSONB** gives us structured + semi-structured storage in one place (listings + reason codes + raw parse JSON) with indexes.
* **KV** provides lightweight queues, locks, and rate limits to scale ingestion and analysis without coupling to the SoR.
* **Blob** persists source artifacts (PDFs/HTML) so we can re-parse and audit later.

---

## Target Architecture (v1)

```
Client (submit link/PDF)
   │  POST /api/submit
   ▼
KV (q:ingest)  ◀── idempotency/locks (seen:{sha}, lock:ingest:{sha})
   │  cron/worker tick
   ▼
Ingest Worker ──► Blob (raw PDF/HTML snapshot)
   │             └► Postgres.raw_documents
   │
   ├─► Parse/Normalize → Postgres.job_listings (upsert)
   └─► Enqueue listing → KV (q:analysis)
                      cron/worker tick
                          │
                          ▼
                  Analysis Worker → Postgres.analyses (score + reasons)
                                          │
                                          └─► Admin UI (/admin) live table
```

---

## Components

* **Postgres (Vercel Postgres/Neon)**

  * Tables: `sources`, `raw_documents`, `job_listings`, `analyses`, `events`, plus existing `companies`, `key_factors`, `users`.
  * Extensions: `pg_trgm` (fuzzy), `pg_stat_statements` (optional), `pgvector` (future).

* **KV (Vercel KV/Upstash)**

  * Queues: `q:ingest`, `q:analysis` (lists/streams)
  * Idempotency & locks: `seen:source:{sha}`, `lock:ingest:{sha}`
  * Rate limits: `rate:user:{userId}:{date}`

* **Blob (Vercel Blob)**

  * Stores uploaded PDFs and HTML snapshots; key referenced by `raw_documents.storage_url`.

* **Next.js**

  * Endpoints: `/api/submit`, `/api/ingest/tick`, `/api/analysis/tick`, `/admin` (SSR + SSE/WS for live updates).

---

## Data Model (summary)

* **sources**: (id, kind=url|pdf, url/blob\_url, content\_sha256, http\_status, first\_seen\_at, last\_seen\_at)
* **raw\_documents**: (id, source\_id→sources, storage\_url, mime\_type, text\_content?, text\_sha256)
* **job\_listings**: (id, source\_id→sources, title, company, location?, remote\_flag?, posted\_at?, canonical\_url?, raw\_parsed\_json JSONB, normalized\_key UNIQUE)
* **analyses**: (id, job\_listing\_id→job\_listings, score NUMERIC, verdict TEXT, reasons\_json JSONB, model\_version TEXT, created\_at)
* **events**: (id, kind, ref\_table, ref\_id, meta JSONB, created\_at)

Key indexes:

* `UNIQUE (sources.content_sha256)`
* `UNIQUE (job_listings.normalized_key)`
* GIN full-text on `raw_documents.text_content`
* `(analyses.job_listing_id, analyses.created_at DESC)`

Materialized view (optional): `latest_scores` for fast admin grids.

---

## Environment Variables (Vercel → Project → Settings → Environment Variables)

**Postgres**

* `POSTGRES_PRISMA_URL` (use this for Prisma `DATABASE_URL`)
* `POSTGRES_URL_NON_POOLING` (use for Prisma `DIRECT_URL` / migrations)
* (Provided by Vercel Postgres: `POSTGRES_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_DATABASE`)

**KV**

* `KV_REST_API_URL`
* `KV_REST_API_TOKEN`

**Blob**

* `BLOB_READ_WRITE_TOKEN`
* `BLOB_READ_ONLY_TOKEN` (optional for read-only clients)

**App**

* `NEXTAUTH_SECRET` or equivalent auth secret (if using Auth.js)
* Any feature flags formerly in Edge Config → move to `.env` (e.g., `FEATURE_LIVE_UPDATES=true`)

---

## Dependencies

```bash
# Data access
npm i prisma @prisma/client

# KV + Blob
npm i @vercel/kv @vercel/blob

# (optional) Postgres driver helpers if needed
npm i @neondatabase/serverless

# Types & validation
npm i zod
```

Prisma bootstrap:

```bash
npx prisma init
# .env
# DATABASE_URL="${POSTGRES_PRISMA_URL}"
# DIRECT_URL="${POSTGRES_URL_NON_POOLING}"

# After modeling schema.prisma
npx prisma migrate dev    # local
npx prisma generate
# In production deploys, Prisma runs `migrate deploy` by default
```

---

## Removing Edge Config

1. Uninstall: `npm rm @vercel/edge-config`
2. Vercel Dashboard → Edge Config → delete store (optional)
3. Code: replace `get()` calls and any dynamic flags with either:

   * Environment variables (for static flags), or
   * Postgres-backed feature flags table if you need runtime changes.
4. Replace all persistence that wrote to Edge Config with typed Prisma queries.

---

## Background Processing (Cron)

Create two cron jobs in **Vercel → Settings → Functions → Cron Jobs**:

* `*/1 * * * *` → `GET https://<your-domain>/api/ingest/tick`
* `*/1 * * * *` → `GET https://<your-domain>/api/analysis/tick`

The tick handlers should:

* Pop N jobs from `q:ingest`/`q:analysis`
* Perform unit-of-work with retries
* On failure >N, move to `q:deadletter:*` and log an `events` row

---

## Observability & Admin

* **/admin**: Auth-gated SSR table with server-side pagination over Postgres, showing latest score per listing. Optional SSE/WebSocket for live updates.
* **Read-only DB role** (Neon): Create a role for ad-hoc reads from the SQL console without write privileges.
* **Events** table for ingest/analysis lifecycle; helpful for debugging and analytics.

---

## Migration Plan

1. **Provision** Postgres, KV, Blob in Vercel; set env vars for all environments (Development/Preview/Production). Redeploy to inject runtime env.
2. **Prisma schema**: Port current SQLite models; add `sources`, `raw_documents`, `analyses`, `events`. Generate migrations and apply.
3. **Swap reads**: Update `/api/history` and `/api/stats` to query Postgres.
4. **Swap writes**: Update `/api/submit` (or existing analyze route) to write `sources` + enqueue KV.
5. **Workers**: Add `/api/ingest/tick` and `/api/analysis/tick` to process queues.
6. **Admin UI**: Add `/admin` page with latest scores and filters (company, verdict, date).
7. **Decommission**: Remove Edge Config package & references. Delete the store when traffic proves stable for 48 hours.

Rollback plan:

* Keep a feature flag `USE_NEW_PIPELINE=false` in env to route writes to the old path for the first 24h (if still present). Turn `true` after confidence.

---

## Testing Strategy

* **Unit**: Parsing utilities, scoring heuristics (deterministic fixtures).
* **Integration**: Submit → queues → DB with a seeded link and a test PDF.
* **Load**: Enqueue 1k lightweight jobs; verify worker drain time and DB write latency.
* **Observability**: Assert `events` rows for each major step and error.

---

## Risks & Mitigations

* **Queue backlog**: Use small batch size with exponential backoff; add `q:deadletter:*`.
* **Duplicate ingestion**: Enforce `UNIQUE (sources.content_sha256)` and KV `seen:source:{sha}`.
* **PDF parsing variability**: Store original file in Blob; capture text + mime for reprocessing.
* **Costs**: Monitor Neon compute/autosleep, Upstash RPS, Blob egress. Add budget alerts.

---

## Future Enhancements

* **pgvector** for semantic dedupe and cluster “evergreen” postings.
* **Materialized views** and scheduled refresh for analytics.
* **Webhooks** for anomaly alerts (sudden surge of likely-ghost patterns).

---

## Acceptance Criteria

* No Edge Config usage in runtime code.
* Listings, parses, and analyses visible in Postgres (UI console + Prisma Studio).
* Ingestion and analysis workers drain queues under realistic load.
* `/admin` shows latest score per listing and can filter by company/verdict/date.
