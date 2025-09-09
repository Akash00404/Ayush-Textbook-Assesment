import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import BackButton from '../components/BackButton'
import { useQuery, useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { Suspense, lazy } from 'react'
import { toast } from 'react-toastify'
import { useAuthStore } from '../stores/authStore'
import { Book, Assignment, Criteria } from '../types/book'
import axios from '../utils/axios'

const PDFViewer = lazy(() => import('../components/PDFViewer'))

interface CriteriaScore {
  criteriaId: string
  score: number
}

type Recommendation = 'APPROVE' | 'REVISIONS_REQUESTED' | 'REJECT'

const ReviewPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [criteriaScores, setCriteriaScores] = useState<CriteriaScore[]>([])
  const [recommendation, setRecommendation] = useState<Recommendation>('APPROVE')
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch assignment details
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery<Assignment>(
    ['assignment', id],
    async () => {
      const response = await axios.get(`/assignments/${id}`)
      return response.data.data.assignment
    },
    {
      enabled: !!id,
      onError: () => {
        toast.error('Failed to load assignment')
        navigate('/dashboard')
      },
    }
  )

  // Fetch book details
  const { data: book, isLoading: isLoadingBook } = useQuery<Book>(
    ['book', assignment?.bookId],
    async () => {
      const response = await axios.get(`/books/${assignment?.bookId}`)
      return response.data.data.book
    },
    {
      enabled: !!assignment?.bookId,
    }
  )

  // Fetch criteria
  const { data: criteria, isLoading: isLoadingCriteria } = useQuery<Criteria[]>(
    ['criteria'],
    async () => {
      const response = await axios.get('/criteria')
      return response.data.data.criteria
    }
  )

  // Initialize criteria scores when criteria are loaded
  useEffect(() => {
    if (criteria && criteria.length > 0) {
      setCriteriaScores(
        criteria.map((criterion) => ({
          criteriaId: criterion.id,
          score: 5, // Default score
        }))
      )
    }
  }, [criteria])

  // Submit review mutation
  const submitReviewMutation = useMutation(
    async (data: {
      criteriaScores: CriteriaScore[]
      recommendation: Recommendation
      comments: string
    }) => {
      return axios.post(`/assignments/${id}/review`, data)
    },
    {
      onSuccess: () => {
        toast.success('Review submitted successfully')
        navigate('/dashboard')
      },
      onError: (error: AxiosError) => {
        toast.error(
          (error.response?.data as any)?.message || 'Failed to submit review'
        )
        setIsSubmitting(false)
      },
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

  // Handle score change
  const handleScoreChange = (criteriaId: string, score: number) => {
    setCriteriaScores((prev) =>
      prev.map((item) =>
        item.criteriaId === criteriaId ? { ...item, score } : item
      )
    )
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (criteriaScores.length === 0) {
      toast.error('Please score all criteria')
      return
    }
    
    if (!comments.trim()) {
      toast.error('Please provide comments for your review')
      return
    }
    
    setIsSubmitting(true)
    submitReviewMutation.mutate({
      criteriaScores,
      recommendation,
      comments,
    })
  }

  // Check if assignment is already completed
  const isCompleted = assignment?.status === 'COMPLETED'

  // Check if the current user is the assigned reviewer
  const isAssignedReviewer = assignment?.reviewerId === user?.id

  if (isLoadingAssignment || isLoadingBook || isLoadingCriteria) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!assignment || !book || !isAssignedReviewer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Assignment not found</h2>
        <p className="mt-2 text-gray-500">
          The assignment you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Link to="/dashboard" className="mt-4 inline-block btn-primary">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Review Assignment</h1>
          <p className="mt-1 text-sm text-gray-500">
            {book.title} by {book.author}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2 items-center">
          <BackButton />
          {isCompleted ? (
            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              Completed
            </span>
          ) : (
            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
              In Progress
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Book Info and PDF Viewer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Book Info Card */}
          <div className="card p-4 space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Book Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Title</h3>
                <p className="mt-1 text-sm text-gray-900">{book.title}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Author</h3>
                <p className="mt-1 text-sm text-gray-900">{book.author}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Publisher</h3>
                <p className="mt-1 text-sm text-gray-900">{book.publisher}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Year</h3>
                <p className="mt-1 text-sm text-gray-900">{book.year}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Edition</h3>
                <p className="mt-1 text-sm text-gray-900">{book.edition}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                <p className="mt-1 text-sm text-gray-900">{book.subject}</p>
              </div>
            </div>
          </div>

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
            
            <div className="border border-gray-200 rounded-md overflow-auto max-h-[600px] flex justify-center bg-gray-100">
              <Suspense
                fallback={
                  <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                  </div>
                }
              >
                <PDFViewer
                  fileUrl={`/api/books/${book.id}/file`}
                  pageNumber={pageNumber}
                  onLoadSuccess={onDocumentLoadSuccess}
                  width={600}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Review Form */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Submit Review</h2>
            
            {isCompleted ? (
              <div className="text-center py-6">
                <p className="text-gray-500">You have already submitted your review for this book.</p>
                <Link to="/dashboard" className="mt-4 inline-block btn-primary">
                  Back to Dashboard
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Criteria Scoring */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Evaluation Criteria</h3>
                  
                  {criteria && criteria.map((criterion) => (
                    <div key={criterion.id} className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <label
                          htmlFor={`criteria-${criterion.id}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          {criterion.label}
                        </label>
                        <span className="text-sm font-medium text-primary-600">
                          {criteriaScores.find(c => c.criteriaId === criterion.id)?.score || 0}/10
                        </span>
                      </div>
                      <input
                        type="range"
                        id={`criteria-${criterion.id}`}
                        min="1"
                        max="10"
                        step="1"
                        value={criteriaScores.find(c => c.criteriaId === criterion.id)?.score || 5}
                        onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        disabled={isSubmitting}
                      />
                      <p className="mt-1 text-xs text-gray-500">{criterion.description}</p>
                    </div>
                  ))}
                </div>
                
                {/* Recommendation */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Recommendation</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="recommendation-approve"
                        name="recommendation"
                        type="radio"
                        value="APPROVE"
                        checked={recommendation === 'APPROVE'}
                        onChange={() => setRecommendation('APPROVE')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor="recommendation-approve"
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        Approve
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="recommendation-revisions"
                        name="recommendation"
                        type="radio"
                        value="REVISIONS_REQUESTED"
                        checked={recommendation === 'REVISIONS_REQUESTED'}
                        onChange={() => setRecommendation('REVISIONS_REQUESTED')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor="recommendation-revisions"
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        Request Revisions
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="recommendation-reject"
                        name="recommendation"
                        type="radio"
                        value="REJECT"
                        checked={recommendation === 'REJECT'}
                        onChange={() => setRecommendation('REJECT')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor="recommendation-reject"
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        Reject
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Comments */}
                <div>
                  <label
                    htmlFor="comments"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Comments
                  </label>
                  <textarea
                    id="comments"
                    name="comments"
                    rows={6}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="input-field w-full"
                    placeholder="Provide detailed feedback about the book..."
                    disabled={isSubmitting}
                    required
                  />
                </div>
                
                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                        Submitting...
                      </>
                    ) : (
                      'Submit Review'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewPage