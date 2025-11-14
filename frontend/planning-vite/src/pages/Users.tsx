import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Sector = { id: number; name: string };
type Department = { id: number; name: string; sector: Sector };

type UserRow = {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role: string;
  sector?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  is_active: boolean;
};

const ROLES = [
  'ADVISOR',
  'STATE_MINISTER',
  'STRATEGIC_STAFF',
  'EXECUTIVE',
  'MINISTER_VIEW',
];

export default function Users() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [query, setQuery] = useState('');

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<{ username: string; first_name: string; last_name: string; email: string; role: string; sector_id: number | ''; department_id: number | ''; is_active: boolean; password: string }>({ username: '', first_name: '', last_name: '', email: '', role: 'ADVISOR', sector_id: '', department_id: '', is_active: true, password: '' });

  const canAccess = !!user?.is_superuser;

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/users/');
      setRows(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadSectors = async () => {
    const res = await api.get('/api/sectors/');
    setSectors(res.data || []);
  };

  const loadDepartments = async (sectorId?: number) => {
    const res = await api.get('/api/departments/', { params: sectorId ? { sector: sectorId } : {} });
    setDepartments(res.data || []);
  };

  useEffect(() => {
    if (!canAccess) return;
    loadUsers();
    loadSectors();
    loadDepartments();
  }, [canAccess]);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', first_name: '', last_name: '', email: '', role: 'ADVISOR', sector_id: '', department_id: '', is_active: true, password: '' });
    setModalOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      username: u.username,
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      email: u.email || '',
      role: u.role,
      sector_id: u.sector?.id || '',
      department_id: u.department?.id || '',
      is_active: u.is_active,
      password: '',
    });
    if (u.sector?.id) loadDepartments(u.sector.id);
    setModalOpen(true);
  };

  const onSectorChange = async (sid: number | '') => {
    setForm((f) => ({ ...f, sector_id: sid, department_id: '' }));
    if (sid) await loadDepartments(sid as number);
  };

  const save = async () => {
    try {
      const payload: any = {
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        sector_id: form.sector_id || null,
        department_id: form.department_id || null,
        is_active: form.is_active,
      };
      if (form.password) payload.password = form.password;
      if (editing) {
        await api.put(`/api/users/${editing.id}/`, payload);
      } else {
        await api.post('/api/users/', payload);
      }
      setModalOpen(false);
      await loadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save failed');
    }
  };

  const remove = async (u: UserRow) => {
    if (!confirm(`Delete user ${u.username}?`)) return;
    try {
      await api.delete(`/api/users/${u.id}/`);
      await loadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Delete failed');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.username, r.first_name, r.last_name, r.email, r.role, r.sector?.name, r.department?.name].join(' ').toLowerCase().includes(q));
  }, [rows, query]);

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-sm text-gray-600">Only Django superuser can access User Management.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">User Management</h2>
          <div className="flex items-center gap-2">
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search..." className="w-44 border rounded px-3 py-2 focus:outline-none focus:ring" />
            <button onClick={openCreate} className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Create User</button>
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="overflow-x-auto bg-white border rounded shadow-sm">
          {loading ? (
            <div className="p-6 text-sm">Loading...</div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2">Username</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Sector</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Active</th>
                  <th className="px-4 py-2 w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3">{r.username}</td>
                    <td className="px-4 py-3">{[r.first_name, r.last_name].filter(Boolean).join(' ')}</td>
                    <td className="px-4 py-3">{r.email}</td>
                    <td className="px-4 py-3">{r.role}</td>
                    <td className="px-4 py-3">{r.sector?.name || '-'}</td>
                    <td className="px-4 py-3">{r.department?.name || '-'}</td>
                    <td className="px-4 py-3">{r.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <button onClick={()=>openEdit(r)} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Edit</button>
                      <button onClick={()=>remove(r)} className="ml-2 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td className="px-4 py-3" colSpan={8}>No users found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div className="font-semibold">{editing ? 'Edit User' : 'Create User'}</div>
                <button onClick={()=>setModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Username</label>
                  <input value={form.username} onChange={(e)=>setForm({...form, username: e.target.value})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">First Name</label>
                  <input value={form.first_name} onChange={(e)=>setForm({...form, first_name: e.target.value})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Last Name</label>
                  <input value={form.last_name} onChange={(e)=>setForm({...form, last_name: e.target.value})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Role</label>
                  <select value={form.role} onChange={(e)=>setForm({...form, role: e.target.value})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input id="active" type="checkbox" checked={form.is_active} onChange={(e)=>setForm({...form, is_active: e.target.checked})} />
                  <label htmlFor="active" className="text-sm text-gray-700">Active</label>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Sector</label>
                  <select value={form.sector_id} onChange={(e)=>onSectorChange(e.target.value ? Number(e.target.value) : '')} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring">
                    <option value="">None</option>
                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Department</label>
                  <select value={form.department_id} onChange={(e)=>setForm({...form, department_id: (e.target.value ? Number(e.target.value) : '')})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring">
                    <option value="">None</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Password {editing ? '(leave blank to keep unchanged)' : ''}</label>
                  <input type="password" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
                </div>
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2">
                <button onClick={()=>setModalOpen(false)} className="px-4 py-2 rounded border">Cancel</button>
                <button onClick={save} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
