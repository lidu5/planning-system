import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import api from "../lib/api";
import YearFilter from "../components/YearFilter";
import {
  getCurrentEthiopianDate,
  toGregorianYearFromEthiopian,
} from "../lib/ethiopian";
import type { IndicatorGroup, Indicator } from "../types/indicator";

/* =======================
   TYPES
======================= */

type DashboardIndicatorGroup = IndicatorGroup & {
  level?: number;
  performance_percentage?: number | null;
  annual_target_aggregate?: number | null;
  performance_aggregate?: number | null;
  quarterly_breakdown_aggregate?: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  } | null;
  children?: DashboardIndicatorGroup[];
  indicators?: Indicator[];
};

type StateMinisterData = {
  sector: { id: number; name: string };
  root_groups: DashboardIndicatorGroup[];
  ungrouped_indicators: Indicator[];
  kpis: {
    total_indicators: number;
    overall_performance: number | null;
    groups_on_track: number;
    groups_lagging: number;
  };
  department_performance: Array<{
    department_id: number;
    department_name: string;
    average_performance: number;
    total_indicators: number;
  }>;
  quarterly_trends: Array<{
    quarter: string;
    department_name: string;
    performance_percentage: number;
  }>;
};

/* =======================
   CONSTANTS
======================= */

const PERFORMANCE_COLORS = {
  achieved: "#10b981",
  onTrack: "#3b82f6",
  inProgress: "#f59e0b",
  weakPerformance: "#ef4444",
  requiresIntervention: "#dc2626",
  noData: "#6b7280",
};

/* =======================
   COMPONENT
======================= */

export default function StateMinisterDashboard() {
  const ethDate = getCurrentEthiopianDate();
  const currentYear =
    Array.isArray(ethDate) && typeof ethDate[0] === "number"
      ? ethDate[0]
      : new Date().getFullYear() - 7;

  const [year, setYear] = useState<number>(currentYear);
  const [data, setData] = useState<StateMinisterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] =
    useState<StateMinisterData["department_performance"][0] | null>(null);
  const [activeTab, setActiveTab] =
    useState<"indicators" | "dashboard">("indicators");
  const [selectedGroup, setSelectedGroup] = useState<DashboardIndicatorGroup | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);

  /* =======================
     HELPERS
  ======================= */

  const getPerformanceCategory = (percentage: number | null) => {
    if (percentage === null || isNaN(percentage))
      return { label: "No Data", color: PERFORMANCE_COLORS.noData };
    if (percentage >= 95)
      return { label: "Achieved", color: PERFORMANCE_COLORS.achieved };
    if (percentage >= 85)
      return { label: "On Track", color: PERFORMANCE_COLORS.onTrack };
    if (percentage >= 65)
      return { label: "In Progress", color: PERFORMANCE_COLORS.inProgress };
    if (percentage >= 50)
      return { label: "Weak", color: PERFORMANCE_COLORS.weakPerformance };
    return {
      label: "Critical",
      color: PERFORMANCE_COLORS.requiresIntervention,
    };
  };

  /* =======================
     FETCH DATA
  ======================= */

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(
          `/api/state-minister-dashboard/?year=${toGregorianYearFromEthiopian(
            year
          )}`
        );
        setData(response.data);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail || "Failed to load dashboard data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year]);

  /* =======================
     LOADING / ERROR
  ======================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  /* =======================
     RENDER
  ======================= */

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row justify-between gap-4">
          <h1 className="text-3xl font-bold">
            State Minister Dashboard
          </h1>

          <div className="w-64">
            <YearFilter
              value={year}
              onChange={setYear}
              variant="dropdown"
              showLabel={false}
            />
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          {data?.sector?.name || "Sector"} Performance Overview
        </p>

        {/* TABS */}
        <div className="mb-6 border-b flex gap-6">
          <button
            onClick={() => setActiveTab("indicators")}
            className={`pb-3 font-semibold ${
              activeTab === "indicators"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-gray-500"
            }`}
          >
            Indicator Performance
          </button>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`pb-3 font-semibold ${
              activeTab === "dashboard"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-gray-500"
            }`}
          >
            Overview Dashboard
          </button>
        </div>

        {/* =======================
           INDICATOR TAB
        ======================= */}
        {activeTab === "indicators" && (
          <>
            {!selectedDepartment ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data?.department_performance.map((dept) => {
                  const perf = getPerformanceCategory(
                    dept.average_performance
                  );

                  return (
                    <div
                      key={dept.department_id}
                      onClick={() => setSelectedDepartment(dept)}
                      className="bg-white p-6 rounded-xl shadow hover:shadow-lg cursor-pointer transition"
                    >
                      <div className="flex justify-between mb-2">
                        <h3 className="font-semibold">
                          {dept.department_name}
                        </h3>
                        <span
                          className="px-3 py-1 rounded-full text-white text-sm"
                          style={{ backgroundColor: perf.color }}
                        >
                          {dept.average_performance.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {dept.total_indicators} Indicators
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                {/* Back button */}
                <button
                  onClick={() => {
                    setSelectedDepartment(null);
                    setSelectedGroup(null);
                    setSelectedIndicator(null);
                  }}
                  className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  ← Back to Lead Executives
                </button>

                {/* Department Details */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                      {selectedDepartment.department_name}
                    </h2>
                    <span
                      className="px-4 py-2 rounded-full text-white font-semibold"
                      style={{ backgroundColor: getPerformanceCategory(selectedDepartment.average_performance).color }}
                    >
                      {selectedDepartment.average_performance.toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedDepartment.average_performance.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Average Performance</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedDepartment.total_indicators}
                      </div>
                      <div className="text-sm text-gray-600">Total Indicators</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {getPerformanceCategory(selectedDepartment.average_performance).label}
                      </div>
                      <div className="text-sm text-gray-600">Performance Status</div>
                    </div>
                  </div>

                  {/* Selected Indicator Detail View */}
                  {selectedIndicator && (
                    <div className="mb-6 p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedIndicator.name}</h3>
                          <div className="text-sm text-gray-600 mb-2">
                            Target: {selectedIndicator.target.toLocaleString()} | 
                            Achieved: {selectedIndicator.achieved.toLocaleString()} {selectedIndicator.unit}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedIndicator(null)}
                          className="text-gray-500 hover:text-gray-700 text-xl"
                        >
                          ×
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-lg font-bold text-emerald-600">
                            {selectedIndicator.performance_percentage !== null
                              ? `${selectedIndicator.performance_percentage.toFixed(1)}%`
                              : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-600">Performance</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            {selectedIndicator.target.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Target</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-lg font-bold text-gray-600">
                            {selectedIndicator.achieved.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Achieved</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selected Group Detail View */}
                  {selectedGroup && (
                    <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedGroup.name}</h3>
                          <div className="text-sm text-gray-600">
                            Level {selectedGroup.level} Group
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedGroup(null)}
                          className="text-gray-500 hover:text-gray-700 text-xl"
                        >
                          ×
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-lg font-bold text-emerald-600">
                            {selectedGroup.performance_percentage !== null && selectedGroup.performance_percentage !== undefined
                              ? `${selectedGroup.performance_percentage.toFixed(1)}%`
                              : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-600">Performance</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            {selectedGroup.annual_target_aggregate?.toLocaleString() || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-600">Target Aggregate</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-lg font-bold text-gray-600">
                            {selectedGroup.performance_aggregate?.toLocaleString() || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-600">Performance Aggregate</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hierarchical Groups Display */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Indicator Groups</h3>
                    {data?.root_groups?.filter((group: DashboardIndicatorGroup) => group.level === 0).map((group: DashboardIndicatorGroup) => {
                      const perf = getPerformanceCategory(group.performance_percentage ?? null);
                      return (
                        <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                          <div 
                            className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                            onClick={() => setSelectedGroup(group)}
                          >
                            <h4 className="font-semibold text-gray-900">{group.name}</h4>
                            <div
                              className="px-3 py-1 rounded text-sm font-semibold text-white"
                              style={{ backgroundColor: perf.color }}
                            >
                              {group.performance_percentage != null
                                ? `${group.performance_percentage.toFixed(1)}%`
                                : 'N/A'}
                            </div>
                          </div>
                          
                          {/* Level 1 Groups */}
                          {group.children?.filter((child: DashboardIndicatorGroup) => child.level === 1).map((level1Group: DashboardIndicatorGroup) => {
                            const level1Perf = getPerformanceCategory(level1Group.performance_percentage ?? null);
                            return (
                              <div key={level1Group.id} className="ml-4 mt-3 border-l-2 border-gray-200 pl-4">
                                <div 
                                  className="flex items-center justify-between mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                  onClick={() => setSelectedGroup(level1Group)}
                                >
                                  <h5 className="font-medium text-gray-800">{level1Group.name}</h5>
                                  <div
                                    className="px-2 py-1 rounded text-xs font-semibold text-white"
                                    style={{ backgroundColor: level1Perf.color }}
                                  >
                                    {level1Group.performance_percentage != null
                                      ? `${level1Group.performance_percentage.toFixed(1)}%`
                                      : 'N/A'}
                                  </div>
                                </div>
                                
                                {/* Level 2 Groups */}
                                {level1Group.children?.filter((child: DashboardIndicatorGroup) => child.level === 2).map((level2Group: DashboardIndicatorGroup) => {
                                  const level2Perf = getPerformanceCategory(level2Group.performance_percentage ?? null);
                                  return (
                                    <div key={level2Group.id} className="ml-4 mt-2 border-l-2 border-gray-200 pl-4">
                                      <div 
                                        className="flex items-center justify-between mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                        onClick={() => setSelectedGroup(level2Group)}
                                      >
                                        <h6 className="font-medium text-gray-700 text-sm">{level2Group.name}</h6>
                                        <div
                                          className="px-2 py-1 rounded text-xs font-semibold text-white"
                                          style={{ backgroundColor: level2Perf.color }}
                                        >
                                          {level2Group.performance_percentage != null
                                            ? `${level2Group.performance_percentage.toFixed(1)}%`
                                            : 'N/A'}
                                        </div>
                                      </div>
                                      
                                      {/* Leaf Indicators */}
                                      {level2Group.indicators?.map((indicator: Indicator) => {
                                        const indicatorPerf = getPerformanceCategory(indicator.performance_percentage ?? null);
                                        return (
                                          <div
                                            key={indicator.id}
                                            className="ml-4 mt-2 p-3 bg-gray-50 rounded border border-gray-200 cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                                            onClick={() => setSelectedIndicator(indicator)}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm text-gray-900 font-medium">{indicator.name}</span>
                                              <div
                                                className="px-2 py-1 rounded text-xs font-semibold text-white"
                                                style={{ backgroundColor: indicatorPerf.color }}
                                              >
                                                {indicator.performance_percentage !== null
                                                  ? `${indicator.performance_percentage.toFixed(1)}%`
                                                  : 'N/A'}
                                              </div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                              Target: {indicator.target.toLocaleString()} | 
                                              Achieved: {indicator.achieved.toLocaleString()} {indicator.unit}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Ungrouped Indicators */}
                  {data?.ungrouped_indicators && data.ungrouped_indicators.length > 0 && (
                    <div className="mt-8 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Other Indicators</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.ungrouped_indicators.map((indicator: Indicator) => {
                          const indicatorPerf = getPerformanceCategory(indicator.performance_percentage ?? null);
                          return (
                            <div
                              key={indicator.id}
                              className="p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                              onClick={() => setSelectedIndicator(indicator)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-900 font-medium">{indicator.name}</span>
                                <div
                                  className="px-2 py-1 rounded text-xs font-semibold text-white"
                                  style={{ backgroundColor: indicatorPerf.color }}
                                >
                                  {indicator.performance_percentage !== null
                                    ? `${indicator.performance_percentage.toFixed(1)}%`
                                    : 'N/A'}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                Target: {indicator.target.toLocaleString()} | 
                                Achieved: {indicator.achieved.toLocaleString()} {indicator.unit}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* =======================
           DASHBOARD TAB
        ======================= */}
        {activeTab === "dashboard" && (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <KpiCard
                title="Total Indicators"
                value={data?.kpis.total_indicators || 0}
              />
              <KpiCard
                title="Average Performance"
                value={
                  data?.kpis.overall_performance !== null
                    ? `${data?.kpis.overall_performance?.toFixed(1)}%`
                    : "N/A"
                }
              />
              <KpiCard
                title="Groups On Track"
                value={data?.kpis.groups_on_track || 0}
              />
            </div>

            {/* DEPARTMENT CHART */}
            <div className="bg-white p-6 rounded-xl shadow">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                  data={data?.department_performance.map((d) => ({
                    name: d.department_name,
                    performance: d.average_performance,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="performance"
                    fill="#10b981"
                    name="Performance %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =======================
   SMALL KPI COMPONENT
======================= */

function KpiCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
