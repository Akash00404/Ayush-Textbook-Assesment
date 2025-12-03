import { prisma } from '../index';

interface ReviewerScoreData {
  reviewerId: string;
  consistencyScore: number;
  timelinessScore: number;
  qualityScore: number;
  reliabilityScore: number;
  reviewCount: number;
  averageReviewQuality?: number;
}

/**
 * Calculate consistency score based on variance in scores across similar books
 */
async function calculateConsistencyScore(reviewerId: string): Promise<number> {
  const reviews = await prisma.review.findMany({
    where: {
      reviewer_id: reviewerId,
      draft_flag: false,
    },
    include: {
      assignment: {
        include: {
          book: true,
        },
      },
    },
  });

  if (reviews.length < 3) {
    return 70; // Default score for reviewers with few reviews
  }

  // Group reviews by similar criteria and calculate variance
  const allScores: Record<string, number[]> = {};

  reviews.forEach((review) => {
    const scores = review.scores as Record<string, number>;
    Object.keys(scores).forEach((criterionCode) => {
      if (!allScores[criterionCode]) {
        allScores[criterionCode] = [];
      }
      allScores[criterionCode].push(scores[criterionCode]);
    });
  });

  // Calculate coefficient of variation for each criterion
  const coefficients: number[] = [];
  Object.values(allScores).forEach((scores) => {
    if (scores.length >= 3) {
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);
      const coefficient = mean > 0 ? stdDev / mean : 0;
      coefficients.push(coefficient);
    }
  });

  if (coefficients.length === 0) {
    return 70;
  }

  // Lower coefficient of variation = more consistent = higher score
  const avgCoefficient = coefficients.reduce((a, b) => a + b, 0) / coefficients.length;
  // Convert to 0-100 scale (inverse relationship)
  const consistencyScore = Math.max(0, Math.min(100, 100 - (avgCoefficient * 50)));

  return consistencyScore;
}

/**
 * Calculate timeliness score based on on-time submissions
 */
async function calculateTimelinessScore(reviewerId: string): Promise<number> {
  const assignments = await prisma.assignment.findMany({
    where: {
      reviewer_id: reviewerId,
      status: 'COMPLETED',
    },
    include: {
      reviews: {
        where: {
          reviewer_id: reviewerId,
          draft_flag: false,
        },
      },
    },
  });

  if (assignments.length === 0) {
    return 70;
  }

  let onTimeCount = 0;
  let totalCount = 0;

  assignments.forEach((assignment) => {
    if (assignment.reviews.length > 0) {
      totalCount++;
      const review = assignment.reviews[0];
      const submittedAt = review.submitted_at;
      const dueDate = assignment.due_date;

      // Consider on-time if submitted before or on due date
      if (submittedAt <= dueDate) {
        onTimeCount++;
      }
    }
  });

  if (totalCount === 0) {
    return 70;
  }

  // Calculate percentage and convert to 0-100 scale
  const onTimePercentage = (onTimeCount / totalCount) * 100;
  return onTimePercentage;
}

/**
 * Calculate quality score based on review depth and usefulness
 */
async function calculateQualityScore(reviewerId: string): Promise<number> {
  const reviews = await prisma.review.findMany({
    where: {
      reviewer_id: reviewerId,
      draft_flag: false,
    },
  });

  if (reviews.length === 0) {
    return 70;
  }

  let totalQuality = 0;

  reviews.forEach((review) => {
    const comments = review.comments as Record<string, string>;
    const scores = review.scores as Record<string, number>;

    // Factors for quality:
    // 1. Comment length and detail (0-40 points)
    const overallComment = comments['OVERALL'] || '';
    const commentScore = Math.min(40, overallComment.length / 10); // 10 chars = 1 point, max 40

    // 2. Number of criteria with comments (0-30 points)
    const criteriaWithComments = Object.keys(comments).filter(
      (key) => key !== 'OVERALL' && comments[key] && comments[key].trim().length > 0
    ).length;
    const criteriaScore = Math.min(30, criteriaWithComments * 5); // 5 points per criterion, max 30

    // 3. Score distribution (not all same scores) (0-30 points)
    const scoreValues = Object.values(scores);
    const uniqueScores = new Set(scoreValues).size;
    const distributionScore = Math.min(30, uniqueScores * 7.5); // More variety = better

    totalQuality += commentScore + criteriaScore + distributionScore;
  });

  const averageQuality = totalQuality / reviews.length;
  // Normalize to 0-100 scale
  return Math.min(100, averageQuality);
}

/**
 * Calculate overall reliability score
 */
function calculateReliabilityScore(
  consistency: number,
  timeliness: number,
  quality: number
): number {
  // Weighted average: consistency 30%, timeliness 30%, quality 40%
  return (
    consistency * 0.3 +
    timeliness * 0.3 +
    quality * 0.4
  );
}

/**
 * Calculate and update reviewer score
 */
export async function calculateReviewerScore(reviewerId: string): Promise<ReviewerScoreData> {
  const [consistencyScore, timelinessScore, qualityScore] = await Promise.all([
    calculateConsistencyScore(reviewerId),
    calculateTimelinessScore(reviewerId),
    calculateQualityScore(reviewerId),
  ]);

  const reliabilityScore = calculateReliabilityScore(
    consistencyScore,
    timelinessScore,
    qualityScore
  );

  const reviewCount = await prisma.review.count({
    where: {
      reviewer_id: reviewerId,
      draft_flag: false,
    },
  });

  // Get average review quality from committee ratings (if available)
  // This would come from committee feedback on reviews
  const averageReviewQuality = null; // TODO: Implement committee rating system

  const scoreData: ReviewerScoreData = {
    reviewerId,
    consistencyScore,
    timelinessScore,
    qualityScore,
    reliabilityScore,
    reviewCount,
    averageReviewQuality,
  };

  // Upsert reviewer score
  await prisma.reviewerScore.upsert({
    where: { reviewer_id: reviewerId },
    update: {
      consistency_score: consistencyScore,
      timeliness_score: timelinessScore,
      quality_score: qualityScore,
      reliability_score: reliabilityScore,
      review_count: reviewCount,
      average_review_quality: averageReviewQuality,
      last_calculated: new Date(),
    },
    create: {
      reviewer_id: reviewerId,
      consistency_score: consistencyScore,
      timeliness_score: timelinessScore,
      quality_score: qualityScore,
      reliability_score: reliabilityScore,
      review_count: reviewCount,
      average_review_quality: averageReviewQuality,
    },
  });

  return scoreData;
}

/**
 * Calculate scores for all reviewers
 */
export async function calculateAllReviewerScores(): Promise<void> {
  const reviewers = await prisma.user.findMany({
    where: {
      role: 'REVIEWER',
    },
  });

  await Promise.all(
    reviewers.map((reviewer) => calculateReviewerScore(reviewer.id))
  );
}

/**
 * Get reviewer score
 */
export async function getReviewerScore(reviewerId: string): Promise<ReviewerScoreData | null> {
  const score = await prisma.reviewerScore.findUnique({
    where: { reviewer_id: reviewerId },
  });

  if (!score) {
    return null;
  }

  return {
    reviewerId: score.reviewer_id,
    consistencyScore: score.consistency_score || 0,
    timelinessScore: score.timeliness_score || 0,
    qualityScore: score.quality_score || 0,
    reliabilityScore: score.reliability_score || 0,
    reviewCount: score.review_count,
    averageReviewQuality: score.average_review_quality || undefined,
  };
}

