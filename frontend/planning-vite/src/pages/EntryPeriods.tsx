import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type WindowRow = {
  id: number;
  window_type: 'BREAKDOWN' | 'PERFORMANCE_Q1' | 'PERFORMANCE_Q2' | 'PERFORMANCE_Q3' | 'PERFORMANCE_Q4';
  year: number | null;
  always_open: boolean;
  start: string | null;
  end: string | null;
  active: boolean;
};

const TYPES: Array<WindowRow['window_type']> = [
  'BREAKDOWN',
  'PERFORMANCE_Q1',
  'PERFORMANCE_Q2',
  'PERFORMANCE_Q3',
  'PERFORMANCE_Q4',
];

export default function EntryPeriods() {
  const { user } = useAuth();
  const isSuper = !!user?.is_superuser;
  const [rows, setRows] = useState<WindowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WindowRow | null>(null);
  const [form, setForm] = useState<{ window_type: WindowRow['window_type']; year: string; always_open: boolean; start: string; end: string; active: boolean }>(
    { window_type: 'BREAKDOWN', year: '', always_open: false, start: '', end: '', active: true }
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/submission-windows/');
      setRows(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (isSuper) load(); }, [isSuper]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [r.window_type, r.year ?? '', r.start ?? '', r.end ?? '', r.active ? 'active' : 'inactive'].join(' ').toLowerCase().includes(q));
  }, [rows, query]);

  const openCreate = () => {
    setEditing(null);
    setForm({ window_type: 'BREAKDOWN', year: '', always_open: false, start: '', end: '', active: true });
    setModalOpen(true);
  };
  const openEdit = (r: WindowRow) => {
    setEditing(r);
    setForm({
      window_type: r.window_type,
      year: r.year ? String(r.year) : '',
      always_open: r.always_open,
      start: r.start ? r.start.slice(0, 16) : '',
      end: r.end ? r.end.slice(0, 16) : '',
      active: r.active,
    });
    setModalOpen(true);
  };

  const save = async () => {
    try {
      const payload: any = {
        window_type: form.window_type,
        year: form.year ? Number(form.year) : null,
        always_open: form.always_open,
        start: form.start ? new Date(form.start).toISOString() : null,
        end: form.end ? new Date(form.end).toISOString() : null,
        active: form.active,
      };
      if (editing) {
        await api.put(`/api/submission-windows/${editing.id}/`, payload);
      } else {
        await api.post('/api/submission-windows/', payload);
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save failed');
    }
  };

  const remove = async (r: WindowRow) => {
    if (!confirm('Delete this entry period window?')) return;
    try {
      await api.delete(`/api/submission-windows/${r.id}/`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Delete failed');
    }
  };

  if (!isSuper) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-sm text-gray-600">Only Django superuser can manage entry periods.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Entry Periods</h2>
          <div className="flex items-center gap-2">
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search..." className="w-44 border rounded px-3 py-2 focus:outline-none focus:ring" />
            <button onClick={openCreate} className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">New Window</button>
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
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Year</th>
                  <th className="px-4 py-2">Always Open</th>
                  <th className="px-4 py-2">Start</th>
                  <th className="px-4 py-2">End</th>
                  <th className="px-4 py-2">Active</th>
                  <th className="px-4 py-2 w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r)=> (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3">{r.window_type}</td>
                    <td className="px-4 py-3">{r.year ?? 'ALL'}</td>
                    <td className="px-4 py-3">{r.always_open ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{r.start ? new Date(r.start).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">{r.end ? new Date(r.end).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">{r.active ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <button onClick={()=>openEdit(r)} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Edit</button>
                      <button onClick={()=>remove(r)} className="ml-2 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td className="px-4 py-3" colSpan={7}>No submission windows.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-xl bg-white rounded-lg shadow-lg">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div className="font-semibold">{editing ? 'Edit Window' : 'New Window'}</div>
                <button onClick={()=>setModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Type</label>
                  <select value={form.window_type} onChange={(e)=>setForm({...form, window_type: e.target.value as any})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Year (optional)</label>
                  <input type="number" value={form.year} onChange={(e)=>setForm({...form, year: e.target.value})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" placeholder="e.g. 2025 or blank" />
                </div>
                <div className="flex items-center gap-2">
                  <input id="always" type="checkbox" checked={form.always_open} onChange={(e)=>setForm({...form, always_open: e.target.checked})} />
                  <label htmlFor="always" className="text-sm text-gray-700">Always Open</label>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Start (ISO local)</label>
                  <input type="datetime-local" value={form.start} onChange={(e)=>setForm({...form, start: e.target.value})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">End (ISO local)</label>
                  <input type="datetime-local" value={form.end} onChange={(e)=>setForm({...form, end: e.target.value})} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
                </div>
                <div className="flex items-center gap-2">
                  <input id="active" type="checkbox" checked={form.active} onChange={(e)=>setForm({...form, active: e.target.checked})} />
                  <label htmlFor="active" className="text-sm text-gray-700">Active</label>
                </div>
                <div className="md:col-span-2 text-xs text-gray-500">
                  Note: DB windows override default windows. Leave Year blank to apply to all years.
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
