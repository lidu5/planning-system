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
  const [year, setYear] = useState<number | null>(null);
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [perfs, setPerfs] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<number | 'ALL'>('ALL');

  const isMinister =
    (user?.role || '').toUpperCase() === 'STATE_MINISTER';

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

  useEffect(() => {
    loadData();
  }, [year]);

  const planById = useMemo(() => {
    const map: Record<number, AnnualPlan> = {};
    for (const p of plans) map[p.id] = p;
    return map;
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

  const filterItems = <T extends { plan: number; status: string }>(list: T[]) => {
    const submitted = list.filter((item) => (item.status || '').toUpperCase() === 'SUBMITTED');
    // Apply department filter first if selected
    const byDept = submitted.filter((item) => {
      if (deptFilter === 'ALL') return true;
      const p = planById[item.plan];
      return p?.department_id === deptFilter;
    });
    if (!query.trim()) return byDept;

    const q = query.toLowerCase();

    return byDept.filter((item) => {
      const p = planById[item.plan];
      const txt = [
        p?.indicator_name,
        p?.department_name,
        p?.sector_name,
        p?.indicator_unit,
      ]
        .join(' ')
        .toLowerCase();
      return txt.includes(q);
    });
  };

  const filteredBreakdowns = filterItems(breakdowns);
  const filteredPerfs = filterItems(perfs);

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

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl font-bold text-gray-800">
            Reviews & Approvals
          </h2>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-gray-600">Year</label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={year ?? ''}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                className="w-32 border rounded px-3 py-2 shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-600">Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search indicators..."
                className="w-48 border rounded px-3 py-2 shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-600">Department</label>
              <select
                value={deptFilter === 'ALL' ? 'ALL' : String(deptFilter)}
                onChange={(e) => {
                  const v = e.target.value;
                  setDeptFilter(v === 'ALL' ? 'ALL' : Number(v));
                }}
                className="w-56 border rounded px-3 py-2 shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="text-center py-10 text-gray-600">
            Loading data...
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Breakdowns Section */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
                Quarterly Breakdowns (Submitted)
              </div>

              {filteredBreakdowns.length === 0 ? (
                <p className="p-5 text-gray-500 text-sm">
                  No submitted breakdowns.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-2">Indicator</th>
                        <th className="px-4 py-2">Target</th>
                        <th className="px-4 py-2">Q1</th>
                        <th className="px-4 py-2">Q2</th>
                        <th className="px-4 py-2">Q3</th>
                        <th className="px-4 py-2">Q4</th>
                        <th className="px-4 py-2 text-center">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredBreakdowns.map((b) => {
                        const p = planById[b.plan];
                        return (
                          <tr key={b.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium">
                                {p?.indicator_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {p?.department_name} • {p?.sector_name}
                              </div>
                            </td>
                            <td className="px-4 py-3">{p?.target}</td>
                            <td className="px-4 py-3">{b.q1}</td>
                            <td className="px-4 py-3">{b.q2}</td>
                            <td className="px-4 py-3">{b.q3}</td>
                            <td className="px-4 py-3">{b.q4}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                disabled={!isMinister}
                                onClick={() => approveBreakdown(b)}
                                className={`px-3 py-1 rounded-md ${
                                  isMinister
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                Approve
                              </button>

                              <button
                                disabled={!isMinister}
                                onClick={() => rejectBreakdown(b)}
                                className={`ml-2 px-3 py-1 rounded-md ${
                                  isMinister
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
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

            {/* Performance Section */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
                Quarterly Performance (Submitted)
              </div>

              {filteredPerfs.length === 0 ? (
                <p className="p-5 text-gray-500 text-sm">
                  No submitted performance reports.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-2">Indicator</th>
                        <th className="px-4 py-2">Quarter</th>
                        <th className="px-4 py-2">Value</th>
                        <th className="px-4 py-2 text-center">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPerfs.map((pr) => {
                        const p = planById[pr.plan];
                        return (
                          <tr key={pr.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium">
                                {p?.indicator_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {p?.department_name} • {p?.sector_name}
                              </div>
                            </td>
                            <td className="px-4 py-3">Q{pr.quarter}</td>
                            <td className="px-4 py-3">{pr.value}</td>

                            <td className="px-4 py-3 text-center">
                              <button
                                disabled={!isMinister}
                                onClick={() => approvePerf(pr)}
                                className={`px-3 py-1 rounded-md ${
                                  isMinister
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                Approve
                              </button>

                              <button
                                disabled={!isMinister}
                                onClick={() => rejectPerf(pr)}
                                className={`ml-2 px-3 py-1 rounded-md ${
                                  isMinister
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
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
        )}
      </div>
    </div>
  );
}
