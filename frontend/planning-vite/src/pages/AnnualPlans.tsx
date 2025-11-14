import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Sector = { id: number; name: string };
type Department = { id: number; name: string; sector: Sector };
type Indicator = { id: number; name: string; department?: Department };
type AnnualPlan = {
  id: number;
  year: number;
  indicator: number;
  indicator_name: string;
  indicator_unit?: string;
  department_id?: number;
  department_name?: string;
  sector_id?: number;
  sector_name?: string;
  target: string;
};

export default function AnnualPlans() {
  const { user } = useAuth();
  const isSuperuser = !!user?.is_superuser;
  const thisYear = new Date().getFullYear();
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  const [year, setYear] = useState<number>(thisYear);
  const [sectorId, setSectorId] = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [indicatorId, setIndicatorId] = useState<number | ''>('');
  const [target, setTarget] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AnnualPlan | null>(null);
  const [editYear, setEditYear] = useState<number>(thisYear);
  const [editTarget, setEditTarget] = useState<string>('');

  const isAdvisorOrMinister = useMemo(() => {
    const r = (user?.role || '').toUpperCase();
    return r === 'ADVISOR' || r === 'STATE_MINISTER';
  }, [user?.role]);

  const loadPlans = async () => {
    const res = await api.get('/api/annual-plans/');
    setPlans(res.data);
  };

  const loadSectors = async () => {
    const res = await api.get('/api/sectors/');
    setSectors(res.data);
  };

  const loadDepartments = async (sid: number) => {
    const res = await api.get('/api/departments/', { params: { sector: sid } });
    setDepartments(res.data);
  };

  const loadIndicators = async (did: number) => {
    const res = await api.get('/api/indicators/', { params: { department: did } });
    setIndicators(res.data);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadPlans();
        await loadSectors();
        // Auto-preselect based on user
        if (user?.sector) {
          setSectorId(user.sector as unknown as number);
          await loadDepartments(Number(user.sector));
        }
        if (user?.department) {
          setDepartmentId(user.department as unknown as number);
          await loadIndicators(Number(user.department));
        }
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.sector, user?.department]);

  // When sector changes manually
  useEffect(() => {
    (async () => {
      if (sectorId) {
        setDepartmentId('');
        setIndicatorId('');
        setIndicators([]);
        await loadDepartments(Number(sectorId));
      }
    })();
  }, [sectorId]);

  // When department changes
  useEffect(() => {
    (async () => {
      if (departmentId) {
        setIndicatorId('');
        await loadIndicators(Number(departmentId));
      }
    })();
  }, [departmentId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (!indicatorId) return setError('Please select an indicator');
      const payload = { year, indicator: indicatorId, target: target || '0' } as any;
      await api.post('/api/annual-plans/', payload);
      setIndicatorId('');
      setTarget('');
      await loadPlans();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save failed');
    }
  };

  const onDelete = async (plan: AnnualPlan) => {
    if (!confirm(`Delete plan for ${plan.indicator_name} (${plan.year})?`)) return;
    try {
      await api.delete(`/api/annual-plans/${plan.id}/`);
      await loadPlans();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Delete failed');
    }
  };

  const openEdit = (p: AnnualPlan) => {
    setEditing(p);
    setEditYear(p.year);
    setEditTarget(String(p.target ?? ''));
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await api.put(`/api/annual-plans/${editing.id}/`, {
        year: editYear,
        indicator: editing.indicator,
        target: editTarget || '0',
      });
      setEditOpen(false);
      setEditing(null);
      await loadPlans();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Update failed');
    }
  };

  const grouped = useMemo(() => {
    const map: Record<string, { name: string; departments: Record<string, { name: string; items: AnnualPlan[] }> }> = {};
    for (const p of plans) {
      const sKey = String(p.sector_id ?? 'unknown');
      const dKey = String(p.department_id ?? 'unknown');
      if (!map[sKey]) map[sKey] = { name: p.sector_name || 'Unassigned Sector', departments: {} };
      if (!map[sKey].departments[dKey]) map[sKey].departments[dKey] = { name: p.department_name || 'Unassigned Department', items: [] };
      map[sKey].departments[dKey].items.push(p);
    }
    return map;
  }, [plans]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Annual Plans</h2>
          {isSuperuser && <div className="text-sm text-gray-500">Click a row to edit</div>}
        </div>

        {isSuperuser && (
          <form onSubmit={onSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                min={2000}
                max={2100}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Sector</label>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                disabled={!!user?.sector && isAdvisorOrMinister}
                required
              >
                <option value="">Select sector</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                disabled={!!user?.department && isAdvisorOrMinister}
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Indicator</label>
              <select
                value={indicatorId}
                onChange={(e) => setIndicatorId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                required
              >
                <option value="">Select indicator</option>
                {indicators.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Target</label>
              <input
                type="number"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                placeholder="e.g., 8000"
                required
              />
            </div>
            <div className="md:col-span-5 flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
            </div>
          </form>
        )}

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="overflow-x-auto bg-white border rounded shadow-sm">
          {loading ? (
            <div className="p-6 text-sm">Loading...</div>
          ) : plans.length === 0 ? (
            <div className="p-6 text-sm">No plans yet.</div>
          ) : (
            <div>
              {Object.entries(grouped).map(([sKey, sVal]) => (
                <div key={sKey}>
                  <div className="px-4 py-3 bg-emerald-700 text-white font-semibold">{sVal.name}</div>
                  {Object.entries(sVal.departments).map(([dKey, dVal]) => (
                    <div key={dKey}>
                      <div className="px-4 py-2 bg-emerald-200 text-emerald-900 font-medium border-t">{dVal.name}</div>
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            <th className="px-4 py-2">Indicator</th>
                            <th className="px-4 py-2">Unit</th>
                            <th className="px-4 py-2">Year</th>
                            <th className="px-4 py-2">Target</th>
                            <th className="px-4 py-2 w-32">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dVal.items.map((p) => (
                            <tr key={p.id} className={`border-t ${isSuperuser ? 'hover:bg-emerald-50 cursor-pointer' : ''}`} onClick={() => { if (isSuperuser) openEdit(p) }}>
                              <td className="px-4 py-3">{p.indicator_name}</td>
                              <td className="px-4 py-3 text-gray-500">{p.indicator_unit || '-'}</td>
                              <td className="px-4 py-3">{p.year}</td>
                              <td className="px-4 py-3">{p.target}</td>
                              {isSuperuser && (
                                <td className="px-4 py-3">
                                  <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">Edit</button>
                                  <button onClick={(e) => { e.stopPropagation(); onDelete(p); }} className="ml-2 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {editOpen && editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg bg-white rounded-lg shadow-lg">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div className="font-semibold">Edit Plan</div>
                <button onClick={() => setEditOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Indicator</div>
                  <div className="font-medium">{editing.indicator_name}</div>
                  <div className="text-xs text-gray-500">{editing.sector_name} • {editing.department_name}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Year</label>
                    <input type="number" min={2000} max={2100} value={editYear} onChange={(e)=>setEditYear(Number(e.target.value))} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Target</label>
                    <input type="number" step="0.01" value={editTarget} onChange={(e)=>setEditTarget(e.target.value)} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2">
                <button onClick={()=>setEditOpen(false)} className="px-4 py-2 rounded border">Cancel</button>
                <button onClick={saveEdit} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
