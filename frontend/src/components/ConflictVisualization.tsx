import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from '../utils/axios';
import { ConflictFlag } from '../types/book';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ConflictVisualizationProps {
  bookId: string;
}

const ConflictVisualization = ({ bookId }: ConflictVisualizationProps) => {
  const queryClient = useQueryClient();

  // Fetch conflicts
  const { data: conflicts, isLoading } = useQuery<ConflictFlag[]>({
    queryKey: ['conflicts', bookId],
    queryFn: async () => {
      const response = await axios.get(`/ai/books/${bookId}/conflicts`);
      return response.data.data.conflicts;
    },
    enabled: !!bookId,
  });

  // Detect conflicts mutation
  const detectMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/ai/books/${bookId}/conflicts`);
      return response.data.data.conflicts;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts', bookId] });
      toast.success('Conflicts detected successfully');
    },
    onError: () => {
      toast.error('Failed to detect conflicts');
    },
  });

  // Resolve conflict mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ conflictId, notes }: { conflictId: string; notes?: string }) => {
      const response = await axios.patch(`/ai/conflicts/${conflictId}/resolve`, {
        resolutionNotes: notes,
      });
      return response.data.data.conflict;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts', bookId] });
      toast.success('Conflict resolved');
    },
    onError: () => {
      toast.error('Failed to resolve conflict');
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getConflictTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Prepare chart data
  const chartData = conflicts
    ? {
        labels: conflicts.map((c) => c.criterionCode || 'Overall'),
        datasets: [
          {
            label: 'Severity Score',
            data: conflicts.map((c) => {
              switch (c.severity) {
                case 'CRITICAL':
                  return 4;
                case 'HIGH':
                  return 3;
                case 'MEDIUM':
                  return 2;
                case 'LOW':
                  return 1;
                default:
                  return 0;
              }
            }),
            backgroundColor: conflicts.map((c) => {
              switch (c.severity) {
                case 'CRITICAL':
                  return 'rgba(239, 68, 68, 0.8)';
                case 'HIGH':
                  return 'rgba(249, 115, 22, 0.8)';
                case 'MEDIUM':
                  return 'rgba(234, 179, 8, 0.8)';
                case 'LOW':
                  return 'rgba(59, 130, 246, 0.8)';
                default:
                  return 'rgba(156, 163, 175, 0.8)';
              }
            }),
          },
        ],
      }
    : null;

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  const unresolvedConflicts = conflicts?.filter((c) => !c.resolved) || [];
  const resolvedConflicts = conflicts?.filter((c) => c.resolved) || [];

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Conflict Detection</h3>
          <p className="text-sm text-gray-500 mt-1">
            {unresolvedConflicts.length} unresolved, {resolvedConflicts.length} resolved
          </p>
        </div>
        <button
          onClick={() => detectMutation.mutate()}
          disabled={detectMutation.isPending}
          className="btn-outline text-sm"
        >
          {detectMutation.isPending ? 'Detecting...' : 'Detect Conflicts'}
        </button>
      </div>

      {/* Chart Visualization */}
      {chartData && unresolvedConflicts.length > 0 && (
        <div className="h-64">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
                title: {
                  display: true,
                  text: 'Conflict Severity by Criterion',
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 4,
                  ticks: {
                    stepSize: 1,
                    callback: function (value) {
                      const labels = ['', 'Low', 'Medium', 'High', 'Critical'];
                      return labels[value as number] || '';
                    },
                  },
                },
              },
            }}
          />
        </div>
      )}

      {/* Unresolved Conflicts */}
      {unresolvedConflicts.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Unresolved Conflicts</h4>
          <div className="space-y-3">
            {unresolvedConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className={`p-4 border-l-4 rounded ${getSeverityColor(conflict.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded">
                        {conflict.severity}
                      </span>
                      <span className="text-xs text-gray-600">
                        {getConflictTypeLabel(conflict.conflictType)}
                      </span>
                      {conflict.criterionCode && (
                        <span className="text-xs text-gray-600">
                          • {conflict.criterionCode}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-2">{conflict.description}</p>
                    {conflict.scoreVariance && (
                      <p className="text-xs text-gray-600">
                        Score Variance: {conflict.scoreVariance.toFixed(2)}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      Detected: {new Date(conflict.detectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Mark this conflict as resolved?')) {
                        resolveMutation.mutate({ conflictId: conflict.id });
                      }
                    }}
                    className="ml-4 px-3 py-1 text-xs btn-outline"
                    disabled={resolveMutation.isPending}
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No unresolved conflicts detected.</p>
          {conflicts && conflicts.length === 0 && (
            <p className="text-sm mt-2">All reviews are in agreement.</p>
          )}
        </div>
      )}

      {/* Resolved Conflicts */}
      {resolvedConflicts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Resolved Conflicts</h4>
          <div className="space-y-2">
            {resolvedConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="p-3 bg-gray-50 border-l-4 border-gray-300 rounded"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-600">
                    {getConflictTypeLabel(conflict.conflictType)}
                  </span>
                  {conflict.criterionCode && (
                    <span className="text-xs text-gray-500">• {conflict.criterionCode}</span>
                  )}
                </div>
                <p className="text-xs text-gray-600">{conflict.description}</p>
                {conflict.resolutionNotes && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Resolution: {conflict.resolutionNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictVisualization;

