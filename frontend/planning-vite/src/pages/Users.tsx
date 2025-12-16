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
  'LEAD_EXECUTIVE_BODY',
];

// Add role display names mapping
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  'ADVISOR': 'Advisor',
  'STATE_MINISTER': 'State Minister',
  'STRATEGIC_STAFF': 'Strategic Staff',
  'EXECUTIVE': 'Executive',
  'MINISTER_VIEW': 'Minister View',
  'LEAD_EXECUTIVE_BODY': 'Lead Executive Body',
};

export default function Users() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const canAccess = !!user?.is_superuser;

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/users/');
      setRows(res.data || []);
      setSelectedUserIds([]); // Clear selections on reload
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadSectors = async () => {
    try {
      const res = await api.get('/api/sectors/');
      setSectors(res.data || []);
    } catch (error) {
      console.error('Failed to load sectors:', error);
    }
  };

  const loadDepartments = async (sectorId?: number) => {
    try {
      const res = await api.get('/api/departments/', {
        params: sectorId ? { sector: sectorId } : {},
      });
      setDepartments(res.data || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
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
    setShowPassword(false);
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
    setShowPassword(false);
    if (u.sector?.id) loadDepartments(u.sector.id);
    setModalOpen(true);
  };

  const onSectorChange = async (sid: number | '') => {
    setForm((f) => ({ ...f, sector_id: sid, department_id: '' }));
    if (sid) await loadDepartments(Number(sid));
  };

  const save = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const payload: any = {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        role: form.role,
        sector_id: form.sector_id || null,
        department_id: form.department_id || null,
        is_active: form.is_active,
      };
      if (form.password) payload.password = form.password;

      if (editing) {
        await api.put(`/api/users/${editing.id}/`, payload);
        setSuccessMessage('User updated successfully');
      } else {
        await api.post('/api/users/', payload);
        setSuccessMessage('User created successfully');
      }

      setModalOpen(false);
      await loadUsers();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save failed');
    } finally {
      setActionLoading(false);
    }
  };

  const remove = async (u: UserRow) => {
    if (!confirm(`Are you sure you want to delete user "${u.username}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/api/users/${u.id}/`);
      setSuccessMessage(`User "${u.username}" deleted successfully`);
      await loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Delete failed');
    }
  };

  const toggleUserStatus = async (user: UserRow, newStatus: boolean) => {
    try {
      await api.patch(`/api/users/${user.id}/`, { is_active: newStatus });
      setSuccessMessage(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      await loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Status update failed');
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === paged.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(paged.map(user => user.id));
    }
  };

  const toggleSelectUser = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const bulkToggleStatus = async (newStatus: boolean) => {
    if (selectedUserIds.length === 0) {
      setError('No users selected');
      return;
    }

    try {
      const promises = selectedUserIds.map(id =>
        api.patch(`/api/users/${id}/`, { is_active: newStatus })
      );
      await Promise.all(promises);
      setSuccessMessage(`${selectedUserIds.length} user(s) ${newStatus ? 'activated' : 'deactivated'} successfully`);
      await loadUsers();
      setSelectedUserIds([]);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      setError('Bulk operation failed');
    }
  };

  const filtered = useMemo(() => {
    let result = rows;

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        [
          r.username,
          r.first_name,
          r.last_name,
          r.email,
          ROLE_DISPLAY_NAMES[r.role] || r.role,
          r.sector?.name,
          r.department?.name,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter((r) => r.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((r) =>
        statusFilter === 'active' ? r.is_active : !r.is_active
      );
    }

    return result;
  }, [rows, query, roleFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [filtered, page, pageSize]
  );

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-gray-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-9a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h3>
            <p className="text-gray-600">Only administrators can access User Management.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                User Management
              </h2>
              <p className="text-gray-600 text-sm">
                Manage user accounts, permissions, and access levels
              </p>
            </div>

            <button
              onClick={openCreate}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create User
            </button>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold text-gray-800">{rows.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Users</p>
                  <p className="text-2xl font-bold text-emerald-600">{rows.filter(r => r.is_active).length}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inactive Users</p>
                  <p className="text-2xl font-bold text-amber-600">{rows.filter(r => !r.is_active).length}</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Admins</p>
                  <p className="text-2xl font-bold text-purple-600">{rows.filter(r => r.role === 'EXECUTIVE').length}</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* FILTERS BAR */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search users by name, email, role..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 pl-12 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-3 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[180px]"
                >
                  <option value="all">All Roles</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_DISPLAY_NAMES[r] || r}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-3 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[160px]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                {selectedUserIds.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => bulkToggleStatus(true)}
                      className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Activate Selected
                    </button>
                    <button
                      onClick={() => bulkToggleStatus(false)}
                      className="px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Deactivate Selected
                    </button>
                    <button
                      onClick={() => setSelectedUserIds([])}
                      className="px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                    >
                      Clear ({selectedUserIds.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-600 hover:text-emerald-800">
              ✕
            </button>
          </div>
        )}

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={paged.length > 0 && selectedUserIds.length === paged.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  {[
                    'User',
                    'Role',
                    'Sector & Department',
                    'Status',
                    'Last Active',
                    'Actions',
                  ].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : paged.length > 0 ? (
                  paged.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(r.id)}
                          onChange={() => toggleSelectUser(r.id)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                            <span className="font-semibold text-emerald-800">
                              {r.first_name?.[0] || r.username[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{r.username}</div>
                            <div className="text-sm text-gray-500">
                              {[r.first_name, r.last_name].filter(Boolean).join(' ') || 'No name'}
                            </div>
                            <div className="text-sm text-gray-500">{r.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {ROLE_DISPLAY_NAMES[r.role] || r.role}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{r.sector?.name || '—'}</div>
                          <div className="text-sm text-gray-500">{r.department?.name || '—'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${r.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                          <span className={`font-medium ${r.is_active ? 'text-emerald-700' : 'text-gray-700'}`}>
                            {r.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {/* You would add last active timestamp here from your API */}
                        Recently
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => toggleUserStatus(r, !r.is_active)}
                            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
                              r.is_active 
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {r.is_active ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              )}
                            </svg>
                            {r.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => remove(r)}
                            className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-lg font-medium mb-2">No users found</p>
                        <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
                        <button
                          onClick={openCreate}
                          className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          Create Your First User
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 p-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
            ) : paged.length > 0 ? (
              paged.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(r.id)}
                        onChange={() => toggleSelectUser(r.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="w-12 h-12 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                        <span className="font-semibold text-emerald-800">
                          {r.first_name?.[0] || r.username[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{r.username}</div>
                        <div className="text-sm text-gray-500">{r.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => remove(r)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-gray-500">Name</div>
                      <div className="font-medium">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Role</div>
                      <div className="font-medium">{ROLE_DISPLAY_NAMES[r.role] || r.role}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Sector</div>
                      <div className="font-medium">{r.sector?.name || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Department</div>
                      <div className="font-medium">{r.department?.name || '—'}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${r.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                      <span className={`font-medium ${r.is_active ? 'text-emerald-700' : 'text-gray-700'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleUserStatus(r, !r.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        r.is_active 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {r.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No users found</p>
                  <button
                    onClick={openCreate}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors w-full"
                  >
                    Create User
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PAGINATION */}
        {filtered.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-semibold">{filtered.length}</span> users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                  page === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300' 
                    : 'bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                        page === pageNum
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                  page === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                    : 'bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400'
                }`}
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editing ? 'Edit User' : 'Create New User'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {editing ? 'Update user details and permissions' : 'Add a new user to the system'}
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { label: 'Username', key: 'username', required: true },
                    { label: 'Email Address', key: 'email', type: 'email', required: true },
                    { label: 'First Name', key: 'first_name' },
                    { label: 'Last Name', key: 'last_name' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        {f.label}
                        {f.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type={f.type || 'text'}
                        value={(form as any)[f.key]}
                        onChange={(e) =>
                          setForm({ ...form, [f.key]: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        placeholder={`Enter ${f.label.toLowerCase()}`}
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_DISPLAY_NAMES[r] || r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="relative">
                      <input
                        id="active"
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) =>
                          setForm({ ...form, is_active: e.target.checked })
                        }
                        className="sr-only"
                      />
                      <label
                        htmlFor="active"
                        className={`block w-14 h-8 rounded-full cursor-pointer transition-colors ${
                          form.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`block w-6 h-6 mt-1 ml-1 rounded-full bg-white shadow transform transition-transform ${
                          form.is_active ? 'translate-x-7' : ''
                        }`}></span>
                      </label>
                    </div>
                    <div>
                      <label htmlFor="active" className="font-medium text-gray-700 cursor-pointer">
                        Active Account
                      </label>
                      <p className="text-sm text-gray-500">User can log in to the system</p>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Sector
                    </label>
                    <select
                      value={form.sector_id}
                      onChange={(e) =>
                        onSectorChange(
                          e.target.value ? Number(e.target.value) : ''
                        )
                      }
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select Sector</option>
                      {sectors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
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
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                      disabled={!form.sector_id}
                    >
                      <option value="">{form.sector_id ? 'Select Department' : 'Select sector first'}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Password {!editing && <span className="text-red-500">*</span>}
                      {editing && (
                        <span className="text-gray-500 font-normal ml-2">
                          (leave blank to keep current password)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-12"
                        placeholder={editing ? "Enter new password" : "Enter password"}
                        required={!editing}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showPassword ? (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Password must be at least 8 characters with letters and numbers
                    </p>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow hover:shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editing ? 'Update User' : 'Create User'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}