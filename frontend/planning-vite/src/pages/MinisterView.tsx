import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

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

export default function MinisterView() {
  const [year, setYear] = useState<number | 'ALL'>('ALL');
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [perfs, setPerfs] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<number | 'ALL'>('ALL');
  const [deptFilter, setDeptFilter] = useState<number | 'ALL'>('ALL');
  const [yearOptions, setYearOptions] = useState<number[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = typeof year === 'number' ? { year } : {};
      const [plansRes, bRes, pRes] = await Promise.all([
        api.get('/api/annual-plans/', { params }),
        api.get('/api/breakdowns/'),
        api.get('/api/performances/'),
      ]);
      setPlans(plansRes.data || []);
      setBreakdowns(bRes.data || []);
      setPerfs(pRes.data || []);
      if (year === 'ALL') {
        const ys = Array.from(
          new Set((plansRes.data || []).map((p: AnnualPlan) => p.year))
        ).sort((a, b) => b - a);
        setYearOptions(ys);
      }
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

  const filterCommon = <T extends { plan: number; status: string }>(list: T[], finalStatus: string) => {
    const statusFiltered = list.filter((item) => (item.status || '').toUpperCase() === finalStatus);

    const bySector = statusFiltered.filter((item) => {
      if (sectorFilter === 'ALL') return true;
      const p = planById[item.plan];
      return p?.sector_id === sectorFilter;
    });

    const byDept = bySector.filter((item) => {
      if (deptFilter === 'ALL') return true;
      const p = planById[item.plan];
      return p?.department_id === deptFilter;
    });

    if (!query.trim()) return byDept;
    const q = query.toLowerCase();

    return byDept.filter((item) => {
      const p = planById[item.plan];
      const txt = [p?.indicator_name, p?.department_name, p?.sector_name, p?.indicator_unit]
        .join(' ')
        .toLowerCase();
      return txt.includes(q);
    });
  };

  const finalBreakdowns = useMemo(() => {
    const list = breakdowns.filter((b) => planById[b.plan]);
    return filterCommon(list, 'FINAL_APPROVED');
  }, [breakdowns, planById, query, sectorFilter, deptFilter]);

  const finalPerfs = useMemo(() => {
    const list = perfs.filter((pr) => planById[pr.plan]);
    return filterCommon(list, 'FINAL_APPROVED');
  }, [perfs, planById, query, sectorFilter, deptFilter]);

  const kpis = useMemo(() => {
    const involvedPlanIds = new Set<number>();
    finalPerfs.forEach((pr) => involvedPlanIds.add(pr.plan));
    finalBreakdowns.forEach((b) => involvedPlanIds.add(b.plan));
    const involvedIndicators = new Set<number>();
    involvedPlanIds.forEach((pid) => {
      const p = planById[pid];
      if (p) involvedIndicators.add(p.indicator);
    });

    const totalPerformance = finalPerfs.reduce((sum, pr) => sum + (Number(pr.value) || 0), 0);

    const targetSumMap: Record<number, number> = {};
    involvedPlanIds.forEach((pid) => {
      const p = planById[pid];
      if (p) targetSumMap[pid] = Number(p.target) || 0;
    });
    const totalTarget = Object.values(targetSumMap).reduce((a, b) => a + b, 0);
    const sectorAvgAch = totalTarget > 0 ? (totalPerformance / totalTarget) * 100 : 0;

    const perfByIndicator: Record<number, { name: string; value: number }> = {};
    finalPerfs.forEach((pr) => {
      const p = planById[pr.plan];
      if (!p) return;
      if (!perfByIndicator[p.indicator]) {
        perfByIndicator[p.indicator] = { name: p.indicator_name, value: 0 };
      }
      perfByIndicator[p.indicator].value += Number(pr.value) || 0;
    });
    const topIndicators = Object.entries(perfByIndicator)
      .map(([id, v]) => ({ id: Number(id), name: v.name, value: v.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalIndicators: involvedIndicators.size,
      totalPerformance,
      sectorAvgAch,
      topIndicators,
    };
  }, [finalPerfs, finalBreakdowns, planById]);

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl font-bold text-gray-800">Final Approved Plans & Performances</h2>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={year === 'ALL' ? 'ALL' : String(year)}
              onChange={(e) => setYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-36 border rounded px-3 py-2 shadow-sm focus:ring focus:ring-blue-300"
            >
              <option value="ALL">All Years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-48 border rounded px-3 py-2 shadow-sm focus:ring focus:ring-blue-300"
            />

            <select
              value={sectorFilter === 'ALL' ? 'ALL' : String(sectorFilter)}
              onChange={(e) => setSectorFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-52 border rounded px-3 py-2 shadow-sm focus:ring focus:ring-blue-300"
            >
              <option value="ALL">All Sectors</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={deptFilter === 'ALL' ? 'ALL' : String(deptFilter)}
              onChange={(e) => setDeptFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-56 border rounded px-3 py-2 shadow-sm focus:ring focus:ring-blue-300"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-700 text-sm">{error}</div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transform transition">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Total Indicators</div>
              <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-3xl font-bold">{kpis.totalIndicators}</div>
          </div>

          <div className="bg-gradient-to-r from-green-400 to-teal-500 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transform transition">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Sector Avg Achievement</div>
              <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h4l3 8 4-16 3 8h4" />
              </svg>
            </div>
            <div className="text-3xl font-bold">{kpis.sectorAvgAch.toFixed(1)}%</div>
            <div className="text-xs opacity-80 mt-1">Based on final approved performance / targets</div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transform transition">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Total Performance</div>
              <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-3xl font-bold">{kpis.totalPerformance.toFixed(2)}</div>
          </div>

          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transform transition">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Top 5 Indicators</div>
              <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
              </svg>
            </div>
            {kpis.topIndicators.length === 0 ? (
              <div className="text-sm opacity-80">No data</div>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {kpis.topIndicators.map((t) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <span className="truncate pr-2">{t.name}</span>
                    <span className="font-semibold">{t.value.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">Quarterly Breakdowns (Final Approved)</div>
            {loading ? (
              <div className="p-4 text-sm">Loading...</div>
            ) : finalBreakdowns.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">No final approved breakdowns.</div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {finalBreakdowns.map((b) => {
                      const p = planById[b.plan];
                      return (
                        <tr key={b.id} className="border-t">
                          <td className="px-4 py-3">
                            <div className="font-medium">{p?.indicator_name}</div>
                            <div className="text-xs text-gray-500">{p?.department_name} • {p?.sector_name}</div>
                          </td>
                          <td className="px-4 py-3">{p?.target}</td>
                          <td className="px-4 py-3">{b.q1}</td>
                          <td className="px-4 py-3">{b.q2}</td>
                          <td className="px-4 py-3">{b.q3}</td>
                          <td className="px-4 py-3">{b.q4}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">Quarterly Performances (Final Approved)</div>
            {loading ? (
              <div className="p-4 text-sm">Loading...</div>
            ) : finalPerfs.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">No final approved performances.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-2">Indicator</th>
                      <th className="px-4 py-2">Quarter</th>
                      <th className="px-4 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalPerfs.map((pr) => {
                      const p = planById[pr.plan];
                      return (
                        <tr key={pr.id} className="border-t">
                          <td className="px-4 py-3">
                            <div className="font-medium">{p?.indicator_name}</div>
                            <div className="text-xs text-gray-500">{p?.department_name} • {p?.sector_name}</div>
                          </td>
                          <td className="px-4 py-3">Q{pr.quarter}</td>
                          <td className="px-4 py-3">{pr.value}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
