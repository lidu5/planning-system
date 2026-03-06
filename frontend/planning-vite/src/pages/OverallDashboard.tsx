import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import YearFilter from '../components/YearFilter';
import { getCurrentEthiopianDate, toGregorianYearFromEthiopian } from '../lib/ethiopian';

// --- Types ---
type Department = {
  id: number;
  name: string;
  performance_percentage: number | null;
};

type Sector = {
  id: number;
  name: string;
  performance_percentage: number | null;
  departments: Department[];
};

type DashboardData = {
  year: number;
  quarter_months: number | null;
  ministry_performance: number | null;
  sectors: Sector[];
};

// --- Colors ---
const SECTOR_COLORS = [
  '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#22c55e', '#eab308',
];

const getPerformanceColor = (pct: number | null) => {
  if (pct === null || isNaN(pct)) return '#9ca3af';
  if (pct >= 95) return '#047857';
  if (pct >= 85) return '#22c55e';
  if (pct >= 65) return '#eab308';
  if (pct >= 50) return '#f97316';
  return '#ef4444';
};

const formatPct = (val: number | null | undefined) => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${val.toFixed(1)}%`;
};

// --- Custom Tooltip ---
const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-3">
      <p className="text-sm font-semibold text-gray-800 mb-1">{label}</p>
      <p className="text-sm" style={{ color: getPerformanceColor(val) }}>
        Performance: <span className="font-bold">{formatPct(val)}</span>
      </p>
    </div>
  );
};

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-3 max-w-xs">
      <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{formatPct(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

// --- Component ---
export default function OverallDashboard() {
  const ethDate = getCurrentEthiopianDate();
  const currentYear = Array.isArray(ethDate) && typeof ethDate[0] === 'number' ? ethDate[0] : new Date().getFullYear() - 7;

  const [year, setYear] = useState<number>(currentYear);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drill-down state
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);

  // Quarterly trend data
  const [quarterlyTrends, setQuarterlyTrends] = useState<{
    sectorTrends: Array<{ quarter: string; [sectorName: string]: string | number | null }>;
    ministryTrend: Array<{ quarter: string; performance: number | null }>;
    sectorNames: string[];
  } | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // Multi-year ministry performance trend (past 4 years)
  const [yearlyTrend, setYearlyTrend] = useState<Array<{ year: string; performance: number | null }>>([]);
  const [yearlyTrendLoading, setYearlyTrendLoading] = useState(false);

  // Load main data (annual / no quarter filter)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      setSelectedSector(null);
      try {
        const gYear = toGregorianYearFromEthiopian(year);
        const res = await api.get('/api/indicator-performance/', {
          params: { year: gYear },
        });
        setData(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [year]);

  // Load quarterly trend data
  useEffect(() => {
    const loadTrends = async () => {
      setTrendsLoading(true);
      try {
        const gYear = toGregorianYearFromEthiopian(year);
        const quarters = [
          { months: 3, label: 'Q1' },
          { months: 6, label: 'Q2' },
          { months: 9, label: 'Q3' },
          { months: 12, label: 'Q4' },
        ];

        const responses = await Promise.all(
          quarters.map((q) =>
            api.get('/api/indicator-performance/', {
              params: { year: gYear, quarter_months: q.months },
            })
          )
        );

        // Collect all sector names
        const sectorNamesSet = new Set<string>();
        responses.forEach((res) => {
          (res.data as DashboardData).sectors.forEach((s) => sectorNamesSet.add(s.name));
        });
        const sectorNames = Array.from(sectorNamesSet);

        // Build sector trends
        const sectorTrends = quarters.map((q, idx) => {
          const qData = responses[idx].data as DashboardData;
          const row: any = { quarter: q.label };
          sectorNames.forEach((name) => {
            const sector = qData.sectors.find((s) => s.name === name);
            row[name] = sector?.performance_percentage ?? null;
          });
          return row;
        });

        // Build ministry trend
        const ministryTrend = quarters.map((q, idx) => ({
          quarter: q.label,
          performance: (responses[idx].data as DashboardData).ministry_performance,
        }));

        setQuarterlyTrends({ sectorTrends, ministryTrend, sectorNames });
      } catch (err) {
        console.error('Failed to load quarterly trends:', err);
      } finally {
        setTrendsLoading(false);
      }
    };
    loadTrends();
  }, [year]);

  // Load 4-year ministry performance trend
  useEffect(() => {
    const loadYearlyTrend = async () => {
      setYearlyTrendLoading(true);
      try {
        const years = [year - 3, year - 2, year - 1, year];
        const responses = await Promise.all(
          years.map((y) =>
            api.get('/api/indicator-performance/', {
              params: { year: toGregorianYearFromEthiopian(y) },
            }).catch(() => null)
          )
        );
        const trend = years.map((y, idx) => ({
          year: String(y),
          performance: responses[idx]
            ? (responses[idx]!.data as DashboardData).ministry_performance
            : null,
        }));
        setYearlyTrend(trend);
      } catch (err) {
        console.error('Failed to load yearly trend:', err);
      } finally {
        setYearlyTrendLoading(false);
      }
    };
    loadYearlyTrend();
  }, [year]);

  // Prepare sector bar data
  const sectorBarData = useMemo(() => {
    if (!data) return [];
    return data.sectors.map((s) => ({
      name: s.name.length > 20 ? s.name.substring(0, 20) + '…' : s.name,
      fullName: s.name,
      performance: s.performance_percentage !== null ? Math.round(s.performance_percentage * 10) / 10 : 0,
      raw: s.performance_percentage,
      id: s.id,
    }));
  }, [data]);

  // Prepare department bar data for selected sector
  const deptBarData = useMemo(() => {
    if (!selectedSector) return [];
    return selectedSector.departments.map((d) => ({
      name: d.name.length > 20 ? d.name.substring(0, 20) + '…' : d.name,
      fullName: d.name,
      performance: d.performance_percentage !== null ? Math.round(d.performance_percentage * 10) / 10 : 0,
      raw: d.performance_percentage,
      id: d.id,
    }));
  }, [selectedSector]);

  const handleSectorBarClick = (barData: any) => {
    if (!data) return;
    const sector = data.sectors.find((s) => s.id === barData.id);
    if (sector) setSelectedSector(sector);
  };

  // --- Render ---
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 max-w-md">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Overall Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ministry-wide performance overview &amp; trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <YearFilter value={year} onChange={setYear} variant="compact" className="w-40" />
        </div>
      </div>

      {/* Ministry Performance Summary */}
      {data && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div
              className="h-14 w-14 rounded-xl flex items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: getPerformanceColor(data.ministry_performance) }}
            >
              {formatPct(data.ministry_performance).replace('%', '')}
            </div>
            <div>
              <p className="text-sm text-gray-500">Ministry Overall Performance</p>
              <p className="text-xl font-bold text-gray-800">{formatPct(data.ministry_performance)}</p>
            </div>
            <div className="ml-auto text-right hidden sm:block">
              <p className="text-xs text-gray-400">Sectors</p>
              <p className="text-lg font-semibold text-gray-700">{data.sectors.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Sector-wise Performance Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Sector-wise Performance Comparison</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click a bar to see departments</p>
          </div>
        </div>
        {sectorBarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(350, sectorBarData.length * 45)}>
            <BarChart data={sectorBarData} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                fontSize={12}
                tick={{ fill: '#374151' }}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar
                dataKey="performance"
                radius={[0, 6, 6, 0]}
                cursor="pointer"
                onClick={(data: any) => handleSectorBarClick(data)}
                barSize={28}
              >
                {sectorBarData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={getPerformanceColor(entry.raw)}
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm text-center py-10">No sector data available</p>
        )}
      </div>

      {/* Section 2: Department Performance (Drill-down) */}
      {selectedSector && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setSelectedSector(null)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Back to sectors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedSector.name} — Department Performance
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Sector performance: {formatPct(selectedSector.performance_percentage)}
              </p>
            </div>
          </div>
          {deptBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, deptBarData.length * 50)}>
              <BarChart data={deptBarData} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  fontSize={12}
                  tick={{ fill: '#374151' }}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="performance" radius={[0, 6, 6, 0]} barSize={28}>
                  {deptBarData.map((entry, idx) => (
                    <Cell key={`dept-cell-${idx}`} fill={getPerformanceColor(entry.raw)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">No departments in this sector</p>
          )}
        </div>
      )}

      {/* Section 3: Quarterly Performance Trend by Sector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Quarterly Performance Trend by Sector</h2>
          <p className="text-xs text-gray-400 mt-0.5">Cumulative performance across quarters (Q1–Q4)</p>
        </div>
        {trendsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quarterlyTrends && quarterlyTrends.sectorTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={quarterlyTrends.sectorTrends} margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="quarter" fontSize={13} tick={{ fill: '#374151' }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
              <Tooltip content={<LineTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                iconType="circle"
              />
              {quarterlyTrends.sectorNames.map((name, idx) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={SECTOR_COLORS[idx % SECTOR_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm text-center py-10">No quarterly data available</p>
        )}
      </div>

      {/* Section 4: Quarterly Performance Trend of the Ministry */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Quarterly Performance Trend — Ministry</h2>
          <p className="text-xs text-gray-400 mt-0.5">Overall ministry performance per quarter</p>
        </div>
        {trendsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quarterlyTrends && quarterlyTrends.ministryTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={quarterlyTrends.ministryTrend} margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="quarter" fontSize={13} tick={{ fill: '#374151' }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-3">
                      <p className="text-sm font-semibold text-gray-800 mb-1">{label}</p>
                      <p className="text-sm text-emerald-700">
                        Ministry: <span className="font-bold">{formatPct(payload[0].value)}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="performance"
                name="Ministry Performance"
                stroke="#047857"
                strokeWidth={3}
                dot={{ r: 5, fill: '#047857', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm text-center py-10">No quarterly data available</p>
        )}
      </div>

      {/* Section 5: Ministry Performance Trend (Past 4 Years) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Ministry Performance Trend — Past 4 Years</h2>
          <p className="text-xs text-gray-400 mt-0.5">Annual ministry performance over Ethiopian calendar years</p>
        </div>
        {yearlyTrendLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : yearlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={yearlyTrend} margin={{ left: 10, right: 30, top: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#047857" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#047857" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="year"
                fontSize={13}
                tick={{ fill: '#374151' }}
                label={{ value: 'Ethiopian Calendar Year', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#9ca3af' }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                fontSize={12}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const val = payload[0].value;
                  return (
                    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-3">
                      <p className="text-sm font-semibold text-gray-800 mb-1">Year {label} (EC)</p>
                      <p className="text-sm" style={{ color: getPerformanceColor(val) }}>
                        Performance: <span className="font-bold">{formatPct(val)}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="performance"
                name="Ministry Performance"
                stroke="#047857"
                strokeWidth={3}
                fill="url(#perfGradient)"
                dot={{ r: 6, fill: '#047857', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 8, stroke: '#047857', strokeWidth: 2, fill: '#fff' }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm text-center py-10">No yearly trend data available</p>
        )}
      </div>
    </div>
  );
}
