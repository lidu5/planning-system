import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Department = { id: number; name: string; sector?: { id: number; name: string } };
type Indicator = { id: number; name: string; unit?: string; description?: string; department: Department };

export default function Indicators() {
  const { user } = useAuth();
  const isSuperuser = !!user?.is_superuser;

  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Indicator | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [indRes, depRes] = await Promise.all([api.get('/api/indicators/'), api.get('/api/departments/')]);
      setIndicators(indRes.data);
      setDepartments(depRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!departmentId) {
      setError('Please select a department');
      return;
    }
    try {
      const payload = { name, unit, description, department_id: departmentId };
      if (editing) await api.put(`/api/indicators/${editing.id}/`, payload);
      else await api.post('/api/indicators/', payload);

      setName('');
      setUnit('');
      setDescription('');
      setDepartmentId('');
      setEditing(null);
      fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save failed');
    }
  };

  const onEdit = (i: Indicator) => {
    setEditing(i);
    setName(i.name);
    setUnit(i.unit || '');
    setDescription(i.description || '');
    setDepartmentId(i.department.id);
  };

  const onDelete = async (i: Indicator) => {
    if (!confirm(`Delete indicator "${i.name}"?`)) return;
    try {
      await api.delete(`/api/indicators/${i.id}/`);
      fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">Indicators</h2>

        {isSuperuser && (
          <form onSubmit={onSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Fishery per square area"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Unit</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., tons, %, km²"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editing ? 'Update' : 'Create'}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setName('');
                    setUnit('');
                    setDescription('');
                    setDepartmentId('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                rows={3}
                placeholder="Optional description"
              />
            </div>
          </form>
        )}

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="bg-white rounded-lg shadow overflow-hidden">

          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  {isSuperuser && <th className="px-4 py-3 font-medium w-40">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={isSuperuser ? 5 : 4} className="px-4 py-4 text-gray-500">Loading...</td></tr>
                ) : indicators.length === 0 ? (
                  <tr><td colSpan={isSuperuser ? 5 : 4} className="px-4 py-4 text-gray-500">No indicators yet.</td></tr>
                ) : (
                  indicators.map((i) => (
                    <tr key={i.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">{i.id}</td>
                      <td className="px-4 py-3">{i.name}</td>
                      <td className="px-4 py-3">{i.unit}</td>
                      <td className="px-4 py-3">{i.department?.name}</td>
                      {isSuperuser && (
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => onEdit(i)} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Edit</button>
                          <button onClick={() => onDelete(i)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-2 space-y-3">
            {loading ? (
              <p className="text-gray-500 text-center py-4">Loading...</p>
            ) : indicators.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No indicators yet.</p>
            ) : (
              indicators.map((i) => (
                <div key={i.id} className="bg-white shadow rounded-lg p-4">
                  <p className="text-sm"><span className="font-medium">ID:</span> {i.id}</p>
                  <p className="text-sm"><span className="font-medium">Name:</span> {i.name}</p>
                  <p className="text-sm"><span className="font-medium">Unit:</span> {i.unit}</p>
                  <p className="text-sm"><span className="font-medium">Department:</span> {i.department?.name}</p>
                  {isSuperuser && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => onEdit(i)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Edit</button>
                      <button onClick={() => onDelete(i)} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
