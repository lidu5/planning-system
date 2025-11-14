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

export default function Validations() {
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

  const approvedBreakdowns = useMemo(() => {
    const list = breakdowns.filter(b => planById[b.plan]);
    const onlyApproved = list.filter(b => (b.status || '').toUpperCase() === 'APPROVED');
    if (!query.trim()) return onlyApproved;
    const q = query.toLowerCase();
    return onlyApproved.filter(b => {
      const p = planById[b.plan];
      const txt = [p.indicator_name, p.department_name, p.sector_name, p.indicator_unit].join(' ').toLowerCase();
      return txt.includes(q);
    });
  }, [breakdowns, planById, query]);

  const approvedPerfs = useMemo(() => {
    const list = perfs.filter(pr => planById[pr.plan]);
    const onlyApproved = list.filter(pr => (pr.status || '').toUpperCase() === 'APPROVED');
    if (!query.trim()) return onlyApproved;
    const q = query.toLowerCase();
    return onlyApproved.filter(pr => {
      const p = planById[pr.plan];
      const txt = [p.indicator_name, p.department_name, p.sector_name, p.indicator_unit].join(' ').toLowerCase();
      return txt.includes(q);
    });
  }, [perfs, planById, query]);

  const validateBreakdown = async (b: Breakdown) => {
    try {
      await api.post(`/api/breakdowns/${b.id}/validate/`);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Validate failed');
    }
  };
  const rejectBreakdown = async (b: Breakdown) => {
    const comment = window.prompt('Rejection note (required):', '') || '';
    try {
      await api.post(`/api/breakdowns/${b.id}/reject/`, { comment });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Reject failed');
    }
  };

  const validatePerf = async (pr: Performance) => {
    try {
      await api.post(`/api/performances/${pr.id}/validate/`);
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Validate failed');
    }
  };
  const rejectPerf = async (pr: Performance) => {
    const comment = window.prompt('Rejection note (required):', '') || '';
    try {
      await api.post(`/api/performances/${pr.id}/reject/`, { comment });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Reject failed');
    }
  };

  const isStrategic = (user?.role || '').toUpperCase() === 'STRATEGIC_STAFF';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Strategic Affairs — Validations</h2>
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
          {/* Breakdowns to validate */}
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 font-medium">Quarterly Breakdowns (Approved)</div>
            {loading ? (
              <div className="p-4 text-sm">Loading...</div>
            ) : approvedBreakdowns.length === 0 ? (
              <div className="p-4 text-sm">No approved breakdowns.</div>
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
                  {approvedBreakdowns.map((b) => {
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
                          <button disabled={!isStrategic} onClick={()=>validateBreakdown(b)} className={`px-3 py-1 rounded ${isStrategic? 'bg-blue-600 hover:bg-blue-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Validate</button>
                          <button disabled={!isStrategic} onClick={()=>rejectBreakdown(b)} className={`ml-2 px-3 py-1 rounded ${isStrategic? 'bg-red-600 hover:bg-red-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Reject</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Performances to validate */}
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 font-medium">Quarterly Performance (Approved)</div>
            {loading ? (
              <div className="p-4 text-sm">Loading...</div>
            ) : approvedPerfs.length === 0 ? (
              <div className="p-4 text-sm">No approved performances.</div>
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
                  {approvedPerfs.map((pr) => {
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
                          <button disabled={!isStrategic} onClick={()=>validatePerf(pr)} className={`px-3 py-1 rounded ${isStrategic? 'bg-blue-600 hover:bg-blue-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Validate</button>
                          <button disabled={!isStrategic} onClick={()=>rejectPerf(pr)} className={`ml-2 px-3 py-1 rounded ${isStrategic? 'bg-red-600 hover:bg-red-700 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Reject</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Optional: Annual plans overview (read-only for context) */}
        <div className="mt-8 bg-white border rounded shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-gray-100 font-medium">Annual Plans (Context)</div>
          {loading ? (
            <div className="p-4 text-sm">Loading...</div>
          ) : plans.length === 0 ? (
            <div className="p-4 text-sm">No plans for selected year.</div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2">Indicator</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Sector</th>
                  <th className="px-4 py-2">Target</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p)=> (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3">{p.indicator_name}</td>
                    <td className="px-4 py-3">{p.department_name}</td>
                    <td className="px-4 py-3">{p.sector_name}</td>
                    <td className="px-4 py-3">{p.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
