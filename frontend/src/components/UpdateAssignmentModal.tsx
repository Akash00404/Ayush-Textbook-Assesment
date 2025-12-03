import { useEffect, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import axios from '../utils/axios'
import { Assignment } from '../types/book'

interface UpdateAssignmentModalProps {
  assignment: Assignment | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const formatDateInput = (dateValue?: string) => {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

const UpdateAssignmentModal = ({
  assignment,
  isOpen,
  onClose,
  onSuccess,
}: UpdateAssignmentModalProps) => {
  const [dueDate, setDueDate] = useState<string>('')
  const [status, setStatus] = useState<Assignment['status']>('PENDING')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (assignment) {
      setDueDate(formatDateInput(assignment.dueDate || (assignment as any).due_date))
      setStatus(assignment.status)
    }
  }, [assignment])

  const updateAssignmentMutation = useMutation(
    async () => {
      if (!assignment) return
      return axios.patch(`/assignments/${assignment.id}`, {
        due_date: dueDate,
        status,
      })
    },
    {
      onSuccess: () => {
        toast.success('Assignment updated successfully')
        queryClient.invalidateQueries({ queryKey: ['assignment'] })
        queryClient.invalidateQueries({ queryKey: ['assignments'] })
        queryClient.invalidateQueries({ queryKey: ['books'] })
        onSuccess()
      },
      onError: () => {
        toast.error('Failed to update assignment')
      },
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignment) return

    if (!dueDate) {
      toast.error('Please select a due date')
      return
    }

    updateAssignmentMutation.mutate()
  }

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        if (!updateAssignmentMutation.isLoading) {
          onClose()
        }
      }}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              Update Assignment Deadline
            </Dialog.Title>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
              disabled={updateAssignmentMutation.isLoading}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                disabled={updateAssignmentMutation.isLoading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Assignment['status'])
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                disabled={updateAssignmentMutation.isLoading}
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                className="btn-outline"
                onClick={onClose}
                disabled={updateAssignmentMutation.isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={updateAssignmentMutation.isLoading}
              >
                {updateAssignmentMutation.isLoading ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default UpdateAssignmentModal

