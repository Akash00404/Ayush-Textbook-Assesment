import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../utils/axios';
import { Book, AISummary } from '../types/book';
import AISummaryPreview from '../components/AISummaryPreview';

const PublicPortalPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);

  // Fetch approved books (public endpoint, no auth required)
  const { data: books, isLoading } = useQuery<Book[]>({
    queryKey: ['public-books'],
    queryFn: async () => {
      const response = await axios.get('/books/public/approved');
      return response.data.data.books;
    },
  });

  // Get unique subjects for filter
  const subjects = useMemo(() => {
    if (!books) return [];
    const uniqueSubjects = new Set(books.map((book) => book.subject));
    return Array.from(uniqueSubjects).sort();
  }, [books]);

  // Filter books
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    return books.filter((book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.publisher.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = !selectedSubject || book.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [books, searchQuery, selectedSubject]);

  const selectedBookData = useMemo(() => {
    if (!selectedBook || !books) return null;
    return books.find((b) => b.id === selectedBook);
  }, [selectedBook, books]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            NCISM Approved Textbooks
          </h1>
          <p className="mt-2 text-gray-600">
            Browse officially approved textbooks for Indian System of Medicine
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Book List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-4">
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Subject Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Results Count */}
              <div className="mb-4 text-sm text-gray-600">
                {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} found
              </div>

              {/* Book List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredBooks.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No books found matching your criteria.
                  </p>
                ) : (
                  filteredBooks.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => setSelectedBook(book.id)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        selectedBook === book.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {book.title}
                      </h3>
                      <p className="text-xs text-gray-600 mb-1">
                        by {book.author}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Approved
                        </span>
                        <span className="text-xs text-gray-500">
                          {book.subject}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Book Details */}
          <div className="lg:col-span-2">
            {selectedBookData ? (
              <div className="space-y-6">
                {/* Book Info */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {selectedBookData.title}
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Author</h3>
                      <p className="text-gray-900">{selectedBookData.author}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Publisher</h3>
                      <p className="text-gray-900">{selectedBookData.publisher}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Edition</h3>
                      <p className="text-gray-900">{selectedBookData.edition}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                      <p className="text-gray-900">{selectedBookData.subject}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Year</h3>
                      <p className="text-gray-900">{selectedBookData.year}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                        Approved
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Summary */}
                <AISummaryPreview bookId={selectedBookData.id} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">
                  Select a book from the list to view details and AI-generated summary.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPortalPage;

