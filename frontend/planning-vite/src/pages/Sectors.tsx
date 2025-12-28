import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Edit2,
  Trash2,
  Plus,
  Search,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  Users,
  ChevronRight,
  Filter,
  Calendar
} from 'lucide-react';

type Sector = { id: number; name: string };

export default function Sectors() {
  const { user } = useAuth();
  const isSuperuser = !!user?.is_superuser;
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [filteredSectors, setFilteredSectors] = useState<Sector[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<Sector | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'id' | 'name'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchSectors = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/sectors/');
      setSectors(res.data);
      setFilteredSectors(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load sectors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectors();
  }, []);

  useEffect(() => {
    let filtered = [...sectors];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(sector =>
        sector.name.toLowerCase().includes(query) ||
        sector.id.toString().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (sortBy === 'id') {
        aValue = a.id;
        bValue = b.id;
      } else {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    setFilteredSectors(filtered);
  }, [sectors, searchTerm, sortBy, sortOrder]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (editing) {
        await api.put(`/api/sectors/${editing.id}/`, { name });
        setSuccess(`Sector "${name}" updated successfully!`);
      } else {
        await api.post('/api/sectors/', { name });
        setSuccess(`Sector "${name}" created successfully!`);
      }
      setName('');
      setEditing(null);
      fetchSectors();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEdit = (s: Sector) => {
    setEditing(s);
    setName(s.name);
    // Scroll to form
    document.getElementById('sector-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onDelete = async (s: Sector) => {
    if (!window.confirm(`Are you sure you want to delete "${s.name}"? This action cannot be undone.`)) return;
    
    try {
      await api.delete(`/api/sectors/${s.id}/`);
      setSuccess(`Sector "${s.name}" deleted successfully!`);
      fetchSectors();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Delete failed');
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setName('');
  };

  const toggleSort = (column: 'id' | 'name') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  State Minister Sectors
                </h1>
                <p className="text-gray-600 mt-2">
                  Manage agricultural sectors organized under state ministers
                </p>
              </div>
            </div>
            
            {isSuperuser && (
              <div className="flex items-center gap-2 text-sm">
                <div className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-medium">
                  {sectors.length} {sectors.length === 1 ? 'Sector' : 'Sectors'}
                </div>
                {sectors.length > 0 && (
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                    {new Date().getFullYear()} Active
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search and Sort */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search sectors by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition-all duration-200"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSort('id')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    sortBy === 'id'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Sort by ID
                  {sortBy === 'id' && (
                    <span className="text-xs">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => toggleSort('name')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    sortBy === 'name'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Sort by Name
                  {sortBy === 'name' && (
                    <span className="text-xs">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section (Superuser Only) */}
        {isSuperuser && (
          <div id="sector-form" className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${editing ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  {editing ? (
                    <Edit2 className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Plus className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editing ? 'Edit Sector' : 'Create New Sector'}
                </h2>
              </div>

              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sector Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition-all duration-200"
                    placeholder="e.g., Agriculture and Horticulture Development Sector"
                    required
                    disabled={isSubmitting}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Enter the complete name of the state minister sector
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !name.trim()}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 ${
                      isSubmitting || !name.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : editing
                        ? 'bg-amber-600 hover:bg-amber-700 hover:shadow-lg'
                        : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:shadow-lg'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : editing ? (
                      <>
                        <Save className="w-4 h-4" />
                        Update Sector
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Sector
                      </>
                    )}
                  </button>

                  {editing && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

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

        {/* Sectors List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort('id')}
                      className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                    >
                      ID
                      {sortBy === 'id' && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                    >
                      Sector Name
                      {sortBy === 'name' && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  {isSuperuser && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={isSuperuser ? 3 : 2} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                        <p className="text-gray-600">Loading sectors...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredSectors.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperuser ? 3 : 2} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Building2 className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium mb-1">
                          {searchTerm ? 'No matching sectors found' : 'No sectors available'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {searchTerm
                            ? 'Try a different search term'
                            : isSuperuser
                            ? 'Create your first sector using the form above'
                            : 'No sectors have been created yet'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSectors.map((sector) => (
                    <tr
                      key={sector.id}
                      className="group hover:bg-gray-50 transition-all duration-200"
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-lg shadow-sm">
                          {sector.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <div>
                            <span className="text-gray-900 font-medium">{sector.name}</span>
                            <p className="text-xs text-gray-500 mt-1">
                              State Minister Sector
                            </p>
                          </div>
                        </div>
                      </td>
                      {isSuperuser && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => onEdit(sector)}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="text-sm font-medium">Edit</span>
                            </button>
                            <button
                              onClick={() => onDelete(sector)}
                              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-sm font-medium">Delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Loading sectors...</p>
              </div>
            ) : filteredSectors.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium mb-1">
                  {searchTerm ? 'No matching sectors found' : 'No sectors available'}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm
                    ? 'Try a different search term'
                    : isSuperuser
                    ? 'Create your first sector using the form above'
                    : 'No sectors have been created yet'}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {filteredSectors.map((sector) => (
                  <div
                    key={sector.id}
                    className="bg-gray-50 rounded-xl p-5 border border-gray-200 hover:border-emerald-300 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span className="inline-flex items-center justify-center w-10 h-10 bg-white text-emerald-800 rounded-xl font-bold shadow-sm border">
                          {sector.id}
                        </span>
                      </div>
                      {isSuperuser && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEdit(sector)}
                            className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(sector)}
                            className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="text-gray-900 font-medium text-sm mb-2">Sector Name</h3>
                    <p className="text-gray-700 font-semibold text-base leading-relaxed mb-3">
                      {sector.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Users className="w-3 h-3" />
                      <span>State Minister Sector</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          {!loading && filteredSectors.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{filteredSectors.length}</span> of{' '}
                  <span className="font-semibold">{sectors.length}</span> sectors
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear search
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">About State Minister Sectors</h3>
              <p className="text-gray-600 text-sm mb-3">
                State Minister Sectors represent the main organizational units under the Ministry of Agriculture. 
                Each sector focuses on specific agricultural domains and is managed by designated state ministers.
                These sectors form the foundation for planning, monitoring, and reporting agricultural activities.
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>Organizational Units</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Annual Planning Basis</span>
                </div>
                <div className="flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  <span>Performance Tracking</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add fade-in animation */}
      {/* <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style> */}
    </div>
  );
}