import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import axios, { AxiosError } from 'axios'
import { AggregateResult } from '../types/book'

interface CommitteeDecisionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  bookId: string
  aggregateResults?: AggregateResult
}

type Decision = 'APPROVED' | 'REJECTED' | 'REVISIONS_REQUESTED'

const CommitteeDecisionModal = ({
  isOpen,
  onClose,
  onSuccess,
  bookId,
  aggregateResults,
}: CommitteeDecisionModalProps) => {
  const [decision, setDecision] = useState<Decision>('APPROVED')
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Make decision mutation
  const decisionMutation = useMutation(
    async (data: { decision: Decision; comments: string }) => {
      return axios.post(`/books/${bookId}/decision`, data)
    },
    {
      onSuccess: () => {
        toast.success('Decision submitted successfully')
        onSuccess()
      },
      onError: (error: AxiosError) => {
        toast.error(
          (error.response?.data as any)?.message || 'Failed to submit decision'
        )
        setIsSubmitting(false)
      },
    }
  )

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comments.trim()) {
      toast.error('Please provide comments for your decision')
      return
    }
    
    setIsSubmitting(true)
    decisionMutation.mutate({ decision, comments })
  }

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isSubmitting && onClose()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              Committee Decision
            </Dialog.Title>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          
          <Dialog.Description className="text-sm text-gray-500 mb-4">
            Make a final decision on this book based on reviewer recommendations.
          </Dialog.Description>
          
          {aggregateResults && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Review Summary</h3>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-green-50 p-2 rounded">
                  <p className="font-medium text-green-700">Approve</p>
                  <p className="font-bold text-green-600">
                    {aggregateResults.approveCount}
                  </p>
                </div>
                <div className="bg-yellow-50 p-2 rounded">
                  <p className="font-medium text-yellow-700">Revisions</p>
                  <p className="font-bold text-yellow-600">
                    {aggregateResults.revisionsCount}
                  </p>
                </div>
                <div className="bg-red-50 p-2 rounded">
                  <p className="font-medium text-red-700">Reject</p>
                  <p className="font-bold text-red-600">
                    {aggregateResults.rejectCount}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-500">Overall Score: 
                  <span className="font-medium text-primary-600 ml-1">
                    {aggregateResults.weightedScore.toFixed(2)}/10
                  </span>
                </p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="decision-approve"
                    name="decision"
                    type="radio"
                    value="APPROVED"
                    checked={decision === 'APPROVED'}
                    onChange={() => setDecision('APPROVED')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="decision-approve"
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    Approve
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="decision-revisions"
                    name="decision"
                    type="radio"
                    value="REVISIONS_REQUESTED"
                    checked={decision === 'REVISIONS_REQUESTED'}
                    onChange={() => setDecision('REVISIONS_REQUESTED')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="decision-revisions"
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    Request Revisions
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="decision-reject"
                    name="decision"
                    type="radio"
                    value="REJECTED"
                    checked={decision === 'REJECTED'}
                    onChange={() => setDecision('REJECTED')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="decision-reject"
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    Reject
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label
                htmlFor="comments"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Comments
              </label>
              <textarea
                id="comments"
                name="comments"
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="input-field w-full"
                placeholder="Provide detailed comments explaining your decision..."
                disabled={isSubmitting}
                required
              />
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                className="btn-outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn-primary ${
                  decision === 'APPROVED'
                    ? 'bg-green-600 hover:bg-green-700'
                    : decision === 'REJECTED'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit Decision'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default CommitteeDecisionModal