import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../utils/axios';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  EyeIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';

interface Assignment {
  id: string;
  book: {
    id: string;
    title: string;
    authors: string;
    status: string;
  };
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
  assigner: {
    id: string;
    name: string;
  };
  assigned_at: string;
  due_date: string;
  status: string;
  days_until_due: number;
  is_overdue: boolean;
  has_coi: boolean;
  has_conflict: boolean;
  has_review: boolean;
  is_draft: boolean;
  reviews: Array<{
    id: string;
    submitted_at: string;
    draft_flag: boolean;
  }>;
  coi_declarations: Array<{
    id: string;
    has_conflict: boolean;
    declared_at: string;
  }>;
}

interface AssignmentTrackingTableProps {
  filters?: {
    status?: string;
    reviewerId?: string;
    bookId?: string;
  };
}

const AssignmentTrackingTable: React.FC<AssignmentTrackingTableProps> = ({ filters = {} }) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const { data, isLoading, error } = useQuery({
    queryKey: ['assignments', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      
      const response = await axios.get(`/analytics/assignment-tracking?${params}`);
      return response.data.data;
    },
  });

  const getStatusIcon = (assignment: Assignment) => {
    if (assignment.is_overdue) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
    }
    if (assignment.status === 'COMPLETED') {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    if (assignment.status === 'IN_PROGRESS') {
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
    return <ClockIcon className="h-5 w-5 text-gray-400" />;
  };

  const getStatusColor = (assignment: Assignment) => {
    if (assignment.is_overdue) return 'text-red-600 bg-red-50';
    if (assignment.status === 'COMPLETED') return 'text-green-600 bg-green-50';
    if (assignment.status === 'IN_PROGRESS') return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load assignments</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Assignment Tracking
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Track reviewer assignments and their progress
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Book & Reviewer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                COI
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.assignments?.map((assignment: Assignment) => (
              <tr key={assignment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {assignment.book.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      by {assignment.book.authors}
                    </div>
                    <div className="text-sm text-gray-500">
                      Reviewer: {assignment.reviewer.name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(assignment)}
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment)}`}>
                      {assignment.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    {format(new Date(assignment.due_date), 'MMM dd, yyyy')}
                  </div>
                  <div className={`text-xs ${
                    assignment.is_overdue ? 'text-red-600' : 
                    assignment.days_until_due <= 3 ? 'text-yellow-600' : 
                    'text-gray-500'
                  }`}>
                    {assignment.is_overdue ? 'Overdue' : 
                     assignment.days_until_due === 0 ? 'Due today' :
                     `${assignment.days_until_due} days left`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {assignment.has_coi ? (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      assignment.has_conflict 
                        ? 'text-red-600 bg-red-50' 
                        : 'text-green-600 bg-green-50'
                    }`}>
                      {assignment.has_conflict ? 'Conflict' : 'No Conflict'}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Not Declared</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {assignment.has_review ? (
                      <span className={assignment.is_draft ? 'text-yellow-600' : 'text-green-600'}>
                        {assignment.is_draft ? 'Draft Submitted' : 'Review Submitted'}
                      </span>
                    ) : (
                      <span className="text-gray-500">No Review</span>
                    )}
                  </div>
                  {assignment.has_review && (
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(assignment.reviews[0].submitted_at), { addSuffix: true })}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-primary-600 hover:text-primary-900">
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.pagination && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= data.pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(page - 1) * limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(page * limit, data.pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{data.pagination.total}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentTrackingTable;
