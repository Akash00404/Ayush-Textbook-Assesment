import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import axios from '../utils/axios'

interface UploadBookModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface BookFormData {
  title: string
  authors: string
  publisher: string
  year: number
  edition: string
  syllabus_version: string
  pdf: FileList
}

const UploadBookModal = ({ isOpen, onClose, onSuccess }: UploadBookModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BookFormData>()

  const onSubmit = async (data: BookFormData) => {
    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('authors', data.authors)
      formData.append('publisher', data.publisher)
      formData.append('year', data.year.toString())
      formData.append('edition', data.edition)
      formData.append('syllabus_version', data.syllabus_version)
      formData.append('pdf', data.pdf[0])

      await axios.post('/books', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      toast.success('Book uploaded successfully')
      reset()
      onSuccess()
    } catch (error) {
      console.error('Error uploading book:', error)
      toast.error('Failed to upload book')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={onClose}>
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true"
          >
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={onClose}
                >
                  <span className="sr-only">Close</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 font-medium text-gray-900"
                  >
                    Upload New Book
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Fill in the details and upload the PDF file of the textbook for review.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label htmlFor="title" className="form-label">
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      className="form-input"
                      {...register('title', { required: 'Title is required' })}
                    />
                    {errors.title && (
                      <p className="form-error">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="authors" className="form-label">
                      Authors
                    </label>
                    <input
                      type="text"
                      id="authors"
                      className="form-input"
                      {...register('authors', { required: 'Authors are required' })}
                    />
                    {errors.authors && (
                      <p className="form-error">{errors.authors.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="publisher" className="form-label">
                        Publisher
                      </label>
                      <input
                        type="text"
                        id="publisher"
                        className="form-input"
                        {...register('publisher', { required: 'Publisher is required' })}
                      />
                      {errors.publisher && (
                        <p className="form-error">{errors.publisher.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="year" className="form-label">
                        Year
                      </label>
                      <input
                        type="number"
                        id="year"
                        className="form-input"
                        {...register('year', {
                          required: 'Year is required',
                          min: {
                            value: 1900,
                            message: 'Year must be after 1900',
                          },
                          max: {
                            value: new Date().getFullYear(),
                            message: 'Year cannot be in the future',
                          },
                        })}
                      />
                      {errors.year && (
                        <p className="form-error">{errors.year.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edition" className="form-label">
                        Edition
                      </label>
                      <input
                        type="text"
                        id="edition"
                        className="form-input"
                        {...register('edition', { required: 'Edition is required' })}
                      />
                      {errors.edition && (
                        <p className="form-error">{errors.edition.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="syllabus_version" className="form-label">
                        Syllabus Version
                      </label>
                      <input
                        type="text"
                        id="syllabus_version"
                        className="form-input"
                        {...register('syllabus_version', { required: 'Syllabus version is required' })}
                      />
                      {errors.syllabus_version && (
                        <p className="form-error">{errors.syllabus_version.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pdf" className="form-label">
                      PDF File
                    </label>
                    <input
                      type="file"
                      id="pdf"
                      accept=".pdf"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      {...register('pdf', {
                        required: 'PDF file is required',
                        validate: {
                          isPDF: (files) =>
                            files[0]?.type === 'application/pdf' ||
                            'Only PDF files are allowed',
                          fileSize: (files) =>
                            files[0]?.size < 10 * 1024 * 1024 ||
                            'File size must be less than 10MB',
                        },
                      })}
                    />
                    {errors.pdf && (
                      <p className="form-error">{errors.pdf.message}</p>
                    )}
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full sm:col-start-2"
                    >
                      {isSubmitting ? 'Uploading...' : 'Upload Book'}
                    </button>
                    <button
                      type="button"
                      className="btn-outline w-full sm:col-start-1 mt-3 sm:mt-0"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export default UploadBookModal