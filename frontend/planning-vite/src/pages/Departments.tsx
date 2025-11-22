import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
      setError(e?.response?.data?.detail || 'Failed to load data');
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
      setError(e?.response?.data?.detail || 'Save failed');
    }
  };

  const onEdit = (d: Department) => {
    setEditing(d);
    setName(d.name);
    setSectorId(d.sector.id);
  };

  const onDelete = async (d: Department) => {
    if (!confirm(`Delete department "${d.name}"?`)) return;
    try {
      await api.delete(`/api/departments/${d.id}/`);
      fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        <h2 className="text-2xl font-semibold mb-6">Departments</h2>

        {isSuperuser && (
          <form onSubmit={onSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Livestock Department"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Sector</label>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select sector</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
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
                    setSectorId('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        {/* BORDERLESS RESPONSIVE TABLE */}
        <div className="bg-white rounded-lg shadow overflow-hidden">

          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium text-left">ID</th>
                  <th className="px-4 py-3 font-medium text-left">Name</th>
                  <th className="px-4 py-3 font-medium text-left">Sector</th>
                  {isSuperuser && <th className="px-4 py-3 font-medium text-left w-40">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isSuperuser ? 4 : 3} className="px-4 py-4 text-gray-500">Loading...</td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperuser ? 4 : 3} className="px-4 py-4 text-gray-500">No departments yet.</td>
                  </tr>
                ) : (
                  departments.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">{d.id}</td>
                      <td className="px-4 py-3">{d.name}</td>
                      <td className="px-4 py-3">{d.sector?.name}</td>
                      {isSuperuser && (
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => onEdit(d)} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Edit</button>
                          <button onClick={() => onDelete(d)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
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
            ) : departments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No departments yet.</p>
            ) : (
              departments.map((d) => (
                <div key={d.id} className="bg-white shadow rounded-lg p-4">
                  <p className="text-sm"><span className="font-medium">ID:</span> {d.id}</p>
                  <p className="text-sm"><span className="font-medium">Name:</span> {d.name}</p>
                  <p className="text-sm"><span className="font-medium">Sector:</span> {d.sector?.name}</p>
                  {isSuperuser && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => onEdit(d)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Edit</button>
                      <button onClick={() => onDelete(d)} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
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
