import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../index';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ReviewData {
  reviewerId: string;
  reviewerName: string;
  scores: Record<string, number>;
  comments: Record<string, string>;
  submittedAt: Date;
}

interface AISummaryResult {
  summary: string;
  strengths: Array<{ point: string; reviewerQuotes: Array<{ reviewerId: string; reviewerName: string; quote: string }> }>;
  weaknesses: Array<{ point: string; reviewerQuotes: Array<{ reviewerId: string; reviewerName: string; quote: string }> }>;
  recommendations: Array<{ point: string; reviewerQuotes: Array<{ reviewerId: string; reviewerName: string; quote: string }> }>;
  language?: string;
  confidenceScore?: number;
}

interface ConflictDetectionResult {
  conflicts: Array<{
    type: 'SCORE_VARIANCE' | 'COMMENT_DISAGREEMENT' | 'RECOMMENDATION_MISMATCH' | 'CRITERION_SPECIFIC' | 'OVERALL_DISAGREEMENT';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    criterionCode?: string;
    description: string;
    reviewerIds: string[];
    scoreVariance?: number;
  }>;
}

interface ActionSuggestionResult {
  suggestedActions: Array<{
    action: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    rationale: string;
    relatedCriteria?: string[];
  }>;
  decisionSupport: {
    recommendation: 'APPROVE' | 'REJECT' | 'NEEDS_REVISION';
    confidence: number;
    reasoning: string;
  };
}

/**
 * Generate AI summary of reviews using Gemini
 */
export async function generateAISummary(
  bookId: string,
  reviews: ReviewData[],
  bookTitle: string,
  language?: string
): Promise<AISummaryResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Prepare review data for prompt
    const reviewTexts = reviews.map((review, idx) => {
      const scoresText = Object.entries(review.scores)
        .map(([code, score]) => `${code}: ${score}/5`)
        .join(', ');
      const commentsText = Object.entries(review.comments)
        .filter(([_, comment]) => comment && comment.trim())
        .map(([code, comment]) => `${code}: "${comment}"`)
        .join('\n');

      return `Reviewer ${idx + 1} (${review.reviewerName}):
Scores: ${scoresText}
Comments:
${commentsText || 'No specific comments'}
---`;
    }).join('\n\n');

    const prompt = `You are an AI assistant helping to summarize textbook reviews for the NCISM (National Commission for Indian System of Medicine) review system.

Book Title: ${bookTitle}

Reviews Summary:
${reviewTexts}

Please generate a comprehensive executive summary with the following structure:

1. **Summary**: A concise 2-3 paragraph overview of the overall reviewer feedback.

2. **Strengths**: List 3-5 key strengths identified by reviewers. For each strength:
   - Provide a clear point
   - Include direct quotes from reviewers (with reviewer name) that support this strength
   - Format: "Strength point" - [Reviewer Name]: "quote"

3. **Weaknesses**: List 3-5 key weaknesses or areas for improvement. For each weakness:
   - Provide a clear point
   - Include direct quotes from reviewers (with reviewer name) that support this weakness
   - Format: "Weakness point" - [Reviewer Name]: "quote"

4. **Recommendations**: List 3-5 actionable recommendations for the author/committee. For each recommendation:
   - Provide a clear recommendation
   - Include relevant reviewer quotes (with reviewer name)
   - Format: "Recommendation" - [Reviewer Name]: "quote"

${language ? `Note: Support multilingual terminology for Ayurveda/Unani/Siddha systems.` : ''}

Please respond in JSON format:
{
  "summary": "overall summary text",
  "strengths": [
    {
      "point": "strength description",
      "reviewerQuotes": [
        {"reviewerId": "id", "reviewerName": "name", "quote": "exact quote"}
      ]
    }
  ],
  "weaknesses": [
    {
      "point": "weakness description",
      "reviewerQuotes": [
        {"reviewerId": "id", "reviewerName": "name", "quote": "exact quote"}
      ]
    }
  ],
  "recommendations": [
    {
      "point": "recommendation description",
      "reviewerQuotes": [
        {"reviewerId": "id", "reviewerName": "name", "quote": "exact quote"}
      ]
    }
  ],
  "language": "${language || 'en'}",
  "confidenceScore": 0.85
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let parsed: AISummaryResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      // Fallback: try to extract structured data from text
      console.error('Failed to parse Gemini JSON response, using fallback');
      parsed = {
        summary: text,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        language: language || 'en',
        confidenceScore: 0.7,
      };
    }

    return parsed;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    throw new Error('Failed to generate AI summary');
  }
}

/**
 * Detect conflicts in reviews using Gemini
 */
export async function detectConflicts(
  bookId: string,
  reviews: ReviewData[],
  criteria: Array<{ code: string; label: string }>
): Promise<ConflictDetectionResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Calculate score variance for each criterion
    const criterionVariances: Record<string, { scores: number[]; variance: number; mean: number }> = {};
    
    criteria.forEach((criterion) => {
      const scores = reviews
        .map((r) => r.scores[criterion.code])
        .filter((s) => s !== undefined) as number[];
      
      if (scores.length > 1) {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        criterionVariances[criterion.code] = { scores, variance, mean };
      }
    });

    // Prepare review comparison data
    const reviewComparison = reviews.map((review, idx) => {
      const scoresText = Object.entries(review.scores)
        .map(([code, score]) => {
          const criterion = criteria.find((c) => c.code === code);
          return `${criterion?.label || code}: ${score}/5`;
        })
        .join(', ');
      
      const overallComment = review.comments['OVERALL'] || '';
      
      return `Reviewer ${idx + 1} (${review.reviewerName}, ID: ${review.reviewerId}):
Scores: ${scoresText}
Overall Comment: "${overallComment}"
---`;
    }).join('\n\n');

    const varianceInfo = Object.entries(criterionVariances)
      .map(([code, data]) => {
        const criterion = criteria.find((c) => c.code === code);
        return `${criterion?.label || code}: Mean=${data.mean.toFixed(2)}, Variance=${data.variance.toFixed(2)}, Scores=[${data.scores.join(', ')}]`;
      })
      .join('\n');

    const prompt = `You are analyzing multiple reviews of the same textbook to detect conflicts and disagreements.

Review Data:
${reviewComparison}

Statistical Variance by Criterion:
${varianceInfo}

Please identify conflicts where reviewers strongly disagree. Consider:
1. High variance in scores (>1.5 variance indicates significant disagreement)
2. Contradictory comments on the same aspects
3. Different overall recommendations (approve vs reject vs needs revision)
4. Specific criteria where opinions diverge significantly

For each conflict detected, provide:
- Type: SCORE_VARIANCE, COMMENT_DISAGREEMENT, RECOMMENDATION_MISMATCH, CRITERION_SPECIFIC, or OVERALL_DISAGREEMENT
- Severity: LOW, MEDIUM, HIGH, or CRITICAL (based on impact on decision)
- Criterion code (if applicable)
- Description of the conflict
- Reviewer IDs involved
- Score variance (if applicable)

Respond in JSON format:
{
  "conflicts": [
    {
      "type": "SCORE_VARIANCE",
      "severity": "HIGH",
      "criterionCode": "CONTENT_QUALITY",
      "description": "Reviewers disagree significantly on content quality...",
      "reviewerIds": ["id1", "id2"],
      "scoreVariance": 2.5
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let parsed: ConflictDetectionResult;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse conflict detection response');
      // Fallback: generate conflicts based on variance
      parsed = {
        conflicts: Object.entries(criterionVariances)
          .filter(([_, data]) => data.variance > 1.5)
          .map(([code, data]) => ({
            type: 'SCORE_VARIANCE' as const,
            severity: data.variance > 3 ? 'CRITICAL' as const : data.variance > 2 ? 'HIGH' as const : 'MEDIUM' as const,
            criterionCode: code,
            description: `High variance (${data.variance.toFixed(2)}) in scores for ${code}`,
            reviewerIds: reviews.map((r) => r.reviewerId),
            scoreVariance: data.variance,
          })),
      };
    }

    return parsed;
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    throw new Error('Failed to detect conflicts');
  }
}

/**
 * Generate action suggestions using Gemini
 */
export async function generateActionSuggestions(
  bookId: string,
  reviews: ReviewData[],
  aiSummary: AISummaryResult,
  conflicts: ConflictDetectionResult,
  bookTitle: string
): Promise<ActionSuggestionResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are providing decision support for a textbook review committee.

Book Title: ${bookTitle}

AI Summary:
${aiSummary.summary}

Key Strengths:
${aiSummary.strengths.map((s) => `- ${s.point}`).join('\n')}

Key Weaknesses:
${aiSummary.weaknesses.map((w) => `- ${w.point}`).join('\n')}

Detected Conflicts:
${conflicts.conflicts.map((c) => `- ${c.type} (${c.severity}): ${c.description}`).join('\n')}

Review Scores Summary:
${reviews.map((r) => {
  const avgScore = Object.values(r.scores).reduce((a, b) => a + b, 0) / Object.keys(r.scores).length;
  return `Reviewer ${r.reviewerName}: Average score ${avgScore.toFixed(2)}/5`;
}).join('\n')}

Please provide:
1. **Suggested Actions**: 5-7 actionable recommendations for the author/committee, prioritized by importance
2. **Decision Support**: A recommendation (APPROVE, REJECT, or NEEDS_REVISION) with confidence level and reasoning

Respond in JSON format:
{
  "suggestedActions": [
    {
      "action": "Specific action to take",
      "priority": "HIGH",
      "rationale": "Why this action is important",
      "relatedCriteria": ["CRITERION_CODE"]
    }
  ],
  "decisionSupport": {
    "recommendation": "NEEDS_REVISION",
    "confidence": 0.75,
    "reasoning": "Detailed reasoning for the recommendation..."
  }
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let parsed: ActionSuggestionResult;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse action suggestions response');
      // Fallback decision support
      const avgScore = reviews.reduce((sum, r) => {
        const rAvg = Object.values(r.scores).reduce((a, b) => a + b, 0) / Object.keys(r.scores).length;
        return sum + rAvg;
      }, 0) / reviews.length;

      parsed = {
        suggestedActions: [],
        decisionSupport: {
          recommendation: avgScore >= 4 ? 'APPROVE' : avgScore >= 3 ? 'NEEDS_REVISION' : 'REJECT',
          confidence: 0.6,
          reasoning: `Based on average score of ${avgScore.toFixed(2)}/5`,
        },
      };
    }

    return parsed;
  } catch (error) {
    console.error('Error generating action suggestions:', error);
    throw new Error('Failed to generate action suggestions');
  }
}

/**
 * Auto-detect language from review comments
 */
export async function detectLanguage(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Detect the primary language of this text. Respond with only the language code (e.g., "en", "hi", "sa" for Sanskrit, "ar" for Arabic/Unani). If multiple languages, return the primary one.

Text: "${text.substring(0, 500)}"

Language code:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim().toLowerCase().substring(0, 2) || 'en';
  } catch (error) {
    console.error('Error detecting language:', error);
    return 'en'; // Default to English
  }
}

