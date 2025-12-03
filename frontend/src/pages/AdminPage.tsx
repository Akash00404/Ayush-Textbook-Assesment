import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../utils/axios';
import CriteriaManager from '../components/CriteriaManager';
import { 
  CogIcon, 
  ChartBarIcon, 
  UserGroupIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'criteria' | 'analytics' | 'users'>('criteria');

  // Fetch system analytics
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const response = await axios.get('/analytics/system');
      return response.data.data;
    },
  });

  const tabs = [
    { id: 'criteria', name: 'Criteria Management', icon: CogIcon },
    { id: 'analytics', name: 'System Analytics', icon: ChartBarIcon },
    { id: 'users', name: 'User Management', icon: UserGroupIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage system settings, criteria, and monitor system performance
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'criteria' && (
        <CriteriaManager />
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {isLoadingAnalytics ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Books
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {analytics?.overview?.totalBooks || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserGroupIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Users
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {analytics?.overview?.totalUsers || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ChartBarIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Assignments
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {analytics?.overview?.totalAssignments || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Reviews
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {analytics?.overview?.totalReviews || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Books by Status */}
              {analytics?.booksByStatus && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Books by Status
                    </h3>
                    <div className="space-y-3">
                      {analytics.booksByStatus.map((status: any) => (
                        <div key={status.status} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {status.status.replace('_', ' ').toLowerCase()}
                          </span>
                          <span className="text-sm text-gray-900">{status.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Assignments by Status */}
              {analytics?.assignmentsByStatus && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Assignments by Status
                    </h3>
                    <div className="space-y-3">
                      {analytics.assignmentsByStatus.map((status: any) => (
                        <div key={status.status} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {status.status.replace('_', ' ').toLowerCase()}
                          </span>
                          <span className="text-sm text-gray-900">{status.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              User Management
            </h3>
            <p className="text-sm text-gray-500">
              User management features will be implemented in a future update.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
