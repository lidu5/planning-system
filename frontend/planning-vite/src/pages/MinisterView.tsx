import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import api from '../lib/api';
import YearFilter from '../components/YearFilter';
import { getCurrentEthiopianDate, toGregorianYearFromEthiopian, toEthiopianYearFromGregorian } from '../lib/ethiopian';

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
};

type Performance = {
  id: number;
  plan: number;
  quarter: number;
  value: string;
};

type DashboardData = {
  kpis: {
    total_annual_target: number;
    total_achieved_performance: number;
    achievement_percentage: number;
    indicators_on_track: number;
    indicators_lagging: number;
  };
  sector_comparison: Array<{
    sector_id: number;
    sector_name: string;
    target: number;
    achieved: number;
  }>;
  quarterly_trend: Array<{
    quarter: string;
    planned: number;
    actual: number;
  }>;
  approval_status: {
    approved: number;
    pending: number;
    rejected: number;
  };
  approval_stages: {
    draft: number;
    submitted: number;
    approved: number;
    validated: number;
    final_approved: number;
    rejected: number;
  };
  sector_summaries: Array<{
    sector_id: number;
    sector_name: string;
    annual_target: number;
    performance_achieved: number;
    progress_rate: number;
  }>;
  indicators_at_risk: Array<{
    indicator_name: string;
    sector_name: string;
    department_name: string;
    target: number;
    achieved: number;
    gap: number;
    progress_pct: number;
    risk_level: string;
  }>;
  late_or_rejected: Array<{
    type: string;
    indicator_name: string;
    sector_name: string;
    department_name: string;
    quarter?: number;
    status: string;
    submitted_at?: string;
    reviewed_at?: string;
    days_late?: number;
    comment: string;
  }>;
};

const COLORS = {
  primary: '#10b981',
  secondary: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

// Performance category colors
const PERFORMANCE_COLORS = {
  achieved: '#065f46', // deep green
  onTrack: '#10b981', // light green
  inProgress: '#eab308', // yellow
  weakPerformance: '#f97316', // orange
  requiresIntervention: '#dc2626', // red
  noData: '#9ca3af', // gray
};

type IndicatorGroup = {
  id: number;
  name: string;
  performance_percentage: number | null;
  indicators: Array<{
    id: number;
    plan_id: number;
    name: string;
    unit: string;
    description: string;
    department_name: string;
    target: number;
    achieved: number;
    performance_percentage: number | null;
    group_id: number | null;
    group_name: string | null;
  }>;
};

type Sector = {
  id: number;
  name: string;
  performance_percentage: number | null;
  indicator_groups: IndicatorGroup[];
  ungrouped_indicators: Array<{
    id: number;
    plan_id: number;
    name: string;
    unit: string;
    description: string;
    department_name: string;
    target: number;
    achieved: number;
    performance_percentage: number | null;
    group_id: number | null;
    group_name: string | null;
  }>;
};

type IndicatorPerformanceData = {
  year: number;
  sectors: Sector[];
};

type IndicatorDetail = {
  indicator: {
    id: number;
    name: string;
    unit: string;
    description: string;
    department_name: string;
  };
  yearly_data: Array<{
    year: number;
    target: number;
    achieved: number;
  }>;
  quarterly_data: Array<{
    quarter: string;
    target: number;
    achieved: number;
  }>;
};

export default function MinisterView() {
  const ethDate = getCurrentEthiopianDate();
  const currentYear = Array.isArray(ethDate) && typeof ethDate[0] === 'number' ? ethDate[0] : new Date().getFullYear() - 7;
  const [year, setYear] = useState<number>(currentYear);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [perfs, setPerfs] = useState<Performance[]>([]);
  
  // Indicator Performance View State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'indicators'>('indicators');
  const [indicatorData, setIndicatorData] = useState<IndicatorPerformanceData | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(null);
  const [indicatorDetail, setIndicatorDetail] = useState<IndicatorDetail | null>(null);
  const [viewMode, setViewMode] = useState<'yearly' | 'quarterly'>('yearly');
  const [loadingIndicatorData, setLoadingIndicatorData] = useState(false);
  const [loadingIndicatorDetail, setLoadingIndicatorDetail] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const toNumber = (val: unknown) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  };

  // Get performance category and color
  const getPerformanceCategory = (percentage: number | null): { label: string; color: string } => {
    if (percentage === null || isNaN(percentage)) {
      return { label: 'No Data', color: PERFORMANCE_COLORS.noData };
    }
    if (percentage >= 95) {
      return { label: 'Achieved', color: PERFORMANCE_COLORS.achieved };
    } else if (percentage >= 85) {
      return { label: 'On Track', color: PERFORMANCE_COLORS.onTrack };
    } else if (percentage >= 65) {
      return { label: 'In Progress', color: PERFORMANCE_COLORS.inProgress };
    } else if (percentage >= 50) {
      return { label: 'Weak Performance', color: PERFORMANCE_COLORS.weakPerformance };
    } else {
      return { label: 'Requires Intervention', color: PERFORMANCE_COLORS.requiresIntervention };
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Convert Ethiopian year to Gregorian for backend API
      const gregorianYear = toGregorianYearFromEthiopian(year);
      const [dashRes, plansRes, bRes, pRes] = await Promise.all([
        api.get('/api/minister-dashboard/', {
          params: { year: gregorianYear },
        }),
        api.get('/api/annual-plans/', { params: { year: gregorianYear } }),
        api.get('/api/breakdowns/'),
        api.get('/api/performances/'),
      ]);
      setData(dashRes.data);
      setPlans((plansRes.data || []) as AnnualPlan[]);
      setBreakdowns((bRes.data || []) as Breakdown[]);
      setPerfs((pRes.data || []) as Performance[]);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [year]);

  // Load indicator performance data
  const loadIndicatorPerformance = async () => {
    setLoadingIndicatorData(true);
    setError(null);
    try {
      const gregorianYear = toGregorianYearFromEthiopian(year);
      const res = await api.get('/api/indicator-performance/', {
        params: { year: gregorianYear },
      });
      setIndicatorData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load indicator performance data');
    } finally {
      setLoadingIndicatorData(false);
    }
  };

  // Load indicator detail
  const loadIndicatorDetail = async (indicatorId: number) => {
    setLoadingIndicatorDetail(true);
    try {
      const gregorianYear = toGregorianYearFromEthiopian(year);
      const res = await api.get('/api/indicator-detail/', {
        params: { indicator_id: indicatorId, year: gregorianYear },
      });
      setIndicatorDetail(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load indicator detail');
    } finally {
      setLoadingIndicatorDetail(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'indicators') {
      loadIndicatorPerformance();
    }
  }, [year, activeTab]);

  useEffect(() => {
    if (selectedIndicatorId) {
      loadIndicatorDetail(selectedIndicatorId);
    }
  }, [selectedIndicatorId, year]);

  // Prepare pie chart data
  const approvalPieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Approved', value: data.approval_status.approved },
      { name: 'Pending', value: data.approval_status.pending },
      { name: 'Rejected', value: data.approval_status.rejected },
    ].filter(item => item.value > 0);
  }, [data]);

  const sectorPerformanceData = useMemo(() => {
    const sectorMap: Record<number, { name: string; percentages: number[] }> = {};

    for (const p of plans) {
      if (!p.sector_id || !p.sector_name) continue;
      const totalActual = perfs
        .filter((pr) => pr.plan === p.id)
        .reduce((sum, pr) => sum + toNumber(pr.value), 0);
      const target = toNumber(p.target);
      if (target <= 0) continue;
      const pct = (totalActual / target) * 100;
      if (!sectorMap[p.sector_id]) {
        sectorMap[p.sector_id] = { name: p.sector_name, percentages: [] };
      }
      sectorMap[p.sector_id].percentages.push(pct);
    }

    return Object.values(sectorMap)
      .map((s) => ({
        sector: s.name,
        performance: s.percentages.length
          ? s.percentages.reduce((a, b) => a + b, 0) / s.percentages.length
          : 0,
      }))
      .sort((a, b) => b.performance - a.performance);
  }, [plans, perfs]);

  const { sectorQuarterTrend, sectorList, generalQuarterTrend } = useMemo(() => {
    const sectorMap: Record<
      number,
      { name: string; quarters: [number[], number[], number[], number[]] }
    > = {};

    for (const p of plans) {
      if (!p.sector_id || !p.sector_name) continue;
      if (!sectorMap[p.sector_id]) {
        sectorMap[p.sector_id] = {
          name: p.sector_name,
          quarters: [[], [], [], []],
        };
      }

      const breakdown = breakdowns.find((b) => b.plan === p.id);

      for (let q = 1; q <= 4; q++) {
        const target = toNumber(breakdown?.[`q${q}` as keyof Breakdown]);
        if (target <= 0) continue;
        const actual = perfs
          .filter((pr) => pr.plan === p.id && pr.quarter === q)
          .reduce((sum, pr) => sum + toNumber(pr.value), 0);
        const pct = (actual / target) * 100;
        sectorMap[p.sector_id].quarters[q - 1].push(pct);
      }
    }

    const sectorNames = Object.values(sectorMap).map((s) => s.name);
    if (sectorNames.length === 0) {
      return {
        sectorQuarterTrend: [],
        sectorList: [],
        generalQuarterTrend: [],
      };
    }

    const trendData = Array.from({ length: 4 }, (_, idx) => {
      const entry: Record<string, string | number> = { quarter: `Q${idx + 1}` };
      const sectorQuarterValues: number[] = [];

      for (const sector of Object.values(sectorMap)) {
        const vals = sector.quarters[idx];
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        entry[sector.name] = avg;
        if (vals.length) sectorQuarterValues.push(avg);
      }

      const generalAvg =
        sectorQuarterValues.length > 0
          ? sectorQuarterValues.reduce((a, b) => a + b, 0) / sectorQuarterValues.length
          : 0;
      entry.general = generalAvg;

      return entry;
    });

    const generalTrend = trendData.map(({ quarter, general }) => ({
      quarter,
      general,
    }));

    return {
      sectorQuarterTrend: trendData,
      sectorList: sectorNames,
      generalQuarterTrend: generalTrend,
    };
  }, [plans, breakdowns, perfs]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render Indicator Performance View
  const renderIndicatorPerformanceView = () => {
    if (loadingIndicatorData && !indicatorData) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading indicator performance...</p>
          </div>
        </div>
      );
    }

    if (!indicatorData || !indicatorData.sectors || indicatorData.sectors.length === 0) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center text-gray-500">No indicator performance data available</div>
        </div>
      );
    }

    // Calculate filter counts from all indicators across all sectors
    const getAllIndicators = () => {
      const allIndicators: Array<{
        id: number;
        plan_id: number;
        name: string;
        unit: string;
        description: string;
        department_name: string;
        target: number;
        achieved: number;
        performance_percentage: number | null;
        group_id: number | null;
        group_name: string | null;
        sector_id: number;
        sector_name: string;
      }> = [];
      
      indicatorData.sectors.forEach(sector => {
        sector.indicator_groups.forEach(group => {
          group.indicators.forEach(ind => {
            allIndicators.push({
              ...ind,
              sector_id: sector.id,
              sector_name: sector.name,
            });
          });
        });
        sector.ungrouped_indicators.forEach(ind => {
          allIndicators.push({
            ...ind,
            sector_id: sector.id,
            sector_name: sector.name,
          });
        });
      });
      
      return allIndicators;
    };

    const allIndicators = getAllIndicators();
    
    // Calculate counts for each category
    const filterCounts = {
      achieved: allIndicators.filter(ind => {
        const pct = ind.performance_percentage;
        return pct !== null && !isNaN(pct) && pct >= 95;
      }).length,
      onTrack: allIndicators.filter(ind => {
        const pct = ind.performance_percentage;
        return pct !== null && !isNaN(pct) && pct >= 85 && pct < 95;
      }).length,
      inProgress: allIndicators.filter(ind => {
        const pct = ind.performance_percentage;
        return pct !== null && !isNaN(pct) && pct >= 65 && pct < 85;
      }).length,
      weakPerformance: allIndicators.filter(ind => {
        const pct = ind.performance_percentage;
        return pct !== null && !isNaN(pct) && pct >= 50 && pct < 65;
      }).length,
      requiresIntervention: allIndicators.filter(ind => {
        const pct = ind.performance_percentage;
        return pct !== null && !isNaN(pct) && pct < 50;
      }).length,
      noData: allIndicators.filter(ind => {
        const pct = ind.performance_percentage;
        return pct === null || isNaN(pct);
      }).length,
    };

    // Filter indicators based on selected filter
    const getFilteredIndicators = () => {
      if (!selectedFilter) return allIndicators;
      
      return allIndicators.filter(ind => {
        const pct = ind.performance_percentage;
        switch (selectedFilter) {
          case 'achieved':
            return pct !== null && !isNaN(pct) && pct >= 95;
          case 'onTrack':
            return pct !== null && !isNaN(pct) && pct >= 85 && pct < 95;
          case 'inProgress':
            return pct !== null && !isNaN(pct) && pct >= 65 && pct < 85;
          case 'weakPerformance':
            return pct !== null && !isNaN(pct) && pct >= 50 && pct < 65;
          case 'requiresIntervention':
            return pct !== null && !isNaN(pct) && pct < 50;
          case 'noData':
            return pct === null || isNaN(pct);
          default:
            return true;
        }
      });
    };

    const filteredIndicators = getFilteredIndicators();
    
    // Group filtered indicators by sector
    const getFilteredIndicatorsBySector = () => {
      const sectorMap: Record<number, {
        sector: Sector;
        indicators: typeof filteredIndicators;
      }> = {};
      
      filteredIndicators.forEach(ind => {
        if (!sectorMap[ind.sector_id]) {
          const sector = indicatorData.sectors.find(s => s.id === ind.sector_id);
          if (sector) {
            sectorMap[ind.sector_id] = {
              sector,
              indicators: [],
            };
          }
        }
        if (sectorMap[ind.sector_id]) {
          sectorMap[ind.sector_id].indicators.push(ind);
        }
      });
      
      return Object.values(sectorMap);
    };

    const filteredBySector = selectedFilter ? getFilteredIndicatorsBySector() : null;

    const selectedSector = indicatorData.sectors.find(s => s.id === selectedSectorId);
    const selectedIndicator = selectedSector
      ? [...selectedSector.indicator_groups.flatMap(g => g.indicators), ...selectedSector.ungrouped_indicators]
          .find(ind => ind.id === selectedIndicatorId)
      : null;

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-gray-900">Indicator Performance Dashboard</h1>
              <div className="w-64">
                <YearFilter
                  value={year}
                  onChange={setYear}
                  variant="dropdown"
                  showLabel={false}
                />
              </div>
            </div>
            <p className="text-gray-600">
              View indicator performance organized by sectors and indicator groups (Ethiopian Calendar)
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Filter Cards */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={() => {
                setSelectedFilter(selectedFilter === 'achieved' ? null : 'achieved');
                setSelectedSectorId(null);
                setSelectedIndicatorId(null);
              }}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                selectedFilter === 'achieved'
                  ? 'border-emerald-700 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-emerald-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: PERFORMANCE_COLORS.achieved }}
                ></div>
                <span className="text-2xl font-bold text-gray-900">{filterCounts.achieved}</span>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">Achieved</div>
                <div className="text-xs text-gray-500">95-100%</div>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedFilter(selectedFilter === 'onTrack' ? null : 'onTrack');
                setSelectedSectorId(null);
                setSelectedIndicatorId(null);
              }}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                selectedFilter === 'onTrack'
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-emerald-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: PERFORMANCE_COLORS.onTrack }}
                ></div>
                <span className="text-2xl font-bold text-gray-900">{filterCounts.onTrack}</span>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">On Track</div>
                <div className="text-xs text-gray-500">85-94%</div>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedFilter(selectedFilter === 'inProgress' ? null : 'inProgress');
                setSelectedSectorId(null);
                setSelectedIndicatorId(null);
              }}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                selectedFilter === 'inProgress'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 bg-white hover:border-yellow-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: PERFORMANCE_COLORS.inProgress }}
                ></div>
                <span className="text-2xl font-bold text-gray-900">{filterCounts.inProgress}</span>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">In Progress</div>
                <div className="text-xs text-gray-500">65-84%</div>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedFilter(selectedFilter === 'weakPerformance' ? null : 'weakPerformance');
                setSelectedSectorId(null);
                setSelectedIndicatorId(null);
              }}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                selectedFilter === 'weakPerformance'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-orange-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: PERFORMANCE_COLORS.weakPerformance }}
                ></div>
                <span className="text-2xl font-bold text-gray-900">{filterCounts.weakPerformance}</span>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">Weak Performance</div>
                <div className="text-xs text-gray-500">50-64%</div>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedFilter(selectedFilter === 'requiresIntervention' ? null : 'requiresIntervention');
                setSelectedSectorId(null);
                setSelectedIndicatorId(null);
              }}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                selectedFilter === 'requiresIntervention'
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-red-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: PERFORMANCE_COLORS.requiresIntervention }}
                ></div>
                <span className="text-2xl font-bold text-gray-900">{filterCounts.requiresIntervention}</span>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">Requires Intervention</div>
                <div className="text-xs text-gray-500">0-49%</div>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedFilter(selectedFilter === 'noData' ? null : 'noData');
                setSelectedSectorId(null);
                setSelectedIndicatorId(null);
              }}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                selectedFilter === 'noData'
                  ? 'border-gray-500 bg-gray-100'
                  : 'border-gray-200 bg-white hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: PERFORMANCE_COLORS.noData }}
                ></div>
                <span className="text-2xl font-bold text-gray-900">{filterCounts.noData}</span>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">No Data</div>
                <div className="text-xs text-gray-500">N/A</div>
              </div>
            </button>
          </div>

          {selectedFilter && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-900">
                  Showing {filteredIndicators.length} indicator{filteredIndicators.length !== 1 ? 's' : ''} in "{selectedFilter === 'achieved' ? 'Achieved' : selectedFilter === 'onTrack' ? 'On Track' : selectedFilter === 'inProgress' ? 'In Progress' : selectedFilter === 'weakPerformance' ? 'Weak Performance' : selectedFilter === 'requiresIntervention' ? 'Requires Intervention' : 'No Data'}" category
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedFilter(null);
                  setSelectedSectorId(null);
                  setSelectedIndicatorId(null);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear Filter
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Sector List or Indicator List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6">
                {selectedFilter && filteredBySector ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Filtered Indicators</h2>
                      <button
                        onClick={() => {
                          setSelectedFilter(null);
                          setSelectedSectorId(null);
                          setSelectedIndicatorId(null);
                        }}
                        className="text-sm text-emerald-600 hover:text-emerald-700"
                      >
                        Clear
                      </button>
                    </div>
                    {filteredBySector.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        No indicators found in this category
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {filteredBySector.map(({ sector, indicators }) => (
                          <div key={sector.id} className="border border-gray-200 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-800 mb-3">{sector.name}</h3>
                            <div className="space-y-2">
                              {indicators.map((indicator) => {
                                const indPerf = getPerformanceCategory(indicator.performance_percentage);
                                return (
                                  <button
                                    key={indicator.id}
                                    onClick={() => {
                                      setSelectedSectorId(sector.id);
                                      setSelectedIndicatorId(indicator.id);
                                      setIndicatorDetail(null);
                                    }}
                                    className={`w-full text-left p-3 border rounded hover:border-emerald-500 hover:bg-emerald-50 transition-all ${
                                      selectedIndicatorId === indicator.id
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-900">{indicator.name}</span>
                                      <div
                                        className="px-2 py-1 rounded text-xs font-semibold text-white"
                                        style={{ backgroundColor: indPerf.color }}
                                      >
                                        {indicator.performance_percentage !== null
                                          ? `${indicator.performance_percentage.toFixed(1)}%`
                                          : 'N/A'}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500">{indPerf.label}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : !selectedSectorId ? (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Sectors</h2>
                    <div className="space-y-3">
                      {indicatorData.sectors.map((sector) => {
                        const perf = getPerformanceCategory(sector.performance_percentage);
                        return (
                          <button
                            key={sector.id}
                            onClick={() => {
                              setSelectedSectorId(sector.id);
                              setSelectedIndicatorId(null);
                              setIndicatorDetail(null);
                            }}
                            className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900">{sector.name}</h3>
                              <div
                                className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                                style={{ backgroundColor: perf.color }}
                              >
                                {sector.performance_percentage !== null
                                  ? `${sector.performance_percentage.toFixed(1)}%`
                                  : 'N/A'}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {perf.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => {
                          setSelectedSectorId(null);
                          setSelectedIndicatorId(null);
                          setIndicatorDetail(null);
                        }}
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        ← Back to Sectors
                      </button>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedSector?.name}</h2>
                    <div className="space-y-4">
                      {/* Indicator Groups */}
                      {selectedSector?.indicator_groups.map((group) => {
                        const groupPerf = getPerformanceCategory(group.performance_percentage);
                        return (
                          <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-gray-800">{group.name}</h3>
                              <div
                                className="px-2 py-1 rounded text-xs font-semibold text-white"
                                style={{ backgroundColor: groupPerf.color }}
                              >
                                {group.performance_percentage !== null
                                  ? `${group.performance_percentage.toFixed(1)}%`
                                  : 'N/A'}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {group.indicators.map((indicator) => {
                                const indPerf = getPerformanceCategory(indicator.performance_percentage);
                                return (
                                  <button
                                    key={indicator.id}
                                    onClick={() => setSelectedIndicatorId(indicator.id)}
                                    className="w-full text-left p-3 border border-gray-200 rounded hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-900">{indicator.name}</span>
                                      <div
                                        className="px-2 py-1 rounded text-xs font-semibold text-white"
                                        style={{ backgroundColor: indPerf.color }}
                                      >
                                        {indicator.performance_percentage !== null
                                          ? `${indicator.performance_percentage.toFixed(1)}%`
                                          : 'N/A'}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500">{indPerf.label}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {/* Ungrouped Indicators */}
                      {selectedSector?.ungrouped_indicators.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-800 mb-3">Other Indicators</h3>
                          <div className="space-y-2">
                            {selectedSector.ungrouped_indicators.map((indicator) => {
                              const indPerf = getPerformanceCategory(indicator.performance_percentage);
                              return (
                                <button
                                  key={indicator.id}
                                  onClick={() => setSelectedIndicatorId(indicator.id)}
                                  className="w-full text-left p-3 border border-gray-200 rounded hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900">{indicator.name}</span>
                                    <div
                                      className="px-2 py-1 rounded text-xs font-semibold text-white"
                                      style={{ backgroundColor: indPerf.color }}
                                    >
                                      {indicator.performance_percentage !== null
                                        ? `${indicator.performance_percentage.toFixed(1)}%`
                                        : 'N/A'}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500">{indPerf.label}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Panel: Indicator Detail */}
            <div className="lg:col-span-2">
              {selectedFilter && !selectedIndicatorId ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <div className="text-gray-500 mb-4">
                    <p className="text-lg font-semibold mb-2">Filter Active: {selectedFilter === 'achieved' ? 'Achieved' : selectedFilter === 'onTrack' ? 'On Track' : selectedFilter === 'inProgress' ? 'In Progress' : selectedFilter === 'weakPerformance' ? 'Weak Performance' : selectedFilter === 'requiresIntervention' ? 'Requires Intervention' : 'No Data'}</p>
                    <p className="text-sm">Click on an indicator from the left panel to view detailed performance</p>
                  </div>
                </div>
              ) : selectedIndicatorId && selectedIndicator ? (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  {loadingIndicatorDetail ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                  ) : indicatorDetail ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Basic Info */}
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{indicatorDetail.indicator.name}</h2>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-semibold text-gray-600">Description</label>
                            <p className="text-gray-900 mt-1">
                              {indicatorDetail.indicator.description || 'No description available'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-600">Unit</label>
                            <p className="text-gray-900 mt-1">{indicatorDetail.indicator.unit || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-600">Responsible Department</label>
                            <p className="text-gray-900 mt-1">{indicatorDetail.indicator.department_name}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Charts */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Year: {year} ዓ.ም ({toGregorianYearFromEthiopian(year)} G.C.)
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setViewMode('yearly')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                viewMode === 'yearly'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Yearly
                            </button>
                            <button
                              onClick={() => setViewMode('quarterly')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                viewMode === 'quarterly'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Quarterly
                            </button>
                          </div>
                        </div>

                        {viewMode === 'yearly' ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart
                              data={indicatorDetail.yearly_data.map((item) => ({
                                ...item,
                                ethiopianYear: toEthiopianYearFromGregorian(item.year),
                                yearLabel: `${toEthiopianYearFromGregorian(item.year)} ዓ.ም`,
                              }))}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="ethiopianYear" 
                                label={{ value: 'Ethiopian Year (ዓ.ም)', position: 'insideBottom', offset: -5 }}
                              />
                              <YAxis yAxisId="left" />
                              <Tooltip 
                                formatter={(value: any, name: string) => [value, name]}
                                labelFormatter={(label) => `Year: ${label} ዓ.ም`}
                              />
                              <Legend />
                              <Bar yAxisId="left" dataKey="target" fill="#3b82f6" name="Target" />
                              <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="achieved"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Achieved"
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        ) : (
                          <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={indicatorDetail.quarterly_data}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="quarter"
                                label={{ value: `Quarters for ${year} ዓ.ም`, position: 'insideBottom', offset: -5 }}
                              />
                              <YAxis yAxisId="left" />
                              <Tooltip 
                                formatter={(value: any, name: string) => [value, name]}
                                labelFormatter={(label) => `${label} - ${year} ዓ.ም`}
                              />
                              <Legend />
                              <Bar yAxisId="left" dataKey="target" fill="#3b82f6" name="Target" />
                              <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="achieved"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Achieved"
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-12">Loading indicator details...</div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center text-gray-500">
                  Select a sector to view indicators, then click on an indicator to see detailed performance
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!data && activeTab === 'dashboard') return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Minister's Dashboard</h1>
            <div className="w-64">
              <YearFilter
                value={year}
                onChange={setYear}
                variant="dropdown"
                showLabel={false}
              />
            </div>
          </div>
          <p className="text-gray-600">
            National planning and performance overview across all State Minister Sectors
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('indicators')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'indicators'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Indicator Performance
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview Dashboard
            </button>
          </div>
        </div>

        {activeTab === 'indicators' ? (
          renderIndicatorPerformanceView()
        ) : (
          <div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Four KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Annual Target</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{data.kpis.total_annual_target.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Achieved Performance</h3>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{data.kpis.total_achieved_performance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Overall Achievement %</h3>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{data.kpis.achievement_percentage.toFixed(1)}%</div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(data.kpis.achievement_percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Indicators Status</h3>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">On Track</span>
                <span className="text-xl font-bold text-green-600">{data.kpis.indicators_on_track}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Lagging</span>
                <span className="text-xl font-bold text-red-600">{data.kpis.indicators_lagging}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sector-wise Performance Comparison Chart (normalized) */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">Sector-wise Performance Comparison</h2>
            <span className="text-sm text-gray-500">Average of indicator % (actual ÷ target × 100)</span>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            {sectorPerformanceData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">No performance data available</div>
            ) : (
              <BarChart data={sectorPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="sector"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  interval={0}
                />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="performance" fill={COLORS.primary} name="Average Performance (%)" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Quarterly Performance Trend by Sector (normalized) */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">Quarterly Performance Trend by Sector</h2>
            <span className="text-sm text-gray-500">Average of quarterly indicator % per sector</span>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            {sectorQuarterTrend.length === 0 || sectorList.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">No quarterly data available</div>
            ) : (
              <LineChart data={sectorQuarterTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${(value as number).toFixed(1)}%`} />
                <Legend />
                {sectorList.map((sectorName, idx) => {
                  const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e', '#2563eb', '#14b8a6'];
                  return (
                    <Line
                      key={sectorName}
                      type="monotone"
                      dataKey={sectorName}
                      stroke={colors[idx % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name={sectorName}
                    />
                  );
                })}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* General Quarterly Performance Trend (normalized) */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">General Quarterly Performance Trend</h2>
            <span className="text-sm text-gray-500">Average of all sector quarterly scores</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            {generalQuarterTrend.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">No quarterly data available</div>
            ) : (
              <LineChart data={generalQuarterTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${(value as number).toFixed(1)}%`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="general"
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Overall Quarterly Average"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Approval Status Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Approval Status Overview</h2>
            {approvalPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={approvalPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {approvalPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 py-12">No approval data available</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Submissions by Stage</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-gray-900">Draft</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{data.approval_stages.draft}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900">Submitted</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{data.approval_stages.submitted}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900">Approved</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">{data.approval_stages.approved}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900">Validated</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">{data.approval_stages.validated}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900">Final Approved</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{data.approval_stages.final_approved}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900">Rejected</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{data.approval_stages.rejected}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sector Summary Cards */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Sector Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.sector_summaries.map((sector) => (
              <div key={sector.sector_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-3">{sector.sector_name}</h3>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Annual Target:</span>
                    <span className="font-medium">{sector.annual_target.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Achieved:</span>
                    <span className="font-medium">{sector.performance_achieved.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress:</span>
                    <span className={`font-semibold ${sector.progress_rate >= 75 ? 'text-green-600' : sector.progress_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {sector.progress_rate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      sector.progress_rate >= 75 ? 'bg-green-500' : sector.progress_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(sector.progress_rate, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Indicators at Risk Table */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Indicators at Risk</h2>
          {data.indicators_at_risk.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No indicators at risk</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicator</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Achieved</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gap</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.indicators_at_risk.map((indicator, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{indicator.indicator_name}</td>
                      <td className="px-4 py-3 text-gray-600">{indicator.sector_name}</td>
                      <td className="px-4 py-3 text-gray-600">{indicator.department_name}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{indicator.target.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{indicator.achieved.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-semibold">{indicator.gap.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${indicator.progress_pct >= 75 ? 'text-green-600' : indicator.progress_pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {indicator.progress_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            indicator.risk_level === 'HIGH'
                              ? 'bg-red-100 text-red-800'
                              : indicator.risk_level === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {indicator.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Late or Rejected Submissions Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Late or Rejected Submissions</h2>
          {data.late_or_rejected.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No late or rejected submissions</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicator</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quarter</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.late_or_rejected.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{item.indicator_name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.sector_name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.department_name}</td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {item.quarter ? `Q${item.quarter}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {item.status}
                          {item.days_late && ` (${item.days_late} days late)`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate" title={item.comment}>
                        {item.comment || '-'}
                      </td>
                    </tr>
                  ))}
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
