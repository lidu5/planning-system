import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminStatsCards from '../components/AdminStatsCards';
import api from '../lib/api';

export default function Home() {
  const { user, logout } = useAuth();
  const [targetsBySector, setTargetsBySector] = useState<Array<{ sector: string; total: number }>>([]);
  const [indicatorsByDept, setIndicatorsByDept] = useState<Array<{ department: string; count: number }>>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // Minister KPIs state
  const [ministerYear, setMinisterYear] = useState<number | null>(null);
  const [mPlans, setMPlans] = useState<any[]>([]);
  const [mBreakdowns, setMBreakdowns] = useState<any[]>([]);
  const [mPerfs, setMPerfs] = useState<any[]>([]);
  const [mLoading, setMLoading] = useState(false);
  const [mError, setMError] = useState<string | null>(null);

  useEffect(() => {
    const loadCharts = async () => {
      if (!user?.is_superuser) return;
      setLoadingCharts(true);
      setChartError(null);
      try {
        const [tRes, iRes] = await Promise.all([
          api.get('/api/admin-stats/targets-by-sector/'),
          api.get('/api/admin-stats/indicators-by-department/'),
        ]);
        setTargetsBySector(tRes.data || []);
        setIndicatorsByDept(iRes.data || []);
      } catch (e: any) {
        setChartError(e?.response?.data?.detail || 'Failed to load charts');
      } finally {
        setLoadingCharts(false);
      }
    };
    loadCharts();
  }, [user?.is_superuser]);

  // Load data for Minister KPIs (final approved only)
  useEffect(() => {
    const loadMinister = async () => {
      if ((user?.role || '').toUpperCase() !== 'MINISTER_VIEW') return;
      setMLoading(true);
      setMError(null);
      try {
        if (!ministerYear) {
          setMPlans([]);
          setMBreakdowns([]);
          setMPerfs([]);
          return;
        }
        const [plansRes, bRes, pRes] = await Promise.all([
          api.get('/api/annual-plans/', { params: { year: ministerYear } }),
          api.get('/api/breakdowns/'),
          api.get('/api/performances/'),
        ]);
        setMPlans(plansRes.data || []);
        setMBreakdowns((bRes.data || []).filter((b: any) => String(b.status).toUpperCase() === 'FINAL_APPROVED'));
        setMPerfs((pRes.data || []).filter((p: any) => String(p.status).toUpperCase() === 'FINAL_APPROVED'));
      } catch (e: any) {
        setMError(e?.response?.data?.detail || 'Failed to load minister data');
      } finally {
        setMLoading(false);
      }
    };
    loadMinister();
  }, [user?.role, ministerYear]);

  const mPlanById = useMemo(() => {
    const map: Record<number, any> = {};
    for (const p of mPlans) map[p.id] = p;
    return map;
  }, [mPlans]);

  const ministerKpis = useMemo(() => {
    if (!mPlans.length) return { totalIndicators: 0, totalPerformance: 0, sectorAvgAch: 0, topIndicators: [] as Array<{id:number;name:string;value:number}> };
    const involvedPlanIds = new Set<number>();
    mPerfs.forEach((pr: any) => involvedPlanIds.add(pr.plan));
    mBreakdowns.forEach((b: any) => involvedPlanIds.add(b.plan));
    const involvedIndicators = new Set<number>();
    involvedPlanIds.forEach((pid) => { const p = mPlanById[pid]; if (p) involvedIndicators.add(p.indicator); });

    const totalPerformance = mPerfs.reduce((sum: number, pr: any) => sum + (Number(pr.value) || 0), 0);
    const totalTarget = Array.from(involvedPlanIds).reduce((acc, pid) => acc + (Number(mPlanById[pid]?.target) || 0), 0);
    const sectorAvgAch = totalTarget > 0 ? (totalPerformance / totalTarget) * 100 : 0;

    const perfByIndicator: Record<number, { name: string; value: number }> = {};
    mPerfs.forEach((pr: any) => {
      const p = mPlanById[pr.plan];
      if (!p) return;
      if (!perfByIndicator[p.indicator]) perfByIndicator[p.indicator] = { name: p.indicator_name, value: 0 };
      perfByIndicator[p.indicator].value += Number(pr.value) || 0;
    });
    const topIndicators = Object.entries(perfByIndicator)
      .map(([id, v]) => ({ id: Number(id), name: v.name, value: v.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { totalIndicators: involvedIndicators.size, totalPerformance, sectorAvgAch, topIndicators };
  }, [mPlans, mPerfs, mBreakdowns, mPlanById]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Planning & Performance Platform</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">{user?.username}</span>
            <button
              onClick={logout}
              className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <section className="mb-8">
          <div className="relative h-56 md:h-64 rounded-2xl overflow-hidden">
            <img
              src="src/assets/home_pic.jpg"
              alt="Agriculture landscape"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20" />
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
              <h2 className="text-white text-2xl md:text-3xl font-semibold mb-1">
                Ministry of Agriculture
              </h2>
              <p className="text-white/90 text-sm md:text-base max-w-2xl">
                Empowering sustainable agricultural growth through planning, performance, and accountability.
                Welcome{user ? `, ${user.username}` : ''}.
                {user?.role ? ` Your role: ${String(user.role).replace(/_/g, ' ')}` : ''}
              </p>
            </div>
          </div>
        </section>

        {/* Admin Stats */}
        {user?.is_superuser && (
          <div className="mb-8 space-y-8">
            <AdminStatsCards />

            {chartError && <div className="text-sm text-red-600">{chartError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border rounded shadow-sm p-4">
                <div className="font-medium mb-3">Annual Plan Target distribution per sector</div>
                {loadingCharts ? (
                  <div className="text-sm">Loading...</div>
                ) : targetsBySector.length === 0 ? (
                  <div className="text-sm text-gray-500">No data</div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const max = Math.max(...targetsBySector.map(d => d.total || 0), 1);
                      return targetsBySector.map((d) => (
                        <div key={d.sector} className="text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-700 truncate pr-2">{d.sector}</span>
                            <span className="text-gray-600">{d.total.toFixed(2)}</span>
                          </div>
                          <div className="w-full h-3 bg-gray-100 rounded">
                            <div
                              className="h-3 bg-emerald-600 rounded"
                              style={{ width: `${Math.max(4, (d.total / max) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <div className="bg-white border rounded shadow-sm p-4">
                <div className="font-medium mb-3">Number of indicators per department</div>
                {loadingCharts ? (
                  <div className="text-sm">Loading...</div>
                ) : indicatorsByDept.length === 0 ? (
                  <div className="text-sm text-gray-500">No data</div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const max = Math.max(...indicatorsByDept.map(d => d.count || 0), 1);
                      return indicatorsByDept.map((d) => (
                        <div key={d.department} className="text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-700 truncate pr-2">{d.department}</span>
                            <span className="text-gray-600">{d.count}</span>
                          </div>
                          <div className="w-full h-3 bg-gray-100 rounded">
                            <div
                              className="h-3 bg-green-700 rounded"
                              style={{ width: `${Math.max(4, (d.count / max) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Minister KPIs on Home */}
        {(user?.role || '').toUpperCase() === 'MINISTER_VIEW' && (
          <div className="mb-8 space-y-6">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Year</label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={ministerYear ?? ''}
                onChange={(e) => setMinisterYear(e.target.value ? Number(e.target.value) : null)}
                className="w-28 border rounded px-3 py-2 shadow-sm focus:ring focus:ring-blue-300"
              />
            </div>

            {mError && <div className="text-sm text-red-600">{mError}</div>}

            {mLoading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transform transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Total Indicators</div>
                  <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="text-3xl font-bold">{ministerKpis.totalIndicators}</div>
              </div>

              <div className="bg-gradient-to-r from-green-400 to-teal-500 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transform transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Sector Avg Achievement</div>
                  <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h4l3 8 4-16 3 8h4" />
                  </svg>
                </div>
                <div className="text-3xl font-bold">{ministerKpis.sectorAvgAch.toFixed(1)}%</div>
                <div className="text-xs opacity-80 mt-1">Based on final approved performance / targets</div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transform transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Total Performance</div>
                  <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-3xl font-bold">{ministerKpis.totalPerformance.toFixed(2)}</div>
              </div>

              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transform transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Top 5 Indicators</div>
                  <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                {ministerKpis.topIndicators.length === 0 ? (
                  <div className="text-sm opacity-80">No data</div>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {ministerKpis.topIndicators.map((t) => (
                      <li key={t.id} className="flex items-center justify-between">
                        <span className="truncate pr-2">{t.name}</span>
                        <span className="font-semibold">{t.value.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
