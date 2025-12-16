import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Layers, 
  Building, 
  Plus, 
  Edit2, 
  Trash2, 
  Filter, 
  Search, 
  RefreshCw,
  X,
  Save,
  ChevronDown,
  Hash,
  PieChart,
  CheckCircle,
  AlertCircle,
  Users,
  BarChart3
} from 'lucide-react';

type Sector = { id: number; name: string };
type Department = { id: number; name: string; sector?: Sector };
type IndicatorGroup = { id: number; name: string; department: Department };

export default function IndicatorGroups() {
  const { user } = useAuth();
  const isSuperuser = !!user?.is_superuser;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<IndicatorGroup[]>([]);
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<IndicatorGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadDepartments = async () => {
    try {
      const res = await api.get('/api/departments/');
      setDepartments(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load departments');
    }
  };

  const loadGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/indicator-groups', {
        params: departmentId ? { department: departmentId } : undefined,
      });
      setGroups(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
    loadGroups();
  }, []);

  useEffect(() => {
    loadGroups();
  }, [departmentId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!departmentId) {
      setError('Please select a department');
      return;
    }
    try {
      const payload = { name, department_id: departmentId } as any;
      if (editing) {
        await api.put(`/api/indicator-groups/${editing.id}/`, payload);
      } else {
        await api.post('/api/indicator-groups/', payload);
      }
      setName('');
      setDepartmentId('');
      setEditing(null);
      setShowForm(false);
      loadGroups();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save failed');
    }
  };

  const onEdit = (g: IndicatorGroup) => {
    setEditing(g);
    setName(g.name);
    setDepartmentId(g.department.id);
    setShowForm(true);
  };

  const onDelete = async (g: IndicatorGroup) => {
    if (!confirm(`Delete group "${g.name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/api/indicator-groups/${g.id}/`);
      loadGroups();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Delete failed');
    }
  };

  const resetForm = () => {
    setEditing(null);
    setName('');
    setDepartmentId('');
    setShowForm(false);
    setError(null);
  };

  // Filter groups based on search and department filter
  const filteredGroups = groups.filter(group => {
    const matchesSearch = searchQuery === '' || 
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.department?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentId === '' || 
      group.department?.id === departmentId;
    
    return matchesSearch && matchesDepartment;
  });

  // Get group count by department
  const groupCountByDepartment = departments.reduce((acc, dept) => {
    acc[dept.id] = groups.filter(g => g.department?.id === dept.id).length;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Indicator Groups</h1>
              <p className="text-gray-600 mt-2">Organize indicators into meaningful groups by department</p>
            </div>
            
            {isSuperuser && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Add New Group
              </button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Groups</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{groups.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Layers className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Departments</p>
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
                  <p className="text-sm font-medium text-gray-600">Active Filter</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {departmentId ? 1 : 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {departmentId ? 'Filter applied' : 'No filter'}
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
                  placeholder="Search groups by name or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-64">
                  <div className="relative">
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm appearance-none"
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({groupCountByDepartment[d.id] || 0})
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <Building className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={loadGroups}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchQuery || departmentId) && (
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-800 text-sm rounded-full">
                    <Search className="w-3 h-3" />
                    Search: "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-purple-600 hover:text-purple-800 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {departmentId !== '' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-800 text-sm rounded-full">
                    <Building className="w-3 h-3" />
                    Department: {departments.find(d => d.id === departmentId)?.name}
                    <button
                      onClick={() => setDepartmentId('')}
                      className="text-purple-600 hover:text-purple-800 ml-1"
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
        {showForm && isSuperuser && (
          <div className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${editing ? 'bg-yellow-100' : 'bg-purple-100'}`}>
                  {editing ? <Edit2 className="w-5 h-5 text-yellow-600" /> : <Plus className="w-5 h-5 text-purple-600" />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {editing ? `Editing "${editing.name}"` : 'Create New Indicator Group'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {editing ? 'Update the group details below' : 'Organize indicators into meaningful groups'}
                  </p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Layers className="inline w-4 h-4 mr-1" />
                    Group Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., Productivity KPIs, Quality Metrics"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building className="inline w-4 h-4 mr-1" />
                    Department *
                  </label>
                  <div className="relative">
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                      required
                    >
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">All groups must be associated with a department</p>
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Save className="w-5 h-5" />
                  {editing ? 'Update Group' : 'Create Group'}
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
                Indicator Groups ({filteredGroups.length})
              </h3>
              <p className="text-sm text-gray-600">
                Showing {filteredGroups.length} of {groups.length} groups
                {(searchQuery || departmentId) && ' (filtered)'}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Sorted by department • {departments.length} departments
            </div>
          </div>
        </div>

        {/* Groups Table/Cards */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Group</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sector</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-gray-300 border-t-purple-600 rounded-full animate-spin"></div>
                        <p className="text-gray-600">Loading indicator groups...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <Layers className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium">
                          {groups.length === 0 ? 'No indicator groups created yet' : 'No groups match your filters'}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {groups.length === 0 
                            ? 'Start by creating your first indicator group' 
                            : 'Try adjusting your search or filters'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((g) => (
                    <tr 
                      key={g.id} 
                      className="hover:bg-purple-50/50 transition-colors duration-150 group"
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          #{g.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Layers className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{g.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded-md">
                            <Building className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-gray-700">{g.department?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-100 rounded-md">
                            <PieChart className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-gray-700">{g.department?.sector?.name || 'No sector'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isSuperuser && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => onEdit(g)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                              title="Edit group"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(g)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors duration-200"
                              title="Delete group"
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
                <div className="w-8 h-8 border-3 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">Loading indicator groups...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Layers className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">
                  {groups.length === 0 ? 'No indicator groups created yet' : 'No groups match your filters'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {groups.length === 0 
                    ? 'Start by creating your first indicator group' 
                    : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredGroups.map((g) => (
                  <div key={g.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Layers className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{g.name}</h4>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              ID: {g.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{g.department?.name}</span>
                      </div>
                      {g.department?.sector?.name && (
                        <div className="flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">Sector: {g.department.sector.name}</span>
                        </div>
                      )}
                    </div>

                    {isSuperuser && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => onEdit(g)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(g)}
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

        {/* Distribution Summary */}
        {groups.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Distribution by Department</h3>
            <div className="space-y-4">
              {departments
                .filter(dept => groupCountByDepartment[dept.id] > 0)
                .map((dept) => {
                  const count = groupCountByDepartment[dept.id] || 0;
                  const percentage = groups.length > 0 ? (count / groups.length) * 100 : 0;
                  
                  return (
                    <div key={dept.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {count} group{count !== 1 ? 's' : ''} ({percentage.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-500"
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