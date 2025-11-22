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
  const [year, setYear] = useState<number | null>(null);
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [perfs, setPerfs] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<number | 'ALL'>('ALL');
  const [deptFilter, setDeptFilter] = useState<number | 'ALL'>('ALL');

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
      setBreakdowns(bRes.data || []);
      setPerfs(pRes.data || []);
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

  const sectors = useMemo(() => {
    const seen: Record<number, string> = {};
    for (const p of plans) {
      if (p.sector_id) seen[p.sector_id] = p.sector_name || `Sector ${p.sector_id}`;
    }
    return Object.entries(seen)
      .map(([id, name]) => ({ id: Number(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [plans]);

  const departments = useMemo(() => {
    const seen: Record<number, string> = {};
    for (const p of plans) {
      if (p.department_id) seen[p.department_id] = p.department_name || `Dept ${p.department_id}`;
    }
    return Object.entries(seen)
      .map(([id, name]) => ({ id: Number(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [plans]);

  const approvedBreakdowns = useMemo(() => {
    const list = breakdowns.filter(b => planById[b.plan]);
    const onlyApproved = list.filter(b => (b.status || '').toUpperCase() === 'APPROVED');

    const bySector = onlyApproved.filter(b => {
      if (sectorFilter === 'ALL') return true;
      const p = planById[b.plan];
      return p?.sector_id === sectorFilter;
    });

    const byDept = bySector.filter(b => {
      if (deptFilter === 'ALL') return true;
      const p = planById[b.plan];
      return p?.department_id === deptFilter;
    });

    if (!query.trim()) return byDept;
    const q = query.toLowerCase();

    return byDept.filter(b => {
      const p = planById[b.plan];
      const txt = [p.indicator_name, p.department_name, p.sector_name, p.indicator_unit]
        .join(' ')
        .toLowerCase();
      return txt.includes(q);
    });
  }, [breakdowns, planById, query, sectorFilter, deptFilter]);

  const approvedPerfs = useMemo(() => {
    const list = perfs.filter(pr => planById[pr.plan]);
    const onlyApproved = list.filter(pr => (pr.status || '').toUpperCase() === 'APPROVED');

    const bySector = onlyApproved.filter(pr => {
      if (sectorFilter === 'ALL') return true;
      const p = planById[pr.plan];
      return p?.sector_id === sectorFilter;
    });

    const byDept = bySector.filter(pr => {
      if (deptFilter === 'ALL') return true;
      const p = planById[pr.plan];
      return p?.department_id === deptFilter;
    });

    if (!query.trim()) return byDept;
    const q = query.toLowerCase();

    return byDept.filter(pr => {
      const p = planById[pr.plan];
      const txt = [p.indicator_name, p.department_name, p.sector_name, p.indicator_unit]
        .join(' ')
        .toLowerCase();
      return txt.includes(q);
    });
  }, [perfs, planById, query, sectorFilter, deptFilter]);

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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-3xl font-bold text-gray-800">
            Strategic Affairs — Validations
          </h2>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="number"
              min={2000}
              max={2100}
              value={year ?? ''}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
              className="w-28 border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
            />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-48 border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={sectorFilter === 'ALL' ? 'ALL' : String(sectorFilter)}
              onChange={(e) => setSectorFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-52 border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Sectors</option>
              {sectors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={deptFilter === 'ALL' ? 'ALL' : String(deptFilter)}
              onChange={(e) => setDeptFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-56 border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* GRID SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* BREAKDOWNS CARD */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
              Quarterly Breakdowns (Approved)
            </div>

            {loading ? (
              <div className="p-4 text-sm">Loading...</div>
            ) : approvedBreakdowns.length === 0 ? (
              <div className="p-5 text-center text-gray-500 text-sm">
                No approved breakdowns available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Indicator</th>
                      <th className="px-4 py-2">Target</th>
                      <th className="px-4 py-2">Q1</th>
                      <th className="px-4 py-2">Q2</th>
                      <th className="px-4 py-2">Q3</th>
                      <th className="px-4 py-2">Q4</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {approvedBreakdowns.map((b) => {
                      const p = planById[b.plan];
                      return (
                        <tr key={b.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{p?.indicator_name}</div>
                            <div className="text-xs text-gray-500">
                              {p?.department_name} • {p?.sector_name}
                            </div>
                          </td>

                          <td className="px-4 py-3">{p?.target || '0'}</td>
                          <td className="px-4 py-3">{b.q1}</td>
                          <td className="px-4 py-3">{b.q2}</td>
                          <td className="px-4 py-3">{b.q3}</td>
                          <td className="px-4 py-3">{b.q4}</td>

                          <td className="px-4 py-3 space-x-2">
                            <button
                              disabled={!isStrategic}
                              onClick={() => validateBreakdown(b)}
                              className={`px-3 py-1 rounded-md text-white shadow-sm ${
                                isStrategic
                                  ? 'bg-blue-600 hover:bg-blue-700'
                                  : 'bg-gray-300 cursor-not-allowed'
                              }`}
                            >
                              Validate
                            </button>

                            <button
                              disabled={!isStrategic}
                              onClick={() => rejectBreakdown(b)}
                              className={`px-3 py-1 rounded-md text-white shadow-sm ${
                                isStrategic
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-gray-300 cursor-not-allowed'
                              }`}
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PERFORMANCE CARD */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
              Quarterly Performances (Approved)
            </div>

            {loading ? (
              <div className="p-4 text-sm">Loading...</div>
            ) : approvedPerfs.length === 0 ? (
              <div className="p-5 text-center text-gray-500 text-sm">
                No approved performance available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Indicator</th>
                      <th className="px-4 py-2">Quarter</th>
                      <th className="px-4 py-2">Value</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {approvedPerfs.map((pr) => {
                      const p = planById[pr.plan];
                      return (
                        <tr key={pr.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{p?.indicator_name}</div>
                            <div className="text-xs text-gray-500">
                              {p?.department_name} • {p?.sector_name}
                            </div>
                          </td>

                          <td className="px-4 py-3">Q{pr.quarter}</td>
                          <td className="px-4 py-3">{pr.value}</td>

                          <td className="px-4 py-3 space-x-2">
                            <button
                              disabled={!isStrategic}
                              onClick={() => validatePerf(pr)}
                              className={`px-3 py-1 rounded-md text-white shadow-sm ${
                                isStrategic
                                  ? 'bg-blue-600 hover:bg-blue-700'
                                  : 'bg-gray-300 cursor-not-allowed'
                              }`}
                            >
                              Validate
                            </button>

                            <button
                              disabled={!isStrategic}
                              onClick={() => rejectPerf(pr)}
                              className={`px-3 py-1 rounded-md text-white shadow-sm ${
                                isStrategic
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-gray-300 cursor-not-allowed'
                              }`}
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CONTEXT: ANNUAL PLANS */}
        <div className="mt-10 bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 font-semibold border-b">
            Annual Plans (Context Only)
          </div>

          {loading ? (
            <div className="p-4 text-sm">Loading...</div>
          ) : plans.length === 0 ? (
            <div className="p-5 text-center text-gray-500 text-sm">
              No plans available for selected year.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 text-xs uppercase text-gray-700">
                  <tr>
                    <th className="px-4 py-2">Indicator</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Sector</th>
                    <th className="px-4 py-2">Target</th>
                  </tr>
                </thead>

                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{p.indicator_name}</td>
                      <td className="px-4 py-3">{p.department_name}</td>
                      <td className="px-4 py-3">{p.sector_name}</td>
                      <td className="px-4 py-3">{p.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
