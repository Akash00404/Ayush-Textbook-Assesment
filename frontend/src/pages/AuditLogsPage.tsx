import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from '../utils/axios'
import { UserRole } from '../types/user'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  userId: string
  userName: string
  userRole: UserRole
  details: string
  timestamp: string
}

const AuditLogsPage = () => {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [actionType, setActionType] = useState('')
  const [entityType, setEntityType] = useState('')
  const pageSize = 20

  // Fetch audit logs
  const { data, isLoading, isError } = useQuery<{
    logs: AuditLog[]
    total: number
  }>(
    ['auditLogs', page, filter, actionType, entityType],
    async () => {
      const params: Record<string, string | number> = {
        page,
        pageSize,
      }

      if (filter) params.search = filter
      if (actionType) params.action = actionType
      if (entityType) params.entityType = entityType

      const response = await axios.get('/audit-logs', { params })
      return response.data.data
    },
    {
      keepPreviousData: true,
    }
  )

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value)
    setPage(1) // Reset to first page when filter changes
  }

  // Handle action type filter change
  const handleActionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionType(e.target.value)
    setPage(1)
  }

  // Handle entity type filter change
  const handleEntityTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEntityType(e.target.value)
    setPage(1)
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">
          View system activity and user actions
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="filter"
              className="input-field w-full"
              placeholder="Search by user, entity ID, or details"
              value={filter}
              onChange={handleFilterChange}
            />
          </div>
          
          <div>
            <label htmlFor="actionType" className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              id="actionType"
              className="input-field w-full"
              value={actionType}
              onChange={handleActionTypeChange}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="ASSIGN">Assign</option>
              <option value="REVIEW">Review</option>
              <option value="DECISION">Decision</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="entityType" className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              id="entityType"
              className="input-field w-full"
              value={entityType}
              onChange={handleEntityTypeChange}
            >
              <option value="">All Entities</option>
              <option value="USER">User</option>
              <option value="BOOK">Book</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="REVIEW">Review</option>
              <option value="DECISION">Decision</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Timestamp
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  User
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Action
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Entity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-red-500">
                    Error loading audit logs. Please try again.
                  </td>
                </tr>
              ) : data && data.logs.length > 0 ? (
                data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                      <div className="text-xs text-gray-500">{log.userRole}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.action === 'CREATE'
                            ? 'bg-green-100 text-green-800'
                            : log.action === 'UPDATE'
                            ? 'bg-blue-100 text-blue-800'
                            : log.action === 'DELETE'
                            ? 'bg-red-100 text-red-800'
                            : log.action === 'LOGIN' || log.action === 'LOGOUT'
                            ? 'bg-purple-100 text-purple-800'
                            : log.action === 'ASSIGN'
                            ? 'bg-yellow-100 text-yellow-800'
                            : log.action === 'REVIEW'
                            ? 'bg-indigo-100 text-indigo-800'
                            : log.action === 'DECISION'
                            ? 'bg-pink-100 text-pink-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.entityType}</div>
                      <div className="text-xs text-gray-500">{log.entityId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(page * pageSize, data.total)}
                  </span>{' '}
                  of <span className="font-medium">{data.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current page
                    let pageNum = page
                    if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    
                    // Ensure page number is valid
                    if (pageNum <= 0 || pageNum > totalPages) return null
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
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
    </div>
  )
}

export default AuditLogsPage