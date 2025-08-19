-- CreateEnum
CREATE TYPE "public"."SourceKind" AS ENUM ('url', 'pdf');

-- CreateEnum
CREATE TYPE "public"."AnalysisVerdict" AS ENUM ('likely_real', 'uncertain', 'likely_ghost');

-- CreateEnum
CREATE TYPE "public"."FactorType" AS ENUM ('risk', 'positive');

-- CreateEnum
CREATE TYPE "public"."EventKind" AS ENUM ('source_submitted', 'document_processed', 'analysis_completed', 'analysis_failed', 'queue_processed', 'admin_action');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'ADMIN', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "public"."sources" (
    "id" TEXT NOT NULL,
    "kind" "public"."SourceKind" NOT NULL,
    "url" TEXT,
    "blobUrl" TEXT,
    "contentSha256" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."raw_documents" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "textContent" TEXT,
    "textSha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_listings" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "remoteFlag" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "canonicalUrl" TEXT,
    "rawParsedJson" JSONB NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analyses" (
    "id" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "score" DECIMAL(5,4) NOT NULL,
    "verdict" "public"."AnalysisVerdict" NOT NULL,
    "reasonsJson" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."key_factors" (
    "id" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "factorType" "public"."FactorType" NOT NULL,
    "factorDescription" TEXT NOT NULL,
    "impactScore" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "key_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "totalPostings" INTEGER NOT NULL DEFAULT 0,
    "avgGhostProbability" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "lastAnalyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "id" TEXT NOT NULL,
    "kind" "public"."EventKind" NOT NULL,
    "refTable" TEXT,
    "refId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_contentSha256_key" ON "public"."sources"("contentSha256");

-- CreateIndex
CREATE INDEX "sources_contentSha256_idx" ON "public"."sources"("contentSha256");

-- CreateIndex
CREATE INDEX "sources_kind_firstSeenAt_idx" ON "public"."sources"("kind", "firstSeenAt");

-- CreateIndex
CREATE INDEX "raw_documents_sourceId_idx" ON "public"."raw_documents"("sourceId");

-- CreateIndex
CREATE INDEX "raw_documents_textSha256_idx" ON "public"."raw_documents"("textSha256");

-- CreateIndex
CREATE UNIQUE INDEX "job_listings_normalizedKey_key" ON "public"."job_listings"("normalizedKey");

-- CreateIndex
CREATE INDEX "job_listings_sourceId_idx" ON "public"."job_listings"("sourceId");

-- CreateIndex
CREATE INDEX "job_listings_company_idx" ON "public"."job_listings"("company");

-- CreateIndex
CREATE INDEX "job_listings_normalizedKey_idx" ON "public"."job_listings"("normalizedKey");

-- CreateIndex
CREATE INDEX "job_listings_postedAt_idx" ON "public"."job_listings"("postedAt");

-- CreateIndex
CREATE INDEX "analyses_jobListingId_createdAt_idx" ON "public"."analyses"("jobListingId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "analyses_verdict_idx" ON "public"."analyses"("verdict");

-- CreateIndex
CREATE INDEX "analyses_modelVersion_idx" ON "public"."analyses"("modelVersion");

-- CreateIndex
CREATE INDEX "key_factors_jobListingId_idx" ON "public"."key_factors"("jobListingId");

-- CreateIndex
CREATE INDEX "key_factors_factorType_idx" ON "public"."key_factors"("factorType");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "public"."companies"("name");

-- CreateIndex
CREATE INDEX "companies_normalizedName_idx" ON "public"."companies"("normalizedName");

-- CreateIndex
CREATE INDEX "companies_totalPostings_idx" ON "public"."companies"("totalPostings");

-- CreateIndex
CREATE INDEX "events_kind_createdAt_idx" ON "public"."events"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "events_refTable_refId_idx" ON "public"."events"("refTable", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- AddForeignKey
ALTER TABLE "public"."raw_documents" ADD CONSTRAINT "raw_documents_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_listings" ADD CONSTRAINT "job_listings_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."analyses" ADD CONSTRAINT "analyses_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "public"."job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."key_factors" ADD CONSTRAINT "key_factors_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "public"."job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_refId_fkey" FOREIGN KEY ("refId") REFERENCES "public"."sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
