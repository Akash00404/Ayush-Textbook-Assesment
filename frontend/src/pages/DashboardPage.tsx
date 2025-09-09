import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { UserRole } from '../types/user'
import { Book, Assignment } from '../types/book'
import axios from '../utils/axios'
import { Link } from 'react-router-dom'

const DashboardPage = () => {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    totalBooks: 0,
    booksUnderReview: 0,
    booksReviewed: 0,
    pendingAssignments: 0,
    completedAssignments: 0,
  })

  // Fetch books based on user role
  const { data: books, isLoading: booksLoading } = useQuery<Book[]>(
    ['books'],
    async () => {
      const response = await axios.get('/books')
      const apiBooks = response.data.data?.books ?? response.data.data ?? []
      const mapped: Book[] = (apiBooks as any[]).map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.authors ?? b.author ?? '',
        publisher: b.publisher ?? '',
        year: b.year ?? (b.uploaded_at ? new Date(b.uploaded_at).getFullYear() : ''),
        edition: b.edition ?? '',
        subject: b.subject ?? b.syllabus_version ?? '',
        uploadDate: b.uploaded_at ?? b.uploadDate ?? new Date().toISOString(),
        status: (b.status === 'PENDING_REVIEW'
          ? 'PENDING'
          : b.status === 'REVIEW_COMPLETED'
          ? 'REVIEWED'
          : b.status === 'NEEDS_REVISION'
          ? 'REVISIONS_REQUESTED'
          : b.status) as any,
        filePath: b.pdf_path ?? b.filePath ?? '',
        uploaderId: b.uploaded_by ?? b.uploaderId ?? '',
        uploader: b.uploader,
        assignments: b.assignments,
        aggregateResults: b.aggregate_results,
        committeeDecision: b.committee_decisions,
      }))
      return mapped
    },
    {
      enabled: !!user,
    }
  )

  // Fetch assignments for reviewers
  const { data: assignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>(
    ['assignments'],
    async () => {
      const response = await axios.get('/assignments')
      return response.data.data.assignments
    },
    {
      enabled: !!user && user.role === UserRole.REVIEWER,
    }
  )

  // Calculate statistics based on user role and data
  useEffect(() => {
    if (user && books) {
      // Common stats for all roles
      const totalBooks = books.length
      const booksUnderReview = books.filter(book => (book as any).status === 'UNDER_REVIEW').length
      const booksReviewed = books.filter(book => ['REVIEWED', 'APPROVED', 'REJECTED', 'REVISIONS_REQUESTED'].includes((book as any).status)).length

      // Reviewer-specific stats
      let pendingAssignments = 0
      let completedAssignments = 0

      if (user.role === UserRole.REVIEWER && assignments) {
        pendingAssignments = assignments.filter(assignment => assignment.status !== 'COMPLETED').length
        completedAssignments = assignments.filter(assignment => assignment.status === 'COMPLETED').length
      }

      setStats({
        totalBooks,
        booksUnderReview,
        booksReviewed,
        pendingAssignments,
        completedAssignments,
      })
    }
  }, [user, books, assignments])

  if (booksLoading || (user?.role === UserRole.REVIEWER && assignmentsLoading)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.name}. Here's an overview of the textbook review system.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="text-lg font-medium text-gray-900">Total Books</h3>
          <p className="text-3xl font-bold text-primary-600 mt-2">{stats.totalBooks}</p>
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-medium text-gray-900">Under Review</h3>
          <p className="text-3xl font-bold text-secondary-600 mt-2">{stats.booksUnderReview}</p>
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-medium text-gray-900">Reviewed</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.booksReviewed}</p>
        </div>

        {user?.role === UserRole.REVIEWER && (
          <>
            <div className="card p-4">
              <h3 className="text-lg font-medium text-gray-900">Pending Assignments</h3>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingAssignments}</p>
            </div>

            <div className="card p-4">
              <h3 className="text-lg font-medium text-gray-900">Completed Reviews</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedAssignments}</p>
            </div>
          </>
        )}
      </div>

      {/* Recent Activity Section */}
      <div className="card">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            {user?.role === UserRole.REVIEWER ? 'Your Assignments' : 'Recent Books'}
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {user?.role === UserRole.REVIEWER && assignments && assignments.length > 0 ? (
              assignments.slice(0, 5).map((assignment) => (
                <li key={assignment.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-600 truncate">
                        {assignment.book?.title || 'Book Title'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Assigned: {new Date(assignment.assignedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          assignment.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : assignment.status === 'IN_PROGRESS'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {assignment.status}
                      </span>
                    </div>
                    <Link
                      to={`/review/${assignment.id}`}
                      className="btn-outline text-sm py-1"
                    >
                      {assignment.status === 'COMPLETED' ? 'View Review' : 'Start Review'}
                    </Link>
                  </div>
                </li>
              ))
            ) : books && books.length > 0 ? (
              books.slice(0, 5).map((book: any) => (
                <li key={book.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-600 truncate">
                        {book.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(book.authors || book.author || '')} • {book.publisher || ''}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          book.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : book.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : book.status === 'UNDER_REVIEW'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {String(book.status).replace('_', ' ')}
                      </span>
                    </div>
                    <Link to={`/books/${book.id}`} className="btn-outline text-sm py-1">
                      View Details
                    </Link>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                No items to display
              </li>
            )}
          </ul>
        </div>
        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
          <Link
            to={user?.role === UserRole.REVIEWER ? '/dashboard' : '/books'}
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            View all
            <span aria-hidden="true"> &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage