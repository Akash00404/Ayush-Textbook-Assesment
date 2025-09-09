import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { UserRole } from '../types/user'
import { Book, BookStatus } from '../types/book'
import axios from '../utils/axios'
import UploadBookModal from '../components/UploadBookModal'
import BackButton from '../components/BackButton'

const BooksPage = () => {
  const { user } = useAuthStore()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch books
  const { data, isLoading, refetch } = useQuery<{ books: Book[], total: number }>(
    ['books'],
    async () => {
      const response = await axios.get('/books')
      const apiBooks = response.data.data.books as any[]
      const books: Book[] = apiBooks.map((b: any) => ({
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
      return { books, total: response.data.results }
    }
  )

  // Filter books based on status and search term
  const booksList = data?.books ?? []
  const filteredBooks = booksList.filter(book => {
    const matchesStatus = statusFilter === 'ALL' || book.status === statusFilter
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.publisher.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Handle book upload success
  const handleUploadSuccess = () => {
    refetch()
    setIsUploadModalOpen(false)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Books</h1>
          <p className="mt-1 text-sm text-gray-500">
            A list of all the textbooks in the review system
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <BackButton />
          {user?.role === UserRole.SECRETARIAT && (
          <button
            type="button"
            className="mt-4 sm:mt-0 btn-primary"
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload New Book
          </button>
          )}
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
            {Object.values(BookStatus).map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="search" className="form-label">
            Search
          </label>
          <input
            type="text"
            id="search"
            className="form-input"
            placeholder="Search by title, author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Books Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Title
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Author
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Publisher / Year
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Upload Date
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBooks && filteredBooks.length > 0 ? (
                filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-primary-600">{book.title}</div>
                      <div className="text-sm text-gray-500">{book.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{book.author}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{book.publisher}</div>
                      <div className="text-sm text-gray-500">{book.year} • {book.edition}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          book.status === BookStatus.APPROVED
                            ? 'bg-green-100 text-green-800'
                            : book.status === BookStatus.REJECTED
                            ? 'bg-red-100 text-red-800'
                            : book.status === BookStatus.UNDER_REVIEW
                            ? 'bg-yellow-100 text-yellow-800'
                            : book.status === BookStatus.REVISIONS_REQUESTED
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {book.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(book.uploadDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/books/${book.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No books found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Book Modal */}
      {isUploadModalOpen && (
        <UploadBookModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  )
}

export default BooksPage