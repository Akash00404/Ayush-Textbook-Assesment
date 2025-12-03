import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Assignment } from '../types/book'
import axios from '../utils/axios'
import BackButton from '../components/BackButton'

const AssignmentsPage = () => {
  const { user } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch all assignments for the reviewer
  const { data: assignments, isLoading, refetch } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: async () => {
      const response = await axios.get('/assignments')
      const apiAssignments = response.data.data.assignments as any[]
      // Map backend assignment format to frontend format
      return apiAssignments.map((a: any) => ({
        id: a.id,
        bookId: a.book_id,
        reviewerId: a.reviewer_id,
        assignedDate: a.assigned_at || a.assignedDate,
        dueDate: a.due_date || a.dueDate,
        status: a.status,
        book: a.book ? {
          id: a.book.id,
          title: a.book.title,
          author: a.book.authors || a.book.author || '',
          publisher: a.book.publisher || '',
          year: a.book.year || (a.book.uploaded_at ? new Date(a.book.uploaded_at).getFullYear() : ''),
          edition: a.book.edition || '',
          subject: a.book.syllabus_version || a.book.subject || '',
          uploadDate: a.book.uploaded_at || a.book.uploadDate || new Date().toISOString(),
          status: a.book.status,
        } : undefined,
        reviewer: a.reviewer,
        review: a.reviews && a.reviews.length > 0 ? a.reviews[0] : undefined,
      }))
    },
    enabled: !!user,
  })

  // Filter assignments
  const filteredAssignments = assignments?.filter((assignment) => {
    const matchesStatus = statusFilter === 'ALL' || assignment.status === statusFilter
    const matchesSearch = 
      assignment.book?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.book?.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.book?.publisher?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  }) || []

  // Calculate statistics
  const stats = {
    total: assignments?.length || 0,
    pending: assignments?.filter(a => a.status === 'PENDING').length || 0,
    inProgress: assignments?.filter(a => a.status === 'IN_PROGRESS').length || 0,
    completed: assignments?.filter(a => a.status === 'COMPLETED').length || 0,
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Assignments</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all your assigned book reviews
          </p>
        </div>
        <BackButton />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Assignments</h3>
          <p className="text-2xl font-bold text-primary-600 mt-1">{stats.total}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Pending</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500">Completed</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="w-full sm:w-64">
          <label htmlFor="status-filter" className="form-label">
            Status
          </label>
          <select
            id="status-filter"
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <div className="w-full sm:flex-1">
          <label htmlFor="search" className="form-label">
            Search
          </label>
          <input
            type="text"
            id="search"
            className="form-input"
            placeholder="Search by book title, author, or publisher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Assignments Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Book
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Author / Publisher
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Assigned Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Due Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assignment) => {
                  const isOverdue = 
                    assignment.status !== 'COMPLETED' && 
                    assignment.dueDate && 
                    new Date(assignment.dueDate) < new Date()
                  
                  return (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-primary-600">
                          {assignment.book?.title || 'Unknown Book'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assignment.book?.subject || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {assignment.book?.author || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assignment.book?.publisher || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.assignedDate 
                          ? new Date(assignment.assignedDate).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assignment.dueDate ? (
                          <div className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            {new Date(assignment.dueDate).toLocaleDateString()}
                            {isOverdue && (
                              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                Overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No due date</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            assignment.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : assignment.status === 'IN_PROGRESS'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/review/${assignment.id}`}
                          className={`${
                            assignment.status === 'COMPLETED'
                              ? 'text-primary-600 hover:text-primary-900'
                              : 'text-primary-600 hover:text-primary-900 font-semibold'
                          }`}
                        >
                          {assignment.status === 'COMPLETED' ? 'View Review' : 'Start Review'}
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    {assignments && assignments.length === 0
                      ? 'No assignments found. You have not been assigned any books to review yet.'
                      : 'No assignments match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AssignmentsPage

