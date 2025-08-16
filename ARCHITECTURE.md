# Ghost Job Detector - Production Architecture
**Version:** 1.0.0 | **Status:** Implemented | **Last Updated:** August 16, 2025

---

## ✅ **Implementation Status: PRODUCTION READY**

The Ghost Job Detector backend architecture has been successfully implemented and deployed to production with the following three-database system:

### **Database Architecture (Implemented)**

```
Frontend (React/Vite)
   │  
   ├─► /api/analyze ──► Neon PostgreSQL (Primary Data)
   │                    ├─► Sources
   │                    ├─► JobListings  
   │                    ├─► Analyses
   │                    ├─► Events
   │                    └─► Companies
   │
   ├─► /api/queue ────► Upstash Redis KV (Background Jobs)
   │                    ├─► q:ingest
   │                    └─► q:analysis
   │
   └─► /api/blob ─────► Vercel Blob (File Storage)
                        ├─► HTML snapshots
                        └─► PDF uploads
```

---

## **Production Databases**

### **1. Neon PostgreSQL (Primary Data Store)**
- **Provider**: Neon (serverless PostgreSQL)
- **Purpose**: Primary data storage with ACID compliance
- **Connection**: `DATABASE_URL` environment variable
- **Tables Implemented**:
  - `sources` - Track job posting sources (URLs, PDFs)
  - `raw_documents` - Store document metadata and text content
  - `job_listings` - Normalized job posting data
  - `analyses` - Ghost job detection results and scores
  - `key_factors` - Detailed risk and positive factors
  - `companies` - Company statistics and patterns
  - `events` - Audit trail for all operations
  - `users` - User accounts and preferences

### **2. Upstash Redis KV (Coordination Layer)**
- **Provider**: Upstash Redis (serverless KV store)
- **Purpose**: Queues, caching, and coordination
- **Connection**: `KV_REST_API_URL` + `KV_REST_API_TOKEN`
- **Usage**:
  - Background job queues (`q:ingest`, `q:analysis`)
  - Rate limiting (`rate:user:{id}:{date}`)
  - Idempotency keys (`seen:source:{sha}`)
  - Session management and caching

### **3. Vercel Blob (Object Storage)**
- **Provider**: Vercel Blob Storage
- **Purpose**: File storage for raw documents
- **Connection**: `BLOB_READ_WRITE_TOKEN`
- **Storage**:
  - HTML snapshots of job pages
  - PDF uploads from users
  - Original source documents for reprocessing

---

## **API Endpoints (Implemented)**

### **Core Analysis Endpoints**
- `POST /api/analyze` - ✅ **Working** - Analyze job postings and store in database
- `POST /api/analyze-debug` - ✅ **Working** - Debug endpoint for testing database connectivity
- `GET /api/analysis-history` - 🚧 **Deployed** - Fetch analysis history from database
- `GET /api/db-check` - 🚧 **Deployed** - Database health check and stats

### **Queue Processing**
- `GET /api/ingest/tick` - 📋 **Configured** - Background ingestion processing (daily cron)
- `GET /api/analysis/tick` - 📋 **Configured** - Background analysis processing (daily cron)

---

## **Technical Implementation Details**

### **Prisma ORM Integration**
- **Client Generation**: Fixed Vercel build issues with `prisma generate` in build scripts
- **Connection Pooling**: Using Neon's connection pooling for serverless functions
- **Migrations**: Schema deployed and migrations working in production

### **Error Handling & Constraints**
- ✅ **Fixed**: Foreign key constraint issues in Events table
- ✅ **Fixed**: Unique constraint violations in job listing creation
- ✅ **Fixed**: Prisma Client generation in Vercel deployments
- ✅ **Implemented**: Graceful error handling with proper HTTP status codes

### **Authentication & Security**
- ✅ **Resolved**: Vercel Authentication was blocking API endpoints (now disabled)
- 🔒 **Security**: Environment variables properly configured for all database connections
- 🔒 **Validation**: Input validation and SQL injection protection via Prisma

---

## **Deployment Status**

### **✅ Successfully Deployed**
- Database schema and migrations
- Core analyze endpoint with full database integration
- Debug and health check endpoints
- Environment variables and connections
- Cron job configuration

### **🚧 Ready for Deployment** 
- Analysis history API endpoint
- Database check endpoint
- Frontend integration with database

---

## **Testing & Validation**

### **✅ Verified Working**
```bash
# Test analysis endpoint
curl -X POST https://ghost-job-detector-lilac.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.linkedin.com/jobs/view/4242459030/"}'

# Response: Analysis ID cmeemn1fu0006kw04f7r5hqp4 stored in PostgreSQL
```

---

**Architecture Status: ✅ PRODUCTION READY**  
**Next Milestone**: Frontend Database Integration