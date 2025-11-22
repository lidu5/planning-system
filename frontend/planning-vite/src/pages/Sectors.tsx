import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Sector = { id: number; name: string };

export default function Sectors() {
  const { user } = useAuth();
  const isSuperuser = !!user?.is_superuser;
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Sector | null>(null);

  const fetchSectors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/sectors/');
      setSectors(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load sectors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectors();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await api.put(`/api/sectors/${editing.id}/`, { name });
      } else {
        await api.post('/api/sectors/', { name });
      }
      setName('');
      setEditing(null);
      fetchSectors();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save failed');
    }
  };

  const onEdit = (s: Sector) => {
    setEditing(s);
    setName(s.name);
  };

  const onDelete = async (s: Sector) => {
    if (!confirm(`Delete sector "${s.name}"?`)) return;
    try {
      await api.delete(`/api/sectors/${s.id}/`);
      fetchSectors();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        <h2 className="text-2xl font-semibold mb-6">Sectors</h2>

        {isSuperuser && (
          <form onSubmit={onSubmit} className="mb-6 flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">State Minister Sectors </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Agriculture and Horticulture Development Sector"
                required
              />
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
                  {isSuperuser && <th className="px-4 py-3 font-medium text-left w-40">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isSuperuser ? 3 : 2} className="px-4 py-4 text-gray-500">Loading...</td>
                  </tr>
                ) : sectors.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperuser ? 3 : 2} className="px-4 py-4 text-gray-500">No sectors yet.</td>
                  </tr>
                ) : (
                  sectors.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">{s.id}</td>
                      <td className="px-4 py-3">{s.name}</td>
                      {isSuperuser && (
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => onEdit(s)} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Edit</button>
                          <button onClick={() => onDelete(s)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
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
            ) : sectors.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No sectors yet.</p>
            ) : (
              sectors.map((s) => (
                <div key={s.id} className="bg-white shadow rounded-lg p-4">
                  <p className="text-sm"><span className="font-medium">ID:</span> {s.id}</p>
                  <p className="text-sm"><span className="font-medium">Name:</span> {s.name}</p>
                  {isSuperuser && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => onEdit(s)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Edit</button>
                      <button onClick={() => onDelete(s)} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
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
