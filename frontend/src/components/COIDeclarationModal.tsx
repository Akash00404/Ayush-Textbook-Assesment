import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import axios from '../utils/axios';
import { toast } from 'react-toastify';

interface COIDeclarationModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  bookTitle: string;
  onSuccess: () => void;
}

interface COIFormData {
  has_conflict: boolean;
  conflict_details: string;
}

const COIDeclarationModal: React.FC<COIDeclarationModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  bookTitle,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, watch, reset } = useForm<COIFormData>({
    defaultValues: {
      has_conflict: false,
      conflict_details: '',
    },
  });

  const hasConflict = watch('has_conflict');

  const onSubmit = async (data: COIFormData) => {
    try {
      setIsSubmitting(true);
      await axios.post('/api/coi/submit', {
        assignment_id: assignmentId,
        has_conflict: data.has_conflict,
        conflict_details: data.has_conflict ? data.conflict_details : null,
      });

      toast.success('COI declaration submitted successfully');
      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit COI declaration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md rounded bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Conflict of Interest Declaration
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Book: <span className="font-medium">{bookTitle}</span>
            </p>
            <p className="text-sm text-gray-600">
              Please declare any potential conflicts of interest before proceeding with your review.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="false"
                  {...register('has_conflict')}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm text-gray-700">
                  I have no conflicts of interest with this book or its authors
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="true"
                  {...register('has_conflict')}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm text-gray-700">
                  I have potential conflicts of interest
                </span>
              </label>
            </div>

            {hasConflict && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Please describe the conflict of interest:
                </label>
                <textarea
                  {...register('conflict_details')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe the nature of the conflict..."
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Declaration'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default COIDeclarationModal;
