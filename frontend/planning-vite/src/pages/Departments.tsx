import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/error';
import { 
  Building, 
  Layers, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter, 
  X, 
  Save, 
  ChevronDown,
  Users,
  Hash,
  Briefcase,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

type Sector = { id: number; name: string };
type Department = { id: number; name: string; sector: Sector };

export default function Departments() {
  const { user } = useAuth();
  const isSuperuser = !!user?.is_superuser;
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [name, setName] = useState('');
  const [sectorId, setSectorId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<number | ''>('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [depsRes, secRes] = await Promise.all([
        api.get('/api/departments/'),
        api.get('/api/sectors/'),
      ]);
      setDepartments(depsRes.data);
      setSectors(secRes.data);
    } catch (e: any) {
      const msg = e?.userMessage || getErrorMessage(e, 'Failed to load data');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!sectorId) {
      setError('Please select a sector');
      return;
    }
    try {
      const payload = { name, sector_id: sectorId } as any;
      if (editing) {
        await api.put(`/api/departments/${editing.id}/`, payload);
      } else {
        await api.post('/api/departments/', payload);
      }
      setName('');
      setSectorId('');
      setEditing(null);
      fetchAll();
    } catch (e: any) {
      const msg = e?.userMessage || getErrorMessage(e, 'Save failed');
      setError(msg);
    }
  };

  const onEdit = (d: Department) => {
    setEditing(d);
    setName(d.name);
    setSectorId(d.sector.id);
  };

  const onDelete = async (d: Department) => {
    if (!confirm(`Delete department "${d.name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/api/departments/${d.id}/`);
      fetchAll();
    } catch (e: any) {
      const msg = e?.userMessage || getErrorMessage(e, 'Delete failed');
      setError(msg);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setName('');
    setSectorId('');
    setError(null);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSectorFilter('');
  };

  // Filter departments based on search and sector filter
  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = searchQuery === '' || 
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.sector?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSector = selectedSectorFilter === '' || 
      dept.sector?.id === selectedSectorFilter;
    
    return matchesSearch && matchesSector;
  });

  const hasActiveFilters = searchQuery !== '' || selectedSectorFilter !== '';

  // Get department count by sector
  const departmentCountBySector = sectors.reduce((acc, sector) => {
    acc[sector.id] = departments.filter(d => d.sector?.id === sector.id).length;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
              <p className="text-gray-600 mt-2">Manage departments across different sectors and organizations</p>
            </div>
            
            {isSuperuser && (
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Add New Department
              </button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Departments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{departments.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sectors</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{sectors.length}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Layers className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Filters</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {hasActiveFilters ? 1 : 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {hasActiveFilters ? 'Filters applied' : 'No filters'}
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Filter className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search departments by name or sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-64">
                  <div className="relative">
                    <select
                      value={selectedSectorFilter}
                      onChange={(e) => setSelectedSectorFilter(e.target.value ? Number(e.target.value) : '')}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm appearance-none"
                    >
                      <option value="">All Sectors</option>
                      {sectors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({departmentCountBySector[s.id] || 0})
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <Layers className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-full">
                    <Search className="w-3 h-3" />
                    Search: "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-blue-600 hover:text-blue-800 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedSectorFilter !== '' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-sm rounded-full">
                    <Layers className="w-3 h-3" />
                    Sector: {sectors.find(s => s.id === selectedSectorFilter)?.name}
                    <button
                      onClick={() => setSelectedSectorFilter('')}
                      className="text-emerald-600 hover:text-emerald-800 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Form */}
        {isSuperuser && (
          <div className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${editing ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                {editing ? <Edit2 className="w-5 h-5 text-yellow-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {editing ? `Editing "${editing.name}"` : 'Create New Department'}
                </h3>
                <p className="text-sm text-gray-600">
                  {editing ? 'Update the department details below' : 'Fill in the details to create a new department'}
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Briefcase className="inline w-4 h-4 mr-1" />
                    Department Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., Livestock Department"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Layers className="inline w-4 h-4 mr-1" />
                    Sector *
                  </label>
                  <div className="relative">
                    <select
                      value={sectorId}
                      onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                      required
                    >
                      <option value="">Select sector</option>
                      {sectors.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Save className="w-5 h-5" />
                  {editing ? 'Update Department' : 'Create Department'}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Results Summary */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Departments ({filteredDepartments.length})
              </h3>
              <p className="text-sm text-gray-600">
                Showing {filteredDepartments.length} of {departments.length} departments
                {hasActiveFilters && ' (filtered)'}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Sorted by name • {sectors.length} sectors available
            </div>
          </div>
        </div>

        {/* Departments Table/Cards */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sector</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-gray-600">Loading departments...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <Building className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium">
                          {departments.length === 0 ? 'No departments created yet' : 'No departments match your filters'}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {departments.length === 0 
                            ? 'Start by creating your first department' 
                            : 'Try adjusting your search or filters'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((d) => (
                    <tr 
                      key={d.id} 
                      className="hover:bg-blue-50/50 transition-colors duration-150 group"
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          #{d.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Building className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{d.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-100 rounded-md">
                            <Layers className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-gray-700">{d.sector?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isSuperuser && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => onEdit(d)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                              title="Edit department"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(d)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors duration-200"
                              title="Delete department"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">Loading departments...</p>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Building className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">
                  {departments.length === 0 ? 'No departments created yet' : 'No departments match your filters'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {departments.length === 0 
                    ? 'Start by creating your first department' 
                    : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredDepartments.map((d) => (
                  <div key={d.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{d.name}</h4>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              ID: {d.id}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              {d.sector?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isSuperuser && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => onEdit(d)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(d)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sector Distribution Summary */}
        {departments.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Distribution by Sector</h3>
            <div className="space-y-4">
              {sectors.map((sector) => {
                const count = departmentCountBySector[sector.id] || 0;
                const percentage = departments.length > 0 ? (count / departments.length) * 100 : 0;
                
                return (
                  <div key={sector.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{sector.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {count} department{count !== 1 ? 's' : ''} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}