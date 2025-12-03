import React, { useState } from 'react';
import { 
  PencilIcon, 
  ChatBubbleLeftIcon, 
  SwatchIcon,
  PhotoIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import axios from '../utils/axios';
import { toast } from 'react-toastify';

interface AnnotationToolbarProps {
  assignmentId: string;
  pageNumber: number;
  onAnnotationAdded: () => void;
}

interface AnnotationFormData {
  annotation_type: 'highlight' | 'comment' | 'markup';
  content: string;
  coordinates: string;
}

const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  assignmentId,
  pageNumber,
  onAnnotationAdded,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'highlight' | 'comment' | 'markup'>('comment');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const { register, handleSubmit, reset } = useForm<AnnotationFormData>();

  const onSubmit = async (data: AnnotationFormData) => {
    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      formData.append('assignment_id', assignmentId);
      formData.append('page_number', pageNumber.toString());
      formData.append('annotation_type', selectedType);
      formData.append('content', data.content);
      formData.append('coordinates', data.coordinates || '{}');
      
      if (file) {
        formData.append('file', file);
      }

      await axios.post('/api/annotations/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Annotation added successfully');
      onAnnotationAdded();
      setIsOpen(false);
      reset();
      setFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add annotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const annotationTypes = [
    { type: 'highlight', label: 'Highlight', icon: SwatchIcon, color: 'text-yellow-600' },
    { type: 'comment', label: 'Comment', icon: ChatBubbleLeftIcon, color: 'text-blue-600' },
    { type: 'markup', label: 'Markup', icon: PencilIcon, color: 'text-green-600' },
  ] as const;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Add Annotation</h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          {isOpen ? 'Cancel' : 'Add Annotation'}
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annotation Type
            </label>
            <div className="flex space-x-2">
              {annotationTypes.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md border ${
                    selectedType === type
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              {...register('content')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your annotation content..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload File (Optional)
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <PhotoIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              {file ? (
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  <p>
                    {isDragActive
                      ? 'Drop the file here...'
                      : 'Drag & drop a file here, or click to select'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports images and PDFs (max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                reset();
                setFile(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Annotation'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AnnotationToolbar;
