import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from '../utils/axios';
import { AISummary } from '../types/book';

interface AISummaryPreviewProps {
  bookId: string;
}

const AISummaryPreview = ({ bookId }: AISummaryPreviewProps) => {
  const queryClient = useQueryClient();

  // Fetch AI summary
  const { data: summary, isLoading, error } = useQuery<AISummary>({
    queryKey: ['ai-summary', bookId],
    queryFn: async () => {
      const response = await axios.get(`/ai/books/${bookId}/summary`);
      return response.data.data.summary;
    },
    enabled: !!bookId,
    retry: false,
  });

  // Generate summary mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/ai/books/${bookId}/summary`);
      return response.data.data.summary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-summary', bookId] });
      toast.success('AI summary generated successfully');
    },
    onError: () => {
      toast.error('Failed to generate AI summary');
    },
  });

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error && (error as any).response?.status === 404) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">AI Summary</h3>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="btn-primary text-sm"
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate Summary'}
          </button>
        </div>
        <p className="text-gray-500 text-sm">No AI summary available. Click to generate one.</p>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI-Generated Summary</h3>
          <p className="text-sm text-gray-500 mt-1">
            Generated on {new Date(summary.generatedAt).toLocaleDateString()}
            {summary.confidenceScore && (
              <span className="ml-2">
                • Confidence: {(summary.confidenceScore * 100).toFixed(0)}%
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="btn-outline text-sm"
        >
          {generateMutation.isPending ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>

      {/* Summary Text */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Executive Summary</h4>
        <p className="text-gray-700 leading-relaxed">{summary.summaryText}</p>
      </div>

      {/* Strengths */}
      {summary.strengths && summary.strengths.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Strengths
          </h4>
          <ul className="space-y-3">
            {summary.strengths.map((strength, idx) => (
              <li key={idx} className="pl-4 border-l-2 border-green-200">
                <p className="text-gray-700 font-medium mb-1">{strength.point}</p>
                {strength.reviewerQuotes && strength.reviewerQuotes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {strength.reviewerQuotes.map((quote, qIdx) => (
                      <p key={qIdx} className="text-sm text-gray-600 italic pl-4">
                        "{quote.quote}" — {quote.reviewerName}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {summary.weaknesses && summary.weaknesses.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
            Areas for Improvement
          </h4>
          <ul className="space-y-3">
            {summary.weaknesses.map((weakness, idx) => (
              <li key={idx} className="pl-4 border-l-2 border-yellow-200">
                <p className="text-gray-700 font-medium mb-1">{weakness.point}</p>
                {weakness.reviewerQuotes && weakness.reviewerQuotes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {weakness.reviewerQuotes.map((quote, qIdx) => (
                      <p key={qIdx} className="text-sm text-gray-600 italic pl-4">
                        "{quote.quote}" — {quote.reviewerName}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {summary.recommendations && summary.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Recommendations
          </h4>
          <ul className="space-y-3">
            {summary.recommendations.map((rec, idx) => (
              <li key={idx} className="pl-4 border-l-2 border-blue-200">
                <p className="text-gray-700 font-medium mb-1">{rec.point}</p>
                {rec.reviewerQuotes && rec.reviewerQuotes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {rec.reviewerQuotes.map((quote, qIdx) => (
                      <p key={qIdx} className="text-sm text-gray-600 italic pl-4">
                        "{quote.quote}" — {quote.reviewerName}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AISummaryPreview;

