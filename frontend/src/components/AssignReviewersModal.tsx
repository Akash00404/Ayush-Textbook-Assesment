import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { AxiosError } from 'axios'
import axios from '../utils/axios'
import { Assignment } from '../types/book'
import { User, UserRole } from '../types/user'

interface AssignReviewersModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  bookId: string
  currentAssignments: Assignment[]
}

const AssignReviewersModal = ({
  isOpen,
  onClose,
  onSuccess,
  bookId,
  currentAssignments,
}: AssignReviewersModalProps) => {
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>(
    currentAssignments.map((assignment: any) => assignment.reviewerId ?? assignment.reviewer_id)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dueDate, setDueDate] = useState<string>('')

  // Fetch available reviewers
  const { data: reviewers, isLoading } = useQuery<User[]>(
    ['reviewers'],
    async () => {
      const response = await axios.get('/users', {
        params: { role: UserRole.REVIEWER },
      })
      return response.data.data.users
    }
  )

  // Assign reviewers mutation
  const assignReviewersMutation = useMutation(
    async (reviewerIds: string[]) => {
      return axios.post(`/books/${bookId}/assign`, {
        reviewer_ids: reviewerIds,
        due_date: dueDate,
      })
    },
    {
      onSuccess: () => {
        toast.success('Reviewers assigned successfully')
        onSuccess()
      },
      onError: (error: AxiosError) => {
        toast.error(
          (error.response?.data as any)?.message || 'Failed to assign reviewers'
        )
        setIsSubmitting(false)
      },
    }
  )

  // Handle reviewer selection
  const handleReviewerToggle = (reviewerId: string) => {
    setSelectedReviewers((prev) =>
      prev.includes(reviewerId)
        ? prev.filter((id) => id !== reviewerId)
        : [...prev, reviewerId]
    )
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedReviewers.length < 1) {
      toast.error('Please select at least 1 reviewer')
      return
    }
    
    if (selectedReviewers.length > 5) {
      toast.error('You can select a maximum of 5 reviewers')
      return
    }
    
    if (!dueDate) {
      toast.error('Please select a due date')
      return
    }
    
    setIsSubmitting(true)
    assignReviewersMutation.mutate(selectedReviewers)
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
              Assign Reviewers
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
            Select 3-5 reviewers to evaluate this book. Current assignments will be updated.
          </Dialog.Description>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Reviewers
              </label>
              
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
                </div>
              ) : reviewers && reviewers.length > 0 ? (
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {reviewers.map((reviewer) => (
                      <li key={reviewer.id}>
                        <div className="flex items-center px-4 py-3">
                          <input
                            type="checkbox"
                            id={`reviewer-${reviewer.id}`}
                            name="reviewers"
                            value={reviewer.id}
                            checked={selectedReviewers.includes(reviewer.id)}
                            onChange={() => handleReviewerToggle(reviewer.id)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            disabled={isSubmitting}
                          />
                          <label
                            htmlFor={`reviewer-${reviewer.id}`}
                            className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            <div>{reviewer.name}</div>
                            <div className="text-xs text-gray-500">
                              {reviewer.department} • {reviewer.institution}
                            </div>
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-2">
                  No reviewers available.
                </p>
              )}
              
              <div className="mt-2 text-xs text-gray-500">
                Selected: {selectedReviewers.length} reviewer(s)
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                className="btn-primary"
                disabled={isSubmitting || selectedReviewers.length < 3 || selectedReviewers.length > 5}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Assigning...
                  </>
                ) : (
                  'Assign Reviewers'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default AssignReviewersModal