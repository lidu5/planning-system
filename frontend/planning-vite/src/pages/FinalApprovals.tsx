import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

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

type Breakdown = {
  id: number;
  plan: number;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  q4: string | null;
  status: string;
};

type Performance = {
  id: number;
  plan: number;
  quarter: number;
  value: string;
  status: string;
};

export default function FinalApprovals() {
  const { user } = useAuth();
  const [year, setYear] = useState<number | null>(null);
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [perfs, setPerfs] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!year) {
        setPlans([]);
        setBreakdowns([]);
        setPerfs([]);
        return;
      }
      const [plansRes, bRes, pRes] = await Promise.all([
        api.get('/api/annual-plans/', { params: { year } }),
        api.get('/api/breakdowns/'),
        api.get('/api/performances/'),
      ]);
      setPlans(plansRes.data || []);
      setBreakdowns((bRes.data || []) as Breakdown[]);
      setPerfs((pRes.data || []) as Performance[]);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [year]);

  useEffect(() => {
    // Reset department when sector changes
    setSelectedDepartmentId(null);
  }, [selectedSectorId]);

  const planById = useMemo(() => {
    const map: Record<number, AnnualPlan> = {};
    for (const p of plans) map[p.id] = p;
    return map;
  }, [plans]);

  const sectorOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of plans) {
      if (typeof p.sector_id === 'number' && p.sector_name) {
        map.set(p.sector_id, p.sector_name);
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [plans]);

  const departmentOptions = useMemo(() => {
    const map = new Map<number, { name: string; sector_id?: number }>();
    for (const p of plans) {
      if (typeof p.department_id === 'number' && p.department_name) {
        if (!map.has(p.department_id)) map.set(p.department_id, { name: p.department_name, sector_id: p.sector_id });
      }
    }
    let arr = Array.from(map, ([id, v]) => ({ id, name: v.name, sector_id: v.sector_id }));
    if (selectedSectorId) arr = arr.filter((d) => d.sector_id === selectedSectorId);
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  }, [plans, selectedSectorId]);

  const validatedBreakdowns = useMemo(() => {
    const list = breakdowns.filter(b => planById[b.plan]);
    let arr = list.filter(b => (b.status || '').toUpperCase() === 'VALIDATED');
    if (selectedSectorId) {
      arr = arr.filter(b => planById[b.plan]?.sector_id === selectedSectorId);
    }
    if (selectedDepartmentId) {
      arr = arr.filter(b => planById[b.plan]?.department_id === selectedDepartmentId);
    }
    if (!query.trim()) return arr;
    const q = query.toLowerCase();
    return arr.filter(b => {
      const p = planById[b.plan];
      const txt = [p.indicator_name, p.department_name, p.sector_name, p.indicator_unit].join(' ').toLowerCase();
      return txt.includes(q);
    });
  }, [breakdowns, planById, query, selectedSectorId, selectedDepartmentId]);

  const validatedPerfs = useMemo(() => {
    const list = perfs.filter(pr => planById[pr.plan]);
    let arr = list.filter(pr => (pr.status || '').toUpperCase() === 'VALIDATED');
    if (selectedSectorId) {
      arr = arr.filter(pr => planById[pr.plan]?.sector_id === selectedSectorId);
    }
    if (selectedDepartmentId) {
      arr = arr.filter(pr => planById[pr.plan]?.department_id === selectedDepartmentId);
    }
    if (!query.trim()) return arr;
    const q = query.toLowerCase();
    return arr.filter(pr => {
      const p = planById[pr.plan];
      const txt = [p.indicator_name, p.department_name, p.sector_name, p.indicator_unit].join(' ').toLowerCase();
      return txt.includes(q);
    });
  }, [perfs, planById, query, selectedSectorId, selectedDepartmentId]);

  const finalApproveBreakdown = async (b: Breakdown) => {
    try {
      await api.post(`/api/breakdowns/${b.id}/final_approve/`);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Final approve failed');
    }
  };
  const rejectBreakdown = async (b: Breakdown) => {
    const comment = window.prompt('Rejection note (optional):', '') || '';
    try {
      await api.post(`/api/breakdowns/${b.id}/reject/`, { comment });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Reject failed');
    }
  };

  const finalApprovePerf = async (pr: Performance) => {
    try {
      await api.post(`/api/performances/${pr.id}/final_approve/`);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Final approve failed');
    }
  };
  const rejectPerf = async (pr: Performance) => {
    const comment = window.prompt('Rejection note (optional):', '') || '';
    try {
      await api.post(`/api/performances/${pr.id}/reject/`, { comment });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Reject failed');
    }
  };

  const isExecutive = (user?.role || '').toUpperCase() === 'EXECUTIVE';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Executive — Final Approvals</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Year</label>
              <input type="number" min={2000} max={2100} value={year ?? ''} onChange={(e)=>setYear(e.target.value ? Number(e.target.value) : null)} className="w-28 border rounded px-3 py-2 focus:outline-none focus:ring" />
            </div>
            <select
              value={selectedSectorId ?? ''}
              onChange={(e)=> setSelectedSectorId(e.target.value ? Number(e.target.value) : null)}
              className="border rounded px-3 py-2 focus:outline-none focus:ring"
            >
              <option value="">All sectors</option>
              {sectorOptions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={selectedDepartmentId ?? ''}
              onChange={(e)=> setSelectedDepartmentId(e.target.value ? Number(e.target.value) : null)}
              className="border rounded px-3 py-2 focus:outline-none focus:ring"
            >
              <option value="">All departments</option>
              {departmentOptions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search..." className="w-44 border rounded px-3 py-2 focus:outline-none focus:ring" />
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Breakdowns to final approve */}
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 font-medium">Quarterly Breakdowns (Validated)</div>
            {loading ? (
              <div className="p-4 text-sm">Loading...</div>
            ) : validatedBreakdowns.length === 0 ? (
              <div className="p-4 text-sm">No validated breakdowns.</div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-2">Indicator</th>
                    <th className="px-4 py-2">Target</th>
                    <th className="px-4 py-2">Q1</th>
                    <th className="px-4 py-2">Q2</th>
                    <th className="px-4 py-2">Q3</th>
                    <th className="px-4 py-2">Q4</th>
                    <th className="px-4 py-2 w-44">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {validatedBreakdowns.map((b) => {
                    const p = planById[b.plan];
                    return (
                      <tr key={b.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium">{p?.indicator_name}</div>
                          <div className="text-xs text-gray-500">{p?.department_name} • {p?.sector_name}</div>
                        </td>
                        <td className="px-4 py-3">{p?.target || '0'}</td>
                        <td className="px-4 py-3">{b.q1 ?? ''}</td>
                        <td className="px-4 py-3">{b.q2 ?? ''}</td>
                        <td className="px-4 py-3">{b.q3 ?? ''}</td>
                        <td className="px-4 py-3">{b.q4 ?? ''}</td>
                        <td className="px-4 py-3">
                          <button disabled={!isExecutive} onClick={()=>finalApproveBreakdown(b)} className={`px-3 py-1 rounded ${isExecutive? 'bg-emerald-600 hover:bg-emerald-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Final Approve</button>
                          <button disabled={!isExecutive} onClick={()=>rejectBreakdown(b)} className={`ml-2 px-3 py-1 rounded ${isExecutive? 'bg-red-600 hover:bg-red-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Reject</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Performances to final approve */}
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 font-medium">Quarterly Performance (Validated)</div>
            {loading ? (
              <div className="p-4 text-sm">Loading...</div>
            ) : validatedPerfs.length === 0 ? (
              <div className="p-4 text-sm">No validated performances.</div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-2">Indicator</th>
                    <th className="px-4 py-2">Quarter</th>
                    <th className="px-4 py-2">Value</th>
                    <th className="px-4 py-2 w-44">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {validatedPerfs.map((pr) => {
                    const p = planById[pr.plan];
                    return (
                      <tr key={pr.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium">{p?.indicator_name}</div>
                          <div className="text-xs text-gray-500">{p?.department_name} • {p?.sector_name}</div>
                        </td>
                        <td className="px-4 py-3">Q{pr.quarter}</td>
                        <td className="px-4 py-3">{pr.value}</td>
                        <td className="px-4 py-3">
                          <button disabled={!isExecutive} onClick={()=>finalApprovePerf(pr)} className={`px-3 py-1 rounded ${isExecutive? 'bg-emerald-600 hover:bg-emerald-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Final Approve</button>
                          <button disabled={!isExecutive} onClick={()=>rejectPerf(pr)} className={`ml-2 px-3 py-1 rounded ${isExecutive? 'bg-red-600 hover:bg-red-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Reject</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
