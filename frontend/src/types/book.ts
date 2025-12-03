export enum BookStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISIONS_REQUESTED = 'REVISIONS_REQUESTED'
}

export interface Book {
  id: string;
  title: string;
  author: string;
  publisher: string;
  year: number;
  edition: string;
  subject: string;
  uploadDate: string;
  status: BookStatus;
  filePath: string;
  uploaderId: string;
  uploader?: {
    name: string;
    email: string;
  };
  assignments?: Assignment[];
  aggregateResults?: AggregateResult;
  committeeDecision?: CommitteeDecision;
}

export interface Assignment {
  id: string;
  bookId: string;
  reviewerId: string;
  assignedDate: string;
  dueDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  book?: Book;
  reviewer?: {
    id: string;
    name: string;
    email: string;
    department?: string;
    institution?: string;
  };
  review?: Review;
}

export interface Review {
  id: string;
  assignmentId: string;
  reviewerId: string;
  bookId: string;
  submissionDate: string;
  isDraft: boolean;
  scores: CriteriaScore[];
  comments: string;
  recommendation: 'APPROVE' | 'REJECT' | 'REVISIONS';
}

export interface CriteriaScore {
  criteriaId: string;
  score: number;
  comment?: string;
  criteria?: {
    id: string;
    code: string;
    label: string;
    description: string;
    weight: number;
  };
}

export interface Criteria {
  id: string;
  code: string;
  label: string;
  description: string;
  weight: number;
}

export interface AggregateResult {
  id: string;
  bookId: string;
  averageScore: number;
  weightedScore: number;
  criteriaScores: {
    criteriaId: string;
    criteriaCode: string;
    criteriaLabel: string;
    averageScore: number;
    weightedScore: number;
  }[];
  approveCount: number;
  rejectCount: number;
  revisionsCount: number;
  calculatedDate: string;
}

export interface CommitteeDecision {
  id: string;
  bookId: string;
  decision: 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUESTED';
  comments: string;
  decidedDate: string;
  decidedBy: string;
}

// Phase 3: AI-related types
export interface AISummary {
  id: string;
  bookId: string;
  summaryText: string;
  strengths: Array<{
    point: string;
    reviewerQuotes: Array<{
      reviewerId: string;
      reviewerName: string;
      quote: string;
    }>;
  }>;
  weaknesses: Array<{
    point: string;
    reviewerQuotes: Array<{
      reviewerId: string;
      reviewerName: string;
      quote: string;
    }>;
  }>;
  recommendations: Array<{
    point: string;
    reviewerQuotes: Array<{
      reviewerId: string;
      reviewerName: string;
      quote: string;
    }>;
  }>;
  language?: string;
  generatedAt: string;
  modelVersion?: string;
  confidenceScore?: number;
}

export interface ConflictFlag {
  id: string;
  bookId: string;
  criterionCode?: string;
  conflictType: 'SCORE_VARIANCE' | 'COMMENT_DISAGREEMENT' | 'RECOMMENDATION_MISMATCH' | 'CRITERION_SPECIFIC' | 'OVERALL_DISAGREEMENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  reviewerIds: string[];
  scoreVariance?: number;
  detectedAt: string;
  resolved: boolean;
  resolutionNotes?: string;
}

export interface ActionSuggestion {
  action: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  rationale: string;
  relatedCriteria?: string[];
}

export interface ActionSuggestionsResult {
  suggestedActions: ActionSuggestion[];
  decisionSupport: {
    recommendation: 'APPROVE' | 'REJECT' | 'NEEDS_REVISION';
    confidence: number;
    reasoning: string;
  };
}