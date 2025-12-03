import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from '../utils/axios';
import { ActionSuggestionsResult } from '../types/book';

interface ActionSuggestionsProps {
  bookId: string;
}

const ActionSuggestions = ({ bookId }: ActionSuggestionsProps) => {
  // Fetch action suggestions
  const { data: actions, isLoading, error } = useQuery<ActionSuggestionsResult>({
    queryKey: ['action-suggestions', bookId],
    queryFn: async () => {
      const response = await axios.post(`/ai/books/${bookId}/actions`);
      return response.data.data;
    },
    enabled: !!bookId,
    retry: false,
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROVE':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECT':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'NEEDS_REVISION':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4">
        <p className="text-gray-500 text-sm">
          Failed to load action suggestions. Ensure reviews are completed.
        </p>
      </div>
    );
  }

  if (!actions) {
    return null;
  }

  return (
    <div className="card p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">AI Action Suggestions</h3>

      {/* Decision Support */}
      {actions.decisionSupport && (
        <div className={`p-4 border-l-4 rounded ${getDecisionColor(actions.decisionSupport.recommendation)}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Recommended Decision</h4>
            <span className="text-sm">
              Confidence: {(actions.decisionSupport.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="mb-2">
            <span className="px-3 py-1 text-sm font-semibold rounded">
              {actions.decisionSupport.recommendation.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm mt-2">{actions.decisionSupport.reasoning}</p>
        </div>
      )}

      {/* Suggested Actions */}
      {actions.suggestedActions && actions.suggestedActions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Suggested Actions</h4>
          <div className="space-y-3">
            {actions.suggestedActions
              .sort((a, b) => {
                const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
              })
              .map((action, idx) => (
                <div
                  key={idx}
                  className={`p-4 border-l-4 rounded ${getPriorityColor(action.priority)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 text-xs font-semibold rounded">
                          {action.priority} Priority
                        </span>
                        {action.relatedCriteria && action.relatedCriteria.length > 0 && (
                          <span className="text-xs text-gray-600">
                            Criteria: {action.relatedCriteria.join(', ')}
                          </span>
                        )}
                      </div>
                      <p className="font-medium mb-1">{action.action}</p>
                      <p className="text-sm">{action.rationale}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {(!actions.suggestedActions || actions.suggestedActions.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <p>No specific action suggestions available.</p>
        </div>
      )}
    </div>
  );
};

export default ActionSuggestions;

