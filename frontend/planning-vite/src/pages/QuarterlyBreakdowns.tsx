import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Reuse AnnualPlan shape enriched by backend
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
  quarter: number; // 1..4
  value: string;
  status: string;
};

export default function QuarterlyBreakdowns() {
  const { user } = useAuth();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(thisYear);
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [breakdowns, setBreakdowns] = useState<Record<number, Breakdown>>({});
  const [perfs, setPerfs] = useState<Record<string, Performance>>({}); // key: `${planId}-${q}`
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');

  const [planModal, setPlanModal] = useState<{ open: boolean; planId: number | null; quarter: 1|2|3|4 | null; value: string }>(() => ({ open: false, planId: null, quarter: null, value: '' }));
  const [perfModal, setPerfModal] = useState<{ open: boolean; planId: number | null; quarter: 1|2|3|4 | null; value: string }>(() => ({ open: false, planId: null, quarter: null, value: '' }));

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, bRes, pRes] = await Promise.all([
        api.get('/api/annual-plans/'),
        api.get('/api/breakdowns/'),
        api.get('/api/performances/'),
      ]);
      const allPlans: AnnualPlan[] = plansRes.data || [];
      const filtered = allPlans.filter((p) => p.year === year);
      setPlans(filtered);
      const map: Record<number, Breakdown> = {};
      for (const b of (bRes.data || []) as Breakdown[]) map[b.plan] = b;
      setBreakdowns(map);
      const pmap: Record<string, Performance> = {};
      for (const pr of (pRes.data || []) as Performance[]) {
        if (filtered.find((fp) => fp.id === pr.plan)) {
          pmap[`${pr.plan}-${pr.quarter}`] = pr;
        }
      }
      setPerfs(pmap);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? plans.filter((p) =>
          [p.indicator_name, p.department_name, p.sector_name, p.indicator_unit]
            .join(' ').toLowerCase().includes(q)
        )
      : plans;
    const map: Record<string, { name: string; departments: Record<string, { name: string; items: AnnualPlan[] }> }> = {};
    for (const p of filtered) {
      const sKey = String(p.sector_id ?? 'unknown');
      const dKey = String(p.department_id ?? 'unknown');
      if (!map[sKey]) map[sKey] = { name: p.sector_name || 'Unassigned Sector', departments: {} };
      if (!map[sKey].departments[dKey]) map[sKey].departments[dKey] = { name: p.department_name || 'Unassigned Department', items: [] };
      map[sKey].departments[dKey].items.push(p);
    }
    return map;
  }, [plans]);

  const toCSV = (): string => {
    const rows: string[][] = [];
    rows.push(['Sector','Department','Indicator','Unit','Year','Annual Target','Annual Performance','Q1 Plan','Q1 Perf','Q2 Plan','Q2 Perf','Q3 Plan','Q3 Perf','Q4 Plan','Q4 Perf','Plan Status','Q1 Perf Status','Q2 Perf Status','Q3 Perf Status','Q4 Perf Status']);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? plans.filter((p) => [p.indicator_name, p.department_name, p.sector_name, p.indicator_unit].join(' ').toLowerCase().includes(q))
      : plans;
    for (const p of filtered) {
      const bd = breakdowns[p.id];
      const perf = (n: 1|2|3|4) => perfs[`${p.id}-${n}`]?.value || '';
      const perfS = (n: 1|2|3|4) => perfs[`${p.id}-${n}`]?.status || '';
      rows.push([
        p.sector_name || '',
        p.department_name || '',
        p.indicator_name || '',
        p.indicator_unit || '',
        String(p.year || ''),
        String(p.target || ''),
        annualPerformance(p.id).toFixed(2),
        String(bd?.q1 || ''), perf(1), String(bd?.q2 || ''), perf(2), String(bd?.q3 || ''), perf(3), String(bd?.q4 || ''), perf(4),
        (bd?.status || ''), perfS(1), perfS(2), perfS(3), perfS(4)
      ]);
    }
    return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  };

  const copyCSV = async () => {
    const csv = toCSV();
    try { await navigator.clipboard.writeText(csv); } catch {}
  };

  const downloadCSV = () => {
    const csv = toCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quarterly_breakdowns_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateCell = (planId: number, field: 'q1'|'q2'|'q3'|'q4', value: string) => {
    setBreakdowns((prev) => {
      const cur = prev[planId] || { id: 0, plan: planId, q1: null, q2: null, q3: null, q4: null, status: 'DRAFT' };
      return { ...prev, [planId]: { ...cur, [field]: value } as Breakdown };
    });
  };

  const ensureCreate = async (planId: number) => {
    if (breakdowns[planId]?.id) return breakdowns[planId];
    const res = await api.post('/api/breakdowns/', { plan: planId, q1: '0', q2: '0', q3: '0', q4: '0' });
    const created: Breakdown = res.data;
    setBreakdowns((prev) => ({ ...prev, [planId]: created }));
    return created;
  };

  const savePlan = async (planId: number, overrides?: Partial<Pick<Breakdown,'q1'|'q2'|'q3'|'q4'>>) => {
    try {
      const bd = await ensureCreate(planId);
      const current = breakdowns[planId] || bd;
      await api.put(`/api/breakdowns/${bd.id}/`, {
        plan: planId,
        q1: (overrides && overrides.q1 !== undefined ? overrides.q1 : (current?.q1 ?? '0')),
        q2: (overrides && overrides.q2 !== undefined ? overrides.q2 : (current?.q2 ?? '0')),
        q3: (overrides && overrides.q3 !== undefined ? overrides.q3 : (current?.q3 ?? '0')),
        q4: (overrides && overrides.q4 !== undefined ? overrides.q4 : (current?.q4 ?? '0')),
        status: current.status || bd.status,
      });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save failed');
    }
  };

  const submitPlan = async (planId: number) => {
    try {
      const bd = await ensureCreate(planId);
      await api.post(`/api/breakdowns/${bd.id}/submit/`);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Submit failed');
    }
  };

  const ensurePerf = async (planId: number, quarter: 1|2|3|4) => {
    const key = `${planId}-${quarter}`;
    if (perfs[key]?.id) return perfs[key];
    const res = await api.post('/api/performances/', { plan: planId, quarter, value: '0' });
    const created: Performance = res.data;
    setPerfs((prev) => ({ ...prev, [key]: created }));
    return created;
  };

  const savePerformance = async (planId: number, quarter: 1|2|3|4, value: string) => {
    try {
      const perf = await ensurePerf(planId, quarter);
      await api.put(`/api/performances/${perf.id}/`, { plan: planId, quarter, value, status: perf.status });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save performance failed');
    }
  };

  const submitPerformance = async (planId: number, quarter: 1|2|3|4) => {
    try {
      const perf = await ensurePerf(planId, quarter);
      await api.post(`/api/performances/${perf.id}/submit/`);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Submit performance failed');
    }
  };

  const statusBadge = (status?: string) => {
    const s = (status || 'DRAFT').toUpperCase();
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      APPROVED: 'bg-emerald-100 text-emerald-700',
      VALIDATED: 'bg-purple-100 text-purple-700',
      FINAL_APPROVED: 'bg-green-200 text-green-800',
      REJECTED: 'bg-red-100 text-red-700',
    };
    const cls = styles[s] || styles.DRAFT;
    return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{s.replace('_', ' ')}</span>;
  };

  const canEditPlan = (): boolean => {
    const role = (user?.role || '').toUpperCase();
    return role === 'ADVISOR' || role === 'STATE_MINISTER';
  };

  const canEditPerformance = (planId: number): boolean => {
    const role = (user?.role || '').toUpperCase();
    if (role === 'STATE_MINISTER') return true;
    if (role !== 'ADVISOR') return false;
    const st = (breakdowns[planId]?.status || 'DRAFT').toUpperCase();
    return st === 'APPROVED' || st === 'VALIDATED' || st === 'FINAL_APPROVED';
  };

  const annualPerformance = (planId: number): number => {
    let sum = 0;
    for (let q: 1|2|3|4 = 1; q <= 4; q = (q + 1) as 1|2|3|4) {
      const key = `${planId}-${q}`;
      const v = parseFloat(perfs[key]?.value || '0');
      if (!isNaN(v)) sum += v;
    }
    return sum;
  };

  const planTotal = (bd?: Breakdown): number => {
    if (!bd) return 0;
    const v = ['q1','q2','q3','q4'].map((k) => parseFloat((bd as any)[k] || '0'));
    return v.reduce((a,b)=>a + (isNaN(b) ? 0 : b), 0);
  };

  const planMismatch = (p: AnnualPlan): boolean => {
    const bd = breakdowns[p.id];
    const total = planTotal(bd);
    const target = parseFloat(p.target || '0');
    return Math.abs(total - (isNaN(target) ? 0 : target)) > 0.0001;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-2xl font-semibold">Quarterly Breakdowns</h2>
          <div className="flex items-center gap-2">
            <button onClick={copyCSV} className="px-3 py-2 border rounded bg-white hover:bg-gray-50">Copy</button>
            <button onClick={downloadCSV} className="px-3 py-2 border rounded bg-white hover:bg-gray-50">CSV</button>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search..." className="w-44 border rounded px-3 py-2 focus:outline-none focus:ring" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Year</label>
              <input type="number" min={2000} max={2100} value={year} onChange={(e)=>setYear(Number(e.target.value))} className="w-28 border rounded px-3 py-2 focus:outline-none focus:ring" />
            </div>
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="overflow-x-auto bg-white border rounded shadow-sm">
          {loading ? (
            <div className="p-6 text-sm">Loading...</div>
          ) : plans.length === 0 ? (
            <div className="p-6 text-sm">No annual plans for {year}.</div>
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
                            <th className="px-4 py-2">Annual Target</th>
                            <th className="px-4 py-2">Annual Performance</th>
                            <th className="px-4 py-2">Q1</th>
                            <th className="px-4 py-2">Q2</th>
                            <th className="px-4 py-2">Q3</th>
                            <th className="px-4 py-2">Q4</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2 w-44">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dVal.items.map((p) => {
                            const bd = breakdowns[p.id];
                            const perfQ = (q: 1|2|3|4) => perfs[`${p.id}-${q}`]?.value ?? '';
                            const planQ = (q: 1|2|3|4) => (bd ? (bd[`q${q}` as const] as string | null) : null) ?? '';
                            return (
                              <tr key={p.id} className="border-t">
                                <td className="px-4 py-3">{p.indicator_name}</td>
                                <td className="px-4 py-3 text-gray-500">{p.indicator_unit || '-'}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-block min-w-[80px] text-center px-2 py-1 rounded ${planMismatch(p) ? 'bg-amber-600' : 'bg-emerald-600'} text-white`}>{p.target || '0'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-block min-w-[80px] text-center px-2 py-1 rounded bg-blue-600 text-white">{annualPerformance(p.id).toFixed(2)}</span>
                                </td>
                                {[1,2,3,4].map((q) => (
                                  <td key={q} className="px-4 py-3">
                                    <div className="flex flex-col gap-1">
                                      <button
                                        disabled={!canEditPlan()}
                                        className={`inline-block min-w-[80px] text-center px-2 py-1 rounded ${canEditPlan() ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                                        onClick={() => canEditPlan() && setPlanModal({ open: true, planId: p.id, quarter: q as 1|2|3|4, value: String(planQ(q as 1|2|3|4) || '') })}
                                      >{planQ(q as 1|2|3|4) || 'N/A'}</button>
                                      <button
                                        disabled={!canEditPerformance(p.id)}
                                        className={`inline-block min-w-[80px] text-center px-2 py-1 rounded ${canEditPerformance(p.id) ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                                        onClick={() => setPerfModal({ open: true, planId: p.id, quarter: q as 1|2|3|4, value: String(perfQ(q as 1|2|3|4) || '') })}
                                      >{perfQ(q as 1|2|3|4) || 'None'}</button>
                                      {perfs[`${p.id}-${q}`]?.status && (
                                        <div className="text-[10px]">
                                          {statusBadge(perfs[`${p.id}-${q}`]?.status)}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                ))}
                                <td className="px-4 py-3">{statusBadge(bd?.status)}</td>
                                <td className="px-4 py-3">
                                  <button disabled={!canEditPlan()} onClick={() => canEditPlan() && savePlan(p.id)} className={`px-3 py-1 rounded ${canEditPlan() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Save</button>
                                  <button disabled={!canEditPlan()} onClick={() => canEditPlan() && submitPlan(p.id)} className={`ml-2 px-3 py-1 rounded ${canEditPlan() ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Submit</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {planModal.open && planModal.planId && planModal.quarter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div className="font-semibold">Edit Quarter Plan (Q{planModal.quarter})</div>
                <button onClick={() => setPlanModal({ open: false, planId: null, quarter: null, value: '' })} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <label className="block text-sm text-gray-700 mb-1">Value</label>
                <input type="number" step="0.01" value={planModal.value} onChange={(e)=>setPlanModal((m)=>({ ...m, value: e.target.value }))} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2">
                <button onClick={()=>setPlanModal({ open: false, planId: null, quarter: null, value: '' })} className="px-4 py-2 rounded border">Cancel</button>
                <button onClick={()=>{ if (planModal.planId && planModal.quarter){ const key = `q${planModal.quarter}` as 'q1'|'q2'|'q3'|'q4'; updateCell(planModal.planId, key, planModal.value); savePlan(planModal.planId, { [key]: planModal.value } as any);} setPlanModal({ open: false, planId: null, quarter: null, value: '' }); }} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Save</button>
              </div>
            </div>
          </div>
        )}

        {perfModal.open && perfModal.planId && perfModal.quarter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div className="font-semibold">Edit Quarter Performance (Q{perfModal.quarter})</div>
                <button onClick={() => setPerfModal({ open: false, planId: null, quarter: null, value: '' })} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-5 space-y-4">
                {!canEditPerformance(perfModal.planId) && (
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    Advisors can enter performance only after the quarterly plan is approved.
                  </div>
                )}
                <label className="block text-sm text-gray-700 mb-1">Value</label>
                <input disabled={!canEditPerformance(perfModal.planId)} type="number" step="0.01" value={perfModal.value} onChange={(e)=>setPerfModal((m)=>({ ...m, value: e.target.value }))} className="w-full border rounded px-3 py-2 focus:outline-none focus:ring disabled:bg-gray-100" />
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2">
                <button onClick={()=>setPerfModal({ open: false, planId: null, quarter: null, value: '' })} className="px-4 py-2 rounded border">Close</button>
                <button disabled={!canEditPerformance(perfModal.planId)} onClick={()=>{ if (perfModal.planId && perfModal.quarter){ savePerformance(perfModal.planId, perfModal.quarter, perfModal.value);} setPerfModal({ open: false, planId: null, quarter: null, value: '' }); }} className={`px-4 py-2 rounded ${canEditPerformance(perfModal.planId) ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Save</button>
                <button disabled={!canEditPerformance(perfModal.planId)} onClick={()=>{ if (perfModal.planId && perfModal.quarter){ submitPerformance(perfModal.planId, perfModal.quarter);} setPerfModal({ open: false, planId: null, quarter: null, value: '' }); }} className={`px-4 py-2 rounded ${canEditPerformance(perfModal.planId) ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
