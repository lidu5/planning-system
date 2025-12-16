import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const AdvisorCommentSubmit: React.FC = () => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdvisor = (user?.role || '').toUpperCase() === 'ADVISOR';
  if (!isAdvisor) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!comment.trim()) {
      setError('Please enter a comment.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/advisor-comments/', {
        comment: comment.trim(),
        year: year === '' ? null : year,
      });
      setComment('');
      setSuccess('Comment submitted successfully.');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Advisor Overall Comment</h1>
      {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
      {success && <div className="mb-3 text-green-700 text-sm">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-1">Year (optional)</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. 2025"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Overall Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border rounded px-3 py-2 h-40"
            placeholder="Write your overall comment here..."
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Comment'}
        </button>
      </form>
    </div>
  );
};

export default AdvisorCommentSubmit;
