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

export default function Reviews() {
  const { user } = useAuth();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [perfs, setPerfs] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
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

  const planById = useMemo(() => {
    const map: Record<number, AnnualPlan> = {};
    for (const p of plans) map[p.id] = p;
    return map;
  }, [plans]);

  const filteredBreakdowns = useMemo(() => {
    const list = breakdowns.filter(b => planById[b.plan]);
    const onlySubmitted = list.filter(b => (b.status || '').toUpperCase() === 'SUBMITTED');
    if (!query.trim()) return onlySubmitted;
    const q = query.toLowerCase();
    return onlySubmitted.filter(b => {
      const p = planById[b.plan];
      const txt = [p.indicator_name, p.department_name, p.sector_name, p.indicator_unit].join(' ').toLowerCase();
      return txt.includes(q);
    });
  }, [breakdowns, planById, query]);

  const filteredPerfs = useMemo(() => {
    const list = perfs.filter(pr => planById[pr.plan]);
    const onlySubmitted = list.filter(pr => (pr.status || '').toUpperCase() === 'SUBMITTED');
    if (!query.trim()) return onlySubmitted;
    const q = query.toLowerCase();
    return onlySubmitted.filter(pr => {
      const p = planById[pr.plan];
      const txt = [p.indicator_name, p.department_name, p.sector_name, p.indicator_unit].join(' ').toLowerCase();
      return txt.includes(q);
    });
  }, [perfs, planById, query]);

  const approveBreakdown = async (b: Breakdown) => {
    try {
      await api.post(`/api/breakdowns/${b.id}/approve/`);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Approve failed');
    }
  };
  const rejectBreakdown = async (b: Breakdown) => {
    const comment = window.prompt('Optional comment for rejection:', '') || '';
    try {
      await api.post(`/api/breakdowns/${b.id}/reject/`, { comment });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Reject failed');
    }
  };

  const approvePerf = async (pr: Performance) => {
    try {
      await api.post(`/api/performances/${pr.id}/approve/`);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Approve failed');
    }
  };
  const rejectPerf = async (pr: Performance) => {
    const comment = window.prompt('Optional comment for rejection:', '') || '';
    try {
      await api.post(`/api/performances/${pr.id}/reject/`, { comment });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Reject failed');
    }
  };

  const isMinister = (user?.role || '').toUpperCase() === 'STATE_MINISTER';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Reviews & Approvals</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Year</label>
              <input type="number" min={2000} max={2100} value={year} onChange={(e)=>setYear(Number(e.target.value))} className="w-28 border rounded px-3 py-2 focus:outline-none focus:ring" />
            </div>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search..." className="w-44 border rounded px-3 py-2 focus:outline-none focus:ring" />
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Breakdowns to review */}
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 font-medium">Quarterly Breakdowns (Submitted)</div>
            {loading ? (
              <div className="p-4 text-sm">Loading...</div>
            ) : filteredBreakdowns.length === 0 ? (
              <div className="p-4 text-sm">No submitted breakdowns.</div>
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
                    <th className="px-4 py-2 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBreakdowns.map((b) => {
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
                          <button disabled={!isMinister} onClick={()=>approveBreakdown(b)} className={`px-3 py-1 rounded ${isMinister? 'bg-emerald-600 hover:bg-emerald-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Approve</button>
                          <button disabled={!isMinister} onClick={()=>rejectBreakdown(b)} className={`ml-2 px-3 py-1 rounded ${isMinister? 'bg-red-600 hover:bg-red-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Reject</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Performances to review */}
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 font-medium">Quarterly Performance (Submitted)</div>
            {loading ? (
              <div className="p-4 text-sm">Loading...</div>
            ) : filteredPerfs.length === 0 ? (
              <div className="p-4 text-sm">No submitted performances.</div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-2">Indicator</th>
                    <th className="px-4 py-2">Quarter</th>
                    <th className="px-4 py-2">Value</th>
                    <th className="px-4 py-2 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPerfs.map((pr) => {
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
                          <button disabled={!isMinister} onClick={()=>approvePerf(pr)} className={`px-3 py-1 rounded ${isMinister? 'bg-emerald-600 hover:bg-emerald-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Approve</button>
                          <button disabled={!isMinister} onClick={()=>rejectPerf(pr)} className={`ml-2 px-3 py-1 rounded ${isMinister? 'bg-red-600 hover:bg-red-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Reject</button>
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
