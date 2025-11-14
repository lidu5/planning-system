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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold mb-4">Sectors</h2>

        {isSuperuser && (
          <form onSubmit={onSubmit} className="mb-6 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                placeholder="e.g., Agriculture and Horticulture Development Sector"
                required
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {editing ? 'Update' : 'Create'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
          </form>
        )}

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="overflow-x-auto bg-white border rounded">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Name</th>
                {isSuperuser && <th className="px-4 py-2 w-40">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-3" colSpan={3}>Loading...</td>
                </tr>
              ) : sectors.length === 0 ? (
                <tr>
                  <td className="px-4 py-3" colSpan={isSuperuser ? 3 : 2}>No sectors yet.</td>
                </tr>
              ) : (
                sectors.map((s) => (
                  <tr key={s.id} className="border-t">
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
      </div>
    </div>
  );
}
