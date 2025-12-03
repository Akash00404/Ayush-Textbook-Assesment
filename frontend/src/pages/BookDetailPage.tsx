import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Suspense, lazy } from 'react'
import { useAuthStore } from '../stores/authStore'
import { UserRole } from '../types/user'
import { Book, Assignment } from '../types/book'
import axios from '../utils/axios'
import AssignReviewersModal from '../components/AssignReviewersModal'
import CommitteeDecisionModal from '../components/CommitteeDecisionModal'
import BackButton from '../components/BackButton'
import AISummaryPreview from '../components/AISummaryPreview'
import ConflictVisualization from '../components/ConflictVisualization'
import ActionSuggestions from '../components/ActionSuggestions'
import UpdateAssignmentModal from '../components/UpdateAssignmentModal'

const PDFViewer = lazy(() => import('../components/PDFViewer'))

const BookDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false)
  const [isUpdateAssignmentModalOpen, setIsUpdateAssignmentModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)

  // Fetch book details
  const { data: book, isLoading, refetch } = useQuery<Book>(
    ['book', id],
    async () => {
      const response = await axios.get(`/books/${id}`)
      return response.data.data.book
    },
    {
      enabled: !!id,
    }
  )

  // Handle PDF document loading
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  // Handle page navigation
  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => {
      const newPageNumber = prevPageNumber + offset
      return numPages ? Math.min(Math.max(1, newPageNumber), numPages) : 1
    })
  }

  const previousPage = () => changePage(-1)
  const nextPage = () => changePage(1)

  // Handle assignment success
  const handleAssignSuccess = () => {
    refetch()
    setIsAssignModalOpen(false)
  }

  // Handle committee decision success
  const handleDecisionSuccess = () => {
    refetch()
    setIsDecisionModalOpen(false)
  }

  // Download PDF report
  const downloadReport = async () => {
    try {
      const response = await axios.get(`/reports/books/${id}.pdf`, {
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `book-report-${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading report:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Book not found</h2>
        <p className="mt-2 text-gray-500">The book you're looking for doesn't exist or you don't have permission to view it.</p>
        <Link to="/books" className="mt-4 inline-block btn-primary">
          Back to Books
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Book Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{book.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {book.author} • {book.publisher} • {book.year} • {book.edition}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <BackButton />
          {/* Secretariat can assign reviewers if book is pending or under review */}
          {user?.role === UserRole.SECRETARIAT && 
           (book.status === 'PENDING' || book.status === 'UNDER_REVIEW') && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsAssignModalOpen(true)}
            >
              Assign Reviewers
            </button>
          )}
          
          {/* Committee can make final decision if book is reviewed */}
          {user?.role === UserRole.COMMITTEE && book.status === 'REVIEWED' && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsDecisionModalOpen(true)}
            >
              Make Decision
            </button>
          )}
          
          {/* Secretariat and Committee can download report if book is reviewed */}
          {(user?.role === UserRole.SECRETARIAT || user?.role === UserRole.COMMITTEE) && 
           book.status !== 'PENDING' && (
            <button
              type="button"
              className="btn-outline"
              onClick={downloadReport}
            >
              Download Report
            </button>
          )}
        </div>
      </div>

      {/* Book Details and PDF Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Book Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Book Info Card */}
          <div className="card p-4 space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Book Information</h2>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Subject</h3>
              <p className="mt-1 text-sm text-gray-900">{book.subject}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className="mt-1">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    book.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : book.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : book.status === 'UNDER_REVIEW'
                      ? 'bg-yellow-100 text-yellow-800'
                      : book.status === 'REVISIONS_REQUESTED'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {book.status.replace('_', ' ')}
                </span>
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Uploaded By</h3>
              <p className="mt-1 text-sm text-gray-900">{book.uploader?.name}</p>
              <p className="text-xs text-gray-500">{book.uploader?.email}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Upload Date</h3>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(book.uploadDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Reviewers Card */}
          {book.assignments && book.assignments.length > 0 && (
            <div className="card p-4 space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Assigned Reviewers</h2>
              
              <ul className="divide-y divide-gray-200">
                {book.assignments.map((assignment: Assignment) => {
                  const assignmentDueDate =
                    assignment.dueDate ||
                    (assignment as any).due_date ||
                    undefined
                  const assignedDateValue =
                    assignment.assignedDate ||
                    (assignment as any).assigned_at ||
                    undefined
                  const formattedDueDate = assignmentDueDate
                    ? new Date(assignmentDueDate).toLocaleDateString()
                    : 'No due date'
                  const reviewerName =
                    assignment.reviewer?.name || 'Reviewer'
                  const assignmentStatus = assignment.status || 'PENDING'

                  return (
                    <li key={assignment.id} className="py-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {reviewerName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {assignment.reviewer?.department} • {assignment.reviewer?.institution}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                assignmentStatus === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : assignmentStatus === 'IN_PROGRESS'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {assignmentStatus.replace('_', ' ')}
                            </span>
                            {(user?.role === UserRole.SECRETARIAT ||
                              user?.role === UserRole.ADMIN) && (
                              <button
                                type="button"
                                className="text-xs text-primary-600 hover:text-primary-800"
                                onClick={() => {
                                  setSelectedAssignment({
                                    ...assignment,
                                    reviewerId:
                                      assignment.reviewerId ||
                                      assignment.reviewer?.id ||
                                      (assignment as any).reviewer_id ||
                                      '',
                                    bookId: assignment.bookId || book.id,
                                    assignedDate:
                                      assignment.assignedDate ||
                                      (assignment as any).assigned_at ||
                                      new Date().toISOString(),
                                    dueDate: assignmentDueDate,
                                  })
                                  setIsUpdateAssignmentModalOpen(true)
                                }}
                              >
                                Update Deadline
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            Assigned:{' '}
                            {assignedDateValue
                              ? new Date(assignedDateValue).toLocaleDateString()
                              : 'N/A'}
                          </span>
                          <span>
                            Due: {formattedDueDate}
                          </span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Aggregate Results Card */}
          {book.aggregateResults && (
            <div className="card p-4 space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Review Results</h2>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Overall Score</h3>
                <p className="mt-1 text-2xl font-bold text-primary-600">
                  {book.aggregateResults.weightedScore.toFixed(2)}/10
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Recommendations</h3>
                <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 p-2 rounded">
                    <p className="text-sm font-medium text-green-700">Approve</p>
                    <p className="text-lg font-bold text-green-600">
                      {book.aggregateResults.approveCount}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded">
                    <p className="text-sm font-medium text-yellow-700">Revisions</p>
                    <p className="text-lg font-bold text-yellow-600">
                      {book.aggregateResults.revisionsCount}
                    </p>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <p className="text-sm font-medium text-red-700">Reject</p>
                    <p className="text-lg font-bold text-red-600">
                      {book.aggregateResults.rejectCount}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Criteria Scores</h3>
                <ul className="mt-1 space-y-2">
                  {book.aggregateResults.criteriaScores.map((criteriaScore) => (
                    <li key={criteriaScore.criteriaId} className="text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">{criteriaScore.criteriaLabel}</span>
                        <span className="font-medium text-primary-600">
                          {criteriaScore.averageScore.toFixed(1)}/10
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-primary-600 h-1.5 rounded-full"
                          style={{ width: `${(criteriaScore.averageScore / 10) * 100}%` }}
                        ></div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Committee Decision Card */}
          {book.committeeDecision && (
            <div className="card p-4 space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Committee Decision</h2>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Decision</h3>
                <p className="mt-1">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      book.committeeDecision.decision === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : book.committeeDecision.decision === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {book.committeeDecision.decision.replace('_', ' ')}
                  </span>
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Comments</h3>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                  {book.committeeDecision.comments}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Decision Date</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(book.committeeDecision.decidedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Features - Show for Committee and Secretariat when reviews are completed */}
          {(user?.role === UserRole.COMMITTEE || user?.role === UserRole.SECRETARIAT || user?.role === UserRole.ADMIN) &&
           book.status !== 'PENDING' && (
            <div className="space-y-6">
              <AISummaryPreview bookId={book.id} />
              <ConflictVisualization bookId={book.id} />
              {book.status === 'REVIEWED' && (
                <ActionSuggestions bookId={book.id} />
              )}
            </div>
          )}

          {/* PDF Viewer */}
          <div className="card p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Book Preview</h2>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={previousPage}
                  className="btn-outline py-1 px-2"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pageNumber} of {numPages || '?'}
                </span>
                <button
                  type="button"
                  disabled={numPages !== null && pageNumber >= numPages}
                  onClick={nextPage}
                  className="btn-outline py-1 px-2"
                >
                  Next
                </button>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-md overflow-auto max-h-[800px] flex justify-center bg-gray-100">
              <Suspense
                fallback={
                  <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                  </div>
                }
              >
                <PDFViewer
                  fileUrl={`/api/books/${id}/file`}
                  pageNumber={pageNumber}
                  onLoadSuccess={onDocumentLoadSuccess}
                  width={600}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Reviewers Modal */}
      {isAssignModalOpen && (
        <AssignReviewersModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={handleAssignSuccess}
          bookId={book.id}
          currentAssignments={book.assignments || []}
        />
      )}

      {/* Committee Decision Modal */}
      {isDecisionModalOpen && (
        <CommitteeDecisionModal
          isOpen={isDecisionModalOpen}
          onClose={() => setIsDecisionModalOpen(false)}
          onSuccess={handleDecisionSuccess}
          bookId={book.id}
          aggregateResults={book.aggregateResults}
        />
      )}

      <UpdateAssignmentModal
        isOpen={isUpdateAssignmentModalOpen}
        assignment={selectedAssignment}
        onClose={() => {
          setIsUpdateAssignmentModalOpen(false)
          setSelectedAssignment(null)
        }}
        onSuccess={() => {
          setIsUpdateAssignmentModalOpen(false)
          setSelectedAssignment(null)
          refetch()
        }}
      />
    </div>
  )
}

export default BookDetailPage