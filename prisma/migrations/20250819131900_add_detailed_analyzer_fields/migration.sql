-- Add detailed analyzer processing fields to analyses table
ALTER TABLE "public"."analyses" ADD COLUMN "algorithmAssessment" JSONB;
ALTER TABLE "public"."analyses" ADD COLUMN "riskFactorsAnalysis" JSONB;
ALTER TABLE "public"."analyses" ADD COLUMN "recommendation" JSONB;
ALTER TABLE "public"."analyses" ADD COLUMN "analysisDetails" JSONB;
ALTER TABLE "public"."analyses" ADD COLUMN "modelConfidence" DECIMAL(5,4);
ALTER TABLE "public"."analyses" ADD COLUMN "ghostProbability" DECIMAL(5,4);
ALTER TABLE "public"."analyses" ADD COLUMN "analysisId" TEXT;

-- Add indexes for new fields
CREATE INDEX "analyses_ghostProbability_idx" ON "public"."analyses"("ghostProbability");
CREATE INDEX "analyses_analysisId_idx" ON "public"."analyses"("analysisId");

-- Add missing models for parsing corrections and job corrections
CREATE TABLE "public"."parsing_corrections" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "originalTitle" TEXT,
    "correctTitle" TEXT,
    "originalCompany" TEXT,
    "correctCompany" TEXT,
    "parserUsed" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "correctionReason" TEXT,
    "domainPattern" TEXT,
    "urlPattern" TEXT,
    "confidence" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "correctedBy" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parsing_corrections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."job_corrections" (
    "id" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "userVerified" BOOLEAN NOT NULL DEFAULT true,
    "algorithmVerified" BOOLEAN NOT NULL DEFAULT false,
    "learningWeight" DECIMAL(3,2) NOT NULL DEFAULT 0.6,
    "correctionReason" TEXT,
    "validationData" JSONB,
    "isForceCommit" BOOLEAN NOT NULL DEFAULT false,
    "correctedBy" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_corrections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."algorithm_feedback" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "correctedData" JSONB NOT NULL,
    "confidenceScore" DECIMAL(5,4) NOT NULL,
    "learningWeight" DECIMAL(3,2) NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "improvementAreas" JSONB,
    "validationMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "algorithm_feedback_pkey" PRIMARY KEY ("id")
);

-- Create indexes for parsing corrections
CREATE INDEX "parsing_corrections_sourceUrl_idx" ON "public"."parsing_corrections"("sourceUrl");
CREATE INDEX "parsing_corrections_parserUsed_parserVersion_idx" ON "public"."parsing_corrections"("parserUsed", "parserVersion");
CREATE INDEX "parsing_corrections_domainPattern_idx" ON "public"."parsing_corrections"("domainPattern");
CREATE INDEX "parsing_corrections_correctedBy_idx" ON "public"."parsing_corrections"("correctedBy");
CREATE INDEX "parsing_corrections_isVerified_idx" ON "public"."parsing_corrections"("isVerified");

-- Create indexes for job corrections
CREATE INDEX "job_corrections_jobListingId_idx" ON "public"."job_corrections"("jobListingId");
CREATE INDEX "job_corrections_fieldName_idx" ON "public"."job_corrections"("fieldName");
CREATE INDEX "job_corrections_correctedBy_idx" ON "public"."job_corrections"("correctedBy");
CREATE INDEX "job_corrections_createdAt_idx" ON "public"."job_corrections"("createdAt");

-- Create indexes for algorithm feedback
CREATE INDEX "algorithm_feedback_sourceUrl_idx" ON "public"."algorithm_feedback"("sourceUrl");
CREATE INDEX "algorithm_feedback_feedbackType_idx" ON "public"."algorithm_feedback"("feedbackType");
CREATE INDEX "algorithm_feedback_createdAt_idx" ON "public"."algorithm_feedback"("createdAt");

-- Fix companies table unique constraint
ALTER TABLE "public"."companies" DROP CONSTRAINT "companies_name_key";
CREATE UNIQUE INDEX "companies_normalizedName_key" ON "public"."companies"("normalizedName");

-- Update EventKind enum to include missing values
ALTER TYPE "public"."EventKind" ADD VALUE 'agent_validate';
ALTER TYPE "public"."EventKind" ADD VALUE 'agent_promotion';

-- Add foreign key constraints for job corrections
ALTER TABLE "public"."job_corrections" ADD CONSTRAINT "job_corrections_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "public"."job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;