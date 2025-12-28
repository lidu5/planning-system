import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Loader2,
  Lock,
  Unlock,
  CalendarDays,
  ChevronRight,
  Info,
  CalendarRange
} from 'lucide-react';

type WindowRow = {
  id: number;
  window_type: 'BREAKDOWN' | 'PERFORMANCE_Q1' | 'PERFORMANCE_Q2' | 'PERFORMANCE_Q3' | 'PERFORMANCE_Q4';
  year: number | null;
  always_open: boolean;
  start: string | null;
  end: string | null;
  active: boolean;
};

const WINDOW_TYPES = [
  { value: 'BREAKDOWN', label: 'Breakdown Submission', color: 'bg-blue-100 text-blue-800' },
  { value: 'PERFORMANCE_Q1', label: 'Q1 Performance', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'PERFORMANCE_Q2', label: 'Q2 Performance', color: 'bg-amber-100 text-amber-800' },
  { value: 'PERFORMANCE_Q3', label: 'Q3 Performance', color: 'bg-orange-100 text-orange-800' },
  { value: 'PERFORMANCE_Q4', label: 'Q4 Performance', color: 'bg-purple-100 text-purple-800' },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function EntryPeriods() {
  const { user } = useAuth();
  const isSuper = !!user?.is_superuser;
  const [rows, setRows] = useState<WindowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<WindowRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [formData, setFormData] = useState({
    window_type: 'BREAKDOWN' as WindowRow['window_type'],
    year: '',
    always_open: false,
    start: '',
    end: '',
    active: true,
  });

  const loadWindows = async () => {
    if (!isSuper) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/submission-windows/');
      setRows(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load submission windows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWindows();
  }, [isSuper]);

  const filteredRows = useMemo(() => {
    let filtered = rows;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row => 
        row.window_type.toLowerCase().includes(query) ||
        (row.year?.toString().includes(query) ?? false) ||
        (row.start?.toLowerCase().includes(query) ?? false) ||
        (row.end?.toLowerCase().includes(query) ?? false)
      );
    }
    
    // Apply active/inactive filter
    if (filterActive === 'active') {
      filtered = filtered.filter(row => row.active);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter(row => !row.active);
    }
    
    // Sort by type and year
    return filtered.sort((a, b) => {
      if (a.window_type === b.window_type) {
        return (b.year || 0) - (a.year || 0);
      }
      return a.window_type.localeCompare(b.window_type);
    });
  }, [rows, searchQuery, filterActive]);

  const openCreateModal = () => {
    setEditingRow(null);
    setFormData({
      window_type: 'BREAKDOWN',
      year: '',
      always_open: false,
      start: '',
      end: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (row: WindowRow) => {
    setEditingRow(row);
    setFormData({
      window_type: row.window_type,
      year: row.year ? String(row.year) : '',
      always_open: row.always_open,
      start: row.start ? row.start.slice(0, 16) : '',
      end: row.end ? row.end.slice(0, 16) : '',
      active: row.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.start && !formData.always_open) {
      setError('Please provide a start date or mark as always open');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        window_type: formData.window_type,
        year: formData.year ? Number(formData.year) : null,
        always_open: formData.always_open,
        start: formData.start ? new Date(formData.start).toISOString() : null,
        end: formData.end ? new Date(formData.end).toISOString() : null,
        active: formData.active,
      };

      if (editingRow) {
        await api.put(`/api/submission-windows/${editingRow.id}/`, payload);
        setSuccess('Submission window updated successfully');
      } else {
        await api.post('/api/submission-windows/', payload);
        setSuccess('Submission window created successfully');
      }

      setIsModalOpen(false);
      loadWindows();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save submission window');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (row: WindowRow) => {
    if (!confirm(`Are you sure you want to delete this ${row.window_type} window for ${row.year || 'all years'}?`)) {
      return;
    }

    try {
      await api.delete(`/api/submission-windows/${row.id}/`);
      setSuccess('Submission window deleted successfully');
      loadWindows();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to delete submission window');
    }
  };

  const getWindowTypeInfo = (type: string) => {
    return WINDOW_TYPES.find(t => t.value === type) || { label: type, color: 'bg-gray-100 text-gray-800' };
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isSuper) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Access Restricted</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Only administrators can manage entry periods. Please contact your system administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                <CalendarRange className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Entry Periods Management
                </h1>
                <p className="text-gray-600 mt-2">
                  Configure submission windows for breakdowns and quarterly performance reports
                </p>
              </div>
            </div>
            
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 hover:shadow-lg transition-all duration-200 font-medium"
            >
              <Plus className="w-5 h-5" />
              New Entry Window
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Windows</p>
                  <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Now</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {rows.filter(r => r.active).length}
                  </p>
                </div>
                <Unlock className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Always Open</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {rows.filter(r => r.always_open).length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Year</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {rows.filter(r => r.year === CURRENT_YEAR).length}
                  </p>
                </div>
                <CalendarDays className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by type, year, or date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterActive('all')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    filterActive === 'all'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterActive('active')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    filterActive === 'active'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active Only
                </button>
                <button
                  onClick={() => setFilterActive('inactive')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    filterActive === 'inactive'
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4 mb-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">{error}</div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-700">{success}</div>
                <button
                  onClick={() => setSuccess(null)}
                  className="ml-auto text-emerald-400 hover:text-emerald-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Always Open
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-40">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                          <p className="text-gray-600">Loading submission windows...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 font-medium mb-1">
                            {searchQuery ? 'No matching windows found' : 'No submission windows configured'}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {searchQuery
                              ? 'Try a different search term'
                              : 'Create your first submission window using the button above'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const typeInfo = getWindowTypeInfo(row.window_type);
                      return (
                        <tr
                          key={row.id}
                          className={`group hover:bg-gray-50 transition-all duration-200 ${
                            !row.active ? 'bg-gray-50/50' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${row.year ? 'text-gray-900' : 'text-gray-500'}`}>
                                {row.year || 'All Years'}
                              </span>
                              {row.year === CURRENT_YEAR && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              row.active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {row.active ? (
                                <>
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                  Active
                                </>
                              ) : (
                                <>
                                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                                  Inactive
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              row.always_open
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {row.always_open ? (
                                <>
                                  <Clock className="w-3 h-3" />
                                  Always Open
                                </>
                              ) : 'Time-bound'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {row.always_open ? (
                              <span className="text-gray-400">N/A</span>
                            ) : (
                              formatDateTime(row.start)
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {row.always_open ? (
                              <span className="text-gray-400">N/A</span>
                            ) : (
                              formatDateTime(row.end)
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => openEditModal(row)}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span className="text-sm font-medium">Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(row)}
                                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-sm font-medium">Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-gray-600">Loading submission windows...</p>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium mb-1">
                    {searchQuery ? 'No matching windows found' : 'No submission windows configured'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Create your first submission window using the button above'}
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {filteredRows.map((row) => {
                    const typeInfo = getWindowTypeInfo(row.window_type);
                    return (
                      <div
                        key={row.id}
                        className={`bg-white border rounded-xl p-5 shadow-sm ${
                          !row.active ? 'opacity-75 border-gray-200' : 'border-gray-200 hover:border-blue-300'
                        } transition-all duration-200`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                row.active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {row.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {row.year ? `Year ${row.year}` : 'All Years'}
                            </h3>
                            {row.always_open ? (
                              <p className="text-sm text-amber-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Always Open
                              </p>
                            ) : (
                              <div className="space-y-1 text-sm text-gray-600">
                                <p className="flex items-center gap-1">
                                  <ChevronRight className="w-3 h-3" />
                                  Starts: {formatDateTime(row.start)}
                                </p>
                                <p className="flex items-center gap-1">
                                  <ChevronRight className="w-3 h-3" />
                                  Ends: {formatDateTime(row.end)}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(row)}
                              className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            {!loading && filteredRows.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{filteredRows.length}</span> of{' '}
                    <span className="font-semibold">{rows.length}</span> windows
                  </p>
                  <div className="text-xs text-gray-500">
                    {rows.filter(r => r.active).length} active • {rows.filter(r => !r.active).length} inactive
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  editingRow ? 'bg-blue-100' : 'bg-emerald-100'
                }`}>
                  {editingRow ? (
                    <Edit className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Plus className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingRow ? 'Edit Entry Window' : 'Create New Entry Window'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure submission parameters
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Window Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Window Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.window_type}
                  onChange={(e) => setFormData({ ...formData, window_type: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  {WINDOW_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year and Always Open */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="e.g., 2025 (leave blank for all years)"
                    min="2000"
                    max="2100"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Leave blank to apply to all years
                  </p>
                </div>

                <div className="flex items-start pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.always_open}
                        onChange={(e) => setFormData({ ...formData, always_open: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                        formData.always_open ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}>
                        <div className={`bg-white w-4 h-4 rounded-full transition-transform duration-200 transform ${
                          formData.always_open ? 'translate-x-6' : 'translate-x-1'
                        } mt-1`}></div>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Always Open</span>
                      <p className="text-xs text-gray-500 mt-1">
                        No start/end date restrictions
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Date Range (conditionally shown) */}
              {!formData.always_open && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start}
                      onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      required={!formData.always_open}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.end}
                      onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      required={!formData.always_open}
                    />
                  </div>
                </div>
              )}

              {/* Active Status */}
              <div className="flex items-start pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                      formData.active ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}>
                      <div className={`bg-white w-4 h-4 rounded-full transition-transform duration-200 transform ${
                        formData.active ? 'translate-x-6' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Active Window</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Window is currently open for submissions
                    </p>
                  </div>
                </label>
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Windows without a specific year apply to all years</li>
                      <li>Active windows appear in user dashboards for submissions</li>
                      <li>Always open windows ignore date restrictions</li>
                      <li>Inactive windows are hidden from users</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : editingRow
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                    : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : editingRow ? (
                  <>
                    <Save className="w-4 h-4" />
                    Update Window
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Window
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add fade-in animation */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}