import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface AdvisorComment {
  id: number;
  author: number;
  author_username: string;
  year: number | null;
  sector: number | null;
  department: number | null;
  comment: string;
  created_at: string;
}

const AdvisorCommentsView: React.FC = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const canView = role === 'LEAD_EXECUTIVE_BODY' || role === 'STATE_MINISTER' || (user?.is_superuser ?? false);
  
  const [items, setItems] = useState<AdvisorComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<string>('');
  const [selectedComment, setSelectedComment] = useState<AdvisorComment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchComments = async (year?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params: Record<string, string> = {};
      if (year) params.year = year;
      
      const response = await api.get('/api/advisor-comments/', { params });
      const data = response.data?.results ?? response.data ?? [];
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load advisor comments. Please try again.');
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    
    const debounceTimer = setTimeout(() => {
      fetchComments(yearFilter);
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [canView, yearFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewComment = (comment: AdvisorComment) => {
    setSelectedComment(comment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedComment(null);
  };

  const handleYearFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d{0,4}$/.test(value)) {
      setYearFilter(value);
    }
  };

  const clearYearFilter = () => {
    setYearFilter('');
  };

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Advisor Comments</h1>
            <p className="text-gray-600 mt-2">Review comments from advisors and consultants</p>
          </div>
          
          {/* Filter Section */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={yearFilter}
                onChange={handleYearFilterChange}
                className="w-full md:w-48 pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                placeholder="Filter by year"
                maxLength={4}
              />
              {yearFilter && (
                <button
                  onClick={clearYearFilter}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear filter"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {yearFilter ? `Filtered by: ${yearFilter}` : 'Showing all years'}
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-700">Total Comments</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p className="text-gray-600">Loading comments...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-800">Error Loading Comments</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => fetchComments(yearFilter)}
                  className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Comments Found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {yearFilter 
                ? `No advisor comments found for the year ${yearFilter}. Try a different year or clear the filter.`
                : 'No advisor comments have been submitted yet.'}
            </p>
          </div>
        )}

        {/* Comments List */}
        {!loading && !error && items.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {items.map((comment) => (
              <div
                key={comment.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 overflow-hidden"
              >
                <div className="p-5">
                  {/* Comment Preview */}
                  <div className="mb-4">
                    <p className="text-gray-800 line-clamp-3 overflow-hidden text-ellipsis whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-gray-400 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium text-gray-700">{comment.author_username}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-gray-400 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{comment.year ? comment.year : 'All Years'}</span>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-500">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => handleViewComment(comment)}
                    className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium group"
                  >
                    <span>View Full Comment</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedComment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={handleCloseModal}
            aria-hidden="true"
          />
          
          {/* Modal Content */}
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Advisor Comment</h2>
                  <p className="text-gray-600 mt-1">Detailed view of the comment</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Comment Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-xl">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Author</div>
                    <div className="font-semibold text-gray-800 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {selectedComment.author_username}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Year</div>
                    <div className="font-semibold text-gray-800 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {selectedComment.year ? selectedComment.year : 'All Years'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Submitted On</div>
                    <div className="font-semibold text-gray-800 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDate(selectedComment.created_at)}
                    </div>
                  </div>
                </div>

                {/* Comment Content */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Comment
                  </h3>
                  <div className="bg-white p-5 rounded-xl border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedComment.comment}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow"
                  >
                    Close Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisorCommentsView;