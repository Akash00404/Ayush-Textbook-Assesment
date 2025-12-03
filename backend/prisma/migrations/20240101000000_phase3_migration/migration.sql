-- Phase 3 Migration: AI Features, Conflict Detection, Reviewer Scores

-- Create AI Summary table
CREATE TABLE "ai_summaries" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "summary_text" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "language" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model_version" TEXT,
    "confidence_score" DOUBLE PRECISION,

    CONSTRAINT "ai_summaries_pkey" PRIMARY KEY ("id")
);

-- Create Conflict Flag table
CREATE TYPE "ConflictType" AS ENUM ('SCORE_VARIANCE', 'COMMENT_DISAGREEMENT', 'RECOMMENDATION_MISMATCH', 'CRITERION_SPECIFIC', 'OVERALL_DISAGREEMENT');
CREATE TYPE "ConflictSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE "conflict_flags" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "criterion_code" TEXT,
    "conflict_type" "ConflictType" NOT NULL,
    "severity" "ConflictSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "reviewer_ids" JSONB NOT NULL,
    "score_variance" DOUBLE PRECISION,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolution_notes" TEXT,

    CONSTRAINT "conflict_flags_pkey" PRIMARY KEY ("id")
);

-- Create Reviewer Score table
CREATE TABLE "reviewer_scores" (
    "id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "consistency_score" DOUBLE PRECISION,
    "timeliness_score" DOUBLE PRECISION,
    "quality_score" DOUBLE PRECISION,
    "reliability_score" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "average_review_quality" DOUBLE PRECISION,
    "last_calculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviewer_scores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reviewer_scores_reviewer_id_key" UNIQUE ("reviewer_id")
);

-- Add foreign key constraints
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conflict_flags" ADD CONSTRAINT "conflict_flags_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviewer_scores" ADD CONSTRAINT "reviewer_scores_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes for performance
CREATE INDEX "ai_summaries_book_id_idx" ON "ai_summaries"("book_id");
CREATE INDEX "conflict_flags_book_id_idx" ON "conflict_flags"("book_id");
CREATE INDEX "conflict_flags_resolved_idx" ON "conflict_flags"("resolved");
CREATE INDEX "reviewer_scores_reviewer_id_idx" ON "reviewer_scores"("reviewer_id");

-- Update JobType enum to include new job types
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'AI_SUMMARIZATION';
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'CONFLICT_DETECTION';
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'REVIEWER_SCORE_CALCULATION';

