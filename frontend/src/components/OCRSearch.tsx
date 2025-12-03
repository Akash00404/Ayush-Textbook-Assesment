import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../utils/axios';
import { MagnifyingGlassIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface OCRSearchResult {
  id: string;
  book_id: string;
  page_number: number;
  content: string;
  confidence: number;
  language: string;
  created_at: string;
  book: {
    id: string;
    title: string;
    authors: string;
  };
}

interface OCRSearchProps {
  onResultClick?: (result: OCRSearchResult) => void;
}

const OCRSearch: React.FC<OCRSearchProps> = ({ onResultClick }) => {
  const [query, setQuery] = useState('');
  const [bookId, setBookId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ocr-search', query, bookId, page, limit],
    queryFn: async () => {
      if (!query.trim()) return null;
      
      const params = new URLSearchParams({
        query: query.trim(),
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (bookId) {
        params.append('bookId', bookId);
      }
      
      const response = await axios.get(`/api/ocr/search?${params}`);
      return response.data.data;
    },
    enabled: !!query.trim(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Search Book Content
        </h3>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Query
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search within book content..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Book ID (Optional)
            </label>
            <input
              type="text"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              placeholder="Filter by specific book..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">Failed to search content</p>
        </div>
      )}

      {data && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Found {data.pagination.total} results
              {data.pagination.total > 0 && (
                <span className="ml-2">
                  (Page {data.pagination.page} of {data.pagination.pages})
                </span>
              )}
            </p>
          </div>

          {data.results.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search terms or check if OCR processing is complete.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.results.map((result: OCRSearchResult) => (
                <div
                  key={result.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onResultClick?.(result)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {result.book.title}
                        </h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Page {result.page_number}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {Math.round(result.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        by {result.book.authors}
                      </p>
                      <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded border">
                        {highlightText(result.content, query)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Processed on {format(new Date(result.created_at), 'MMM dd, yyyy HH:mm')}
                    {result.language && (
                      <span className="ml-2">
                        • Language: {result.language}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.pagination.pages > 1 && (
            <div className="mt-6 flex justify-center">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {page} of {data.pagination.pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OCRSearch;
