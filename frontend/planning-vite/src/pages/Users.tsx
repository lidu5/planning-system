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
  const [form, setForm] = useState<{
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    sector_id: number | '';
    department_id: number | '';
    is_active: boolean;
    password: string;
  }>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'ADVISOR',
    sector_id: '',
    department_id: '',
    is_active: true,
    password: '',
  });

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
    const res = await api.get('/api/departments/', {
      params: sectorId ? { sector: sectorId } : {},
    });
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
    setForm({
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      role: 'ADVISOR',
      sector_id: '',
      department_id: '',
      is_active: true,
      password: '',
    });
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
    if (sid) await loadDepartments(Number(sid));
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

    return rows.filter((r) =>
      [
        r.username,
        r.first_name,
        r.last_name,
        r.email,
        r.role,
        r.sector?.name,
        r.department?.name,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600 text-sm bg-white px-4 py-3 rounded shadow">
          Only Django superuser can access User Management.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-semibold text-gray-800">
            User Management
          </h2>

          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="w-56 border rounded-lg px-3 py-2 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700 transition"
            >
              + Create User
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-red-600 bg-red-50 px-4 py-2 rounded border border-red-200">
            {error}
          </div>
        )}

        {/* RESPONSIVE & BORDERLESS TABLE */}
        <div className="bg-white rounded-lg shadow-sm">

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  {[
                    'Username',
                    'Name',
                    'Email',
                    'Role',
                    'Sector',
                    'Department',
                    // 'Active',
                    'Actions',
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-gray-50 transition ${
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{r.username}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {[r.first_name, r.last_name].filter(Boolean).join(' ')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.role}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.sector?.name || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.department?.name || '-'}</td>
                    {/* <td className="px-4 py-3 whitespace-nowrap">
                      {r.is_active ? (
                        <span className="text-emerald-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-red-600 font-medium">No</span>
                      )}
                    </td> */}
                    <td className="px-4 py-3 whitespace-nowrap flex gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(r)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-2">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="text-lg font-semibold">{r.username}</div>

                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="font-medium">Name: </span>{[r.first_name, r.last_name].filter(Boolean).join(' ')}</p>
                  <p><span className="font-medium">Email: </span>{r.email}</p>
                  <p><span className="font-medium">Role: </span>{r.role}</p>
                  <p><span className="font-medium">Sector: </span>{r.sector?.name || '-'}</p>
                  <p><span className="font-medium">Department: </span>{r.department?.name || '-'}</p>
                  {/* <p>
                    <span className="font-medium">Active: </span>
                    {r.is_active ? (
                      <span className="text-emerald-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-red-600 font-medium">No</span>
                    )}
                  </p> */}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openEdit(r)}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="text-center text-gray-500 py-4">No users found.</p>
            )}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg overflow-hidden animate-fadeIn">
              <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">
                  {editing ? 'Edit User' : 'Create User'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✖
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Username', key: 'username' },
                  { label: 'Email', key: 'email' },
                  { label: 'First Name', key: 'first_name' },
                  { label: 'Last Name', key: 'last_name' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block mb-1 text-gray-700 text-sm font-medium">
                      {f.label}
                    </label>
                    <input
                      value={(form as any)[f.key]}
                      onChange={(e) =>
                        setForm({ ...form, [f.key]: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ))}

                <div>
                  <label className="block mb-1 text-gray-700 text-sm font-medium">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 mt-6">
                  <input
                    id="active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>

                <div>
                  <label className="block mb-1 text-gray-700 text-sm font-medium">
                    Sector
                  </label>
                  <select
                    value={form.sector_id}
                    onChange={(e) =>
                      onSectorChange(
                        e.target.value ? Number(e.target.value) : ''
                      )
                    }
                    className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">None</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-gray-700 text-sm font-medium">
                    Department
                  </label>
                  <select
                    value={form.department_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        department_id: e.target.value
                          ? Number(e.target.value)
                          : '',
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 text-gray-700 text-sm font-medium">
                    Password{' '}
                    {editing && (
                      <span className="text-gray-500">
                        (leave blank to keep unchanged)
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700 transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
