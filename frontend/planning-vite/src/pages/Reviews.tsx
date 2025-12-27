import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getCurrentEthiopianDate } from '../lib/ethiopian';
import {
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Calendar,
  Building,
  TrendingUp,
  BarChart3,
  Clock,
  AlertCircle,
  ChevronRight,
  Download,
  RefreshCw,
  FileText,
  Target,
  Award,
  Eye
} from 'lucide-react';

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
  variance_description?: string;
};

export default function Reviews() {
  const { user } = useAuth();
  const thisYearEC = getCurrentEthiopianDate()[0];
  const [year, setYear] = useState<number | null>(thisYearEC);
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [perfs, setPerfs] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<number | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedView, setExpandedView] = useState<'breakdowns' | 'performance' | null>(null);
  const [editBreakdown, setEditBreakdown] = useState<{
    open: boolean;
    item: Breakdown | null;
    q1: string;
    q2: string;
    q3: string;
    q4: string;
  }>({ open: false, item: null, q1: '', q2: '', q3: '', q4: '' });
  const [editPerf, setEditPerf] = useState<{
    open: boolean;
    item: Performance | null;
    value: string;
  }>({ open: false, item: null, value: '' });

  const isMinister = (user?.role || '').toUpperCase() === 'STATE_MINISTER';

  const loadData = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [plansRes, bRes, pRes] = await Promise.all([
        api.get('/api/annual-plans/'),
        api.get('/api/breakdowns/'),
        api.get('/api/performances/'),
      ]);
      setPlans(plansRes.data || []);
      setBreakdowns(bRes.data || []);
      setPerfs(pRes.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const toGregorianYearFromEthiopian = (etYear: number) => etYear + 7;

  const filterItems = <T extends { plan: number; status: string }>(list: T[]) => {
    const submitted = list.filter((item) => (item.status || '').toUpperCase() === 'SUBMITTED');

    const byYear = submitted.filter((item) => {
      if (!year) return true;
      const p = planById[item.plan];
      return p?.year === toGregorianYearFromEthiopian(year);
    });

    const byDept = byYear.filter((item) => {
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

  // Statistics
  const stats = useMemo(() => {
    const totalPending = filteredBreakdowns.length + filteredPerfs.length;
    const approvedBreakdowns = breakdowns.filter(b => b.status.toUpperCase() === 'APPROVED').length;
    const approvedPerfs = perfs.filter(p => p.status.toUpperCase() === 'APPROVED').length;
    const totalApproved = approvedBreakdowns + approvedPerfs;
    
    return {
      pendingBreakdowns: filteredBreakdowns.length,
      pendingPerformance: filteredPerfs.length,
      totalPending,
      totalApproved,
      approvalRate: totalPending + totalApproved > 0 
        ? Math.round((totalApproved / (totalPending + totalApproved)) * 100) 
        : 0
    };
  }, [filteredBreakdowns, filteredPerfs, breakdowns, perfs]);

  const openEditBreakdown = (b: Breakdown) => {
    setEditBreakdown({
      open: true,
      item: b,
      q1: b.q1 ?? '',
      q2: b.q2 ?? '',
      q3: b.q3 ?? '',
      q4: b.q4 ?? '',
    });
  };

  const saveEditBreakdown = async () => {
    if (!editBreakdown.item) return;
    try {
      await api.put(`/api/breakdowns/${editBreakdown.item.id}/`, {
        plan: editBreakdown.item.plan,
        q1: editBreakdown.q1,
        q2: editBreakdown.q2,
        q3: editBreakdown.q3,
        q4: editBreakdown.q4,
        status: editBreakdown.item.status,
      });
      setEditBreakdown({ open: false, item: null, q1: '', q2: '', q3: '', q4: '' });
      await loadData(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Update failed');
    }
  };

  const openEditPerf = (p: Performance) => {
    setEditPerf({ open: true, item: p, value: p.value });
  };

  const saveEditPerf = async () => {
    if (!editPerf.item) return;
    try {
      await api.put(`/api/performances/${editPerf.item.id}/`, {
        plan: editPerf.item.plan,
        quarter: editPerf.item.quarter,
        value: editPerf.value,
        status: editPerf.item.status,
      });
      setEditPerf({ open: false, item: null, value: '' });
      await loadData(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Update failed');
    }
  };

  const approveBreakdown = async (b: Breakdown) => {
    if (!confirm(`Approve quarterly breakdown for this indicator?`)) return;
    try {
      await api.post(`/api/breakdowns/${b.id}/approve/`);
      await loadData(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Approval failed');
    }
  };

  const rejectBreakdown = async (b: Breakdown) => {
    const comment = prompt('Please provide a reason for rejection (optional):', '') || '';
    if (comment === null) return; // User cancelled
    
    if (!confirm(`Reject this quarterly breakdown?${comment ? `\nReason: ${comment}` : ''}`)) return;
    
    try {
      await api.post(`/api/breakdowns/${b.id}/reject/`, { comment });
      await loadData(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Rejection failed');
    }
  };

  const approvePerf = async (pr: Performance) => {
    if (!confirm(`Approve Q${pr.quarter} performance report for this indicator?`)) return;
    try {
      await api.post(`/api/performances/${pr.id}/approve/`);
      await loadData(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Approval failed');
    }
  };

  const rejectPerf = async (pr: Performance) => {
    const comment = prompt('Please provide a reason for rejection (optional):', '') || '';
    if (comment === null) return;
    
    if (!confirm(`Reject Q${pr.quarter} performance report?${comment ? `\nReason: ${comment}` : ''}`)) return;
    
    try {
      await api.post(`/api/performances/${pr.id}/reject/`, { comment });
      await loadData(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Rejection failed');
    }
  };

  const resetFilters = () => {
    setYear(thisYearEC);
    setQuery('');
    setDeptFilter('ALL');
  };

  const hasActiveFilters = year !== thisYearEC || query || deptFilter !== 'ALL';

  const submitValidatedToStrategic = async () => {
    if (!isMinister) return;

    const approvedBreakdowns = breakdowns.filter(
      (b) => (b.status || '').toUpperCase() === 'APPROVED'
    );
    const approvedPerfs = perfs.filter(
      (p) => (p.status || '').toUpperCase() === 'APPROVED'
    );

    if (approvedBreakdowns.length === 0 && approvedPerfs.length === 0) {
      alert('There are no approved items to submit to Strategic Affairs Staff.');
      return;
    }

    if (
      !confirm(
        `This will send all approved indicators (${approvedBreakdowns.length} breakdowns and ${approvedPerfs.length} performance reports) to Strategic Affairs Staff. Do you want to continue?`
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/api/reviews/submit-to-strategic/', {
        breakdown_ids: approvedBreakdowns.map((b) => b.id),
        performance_ids: approvedPerfs.map((p) => p.id),
      });

      await loadData(true);
      alert('Approved indicators have been submitted to Strategic Affairs Staff.');
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || 'Failed to submit approved indicators to Strategic Affairs Staff'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Review & Approvals</h1>
              <p className="text-gray-600 mt-2">
                Review and approve quarterly breakdowns and performance reports from departments
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              
              <button className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 shadow-sm">
                <Download className="w-5 h-5" />
                Export
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Breakdowns</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingBreakdowns}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Awaiting approval
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Performance</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingPerformance}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Quarterly reports
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pending</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stats.totalPending}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Items awaiting review
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stats.approvalRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Of all submissions
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by indicator, department, or sector..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 shadow-sm"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 shadow-sm"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-white bg-emerald-600 rounded-full">
                      {[year !== thisYearEC, query, deptFilter !== 'ALL'].filter(Boolean).length}
                    </span>
                  )}
                </button>
                
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200"
                  >
                    Reset All
                  </button>
                )}
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Filter Submissions</h3>
                  <p className="text-sm text-gray-600">Refine your view by selecting specific criteria</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Year Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline w-4 h-4 mr-1" />
                      Year
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={2000}
                        max={2100}
                        value={year ?? ''}
                        onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter Ethiopian year"
                      />
                    </div>
                    {year !== thisYearEC && year !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          Year: {year} ዓ.ም
                        </span>
                        <button
                          onClick={() => setYear(thisYearEC)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Department Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="inline w-4 h-4 mr-1" />
                      Department
                    </label>
                    <div className="relative">
                      <select
                        value={deptFilter === 'ALL' ? 'ALL' : String(deptFilter)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDeptFilter(v === 'ALL' ? 'ALL' : Number(v));
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                      >
                        <option value="ALL">All Departments</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                      </div>
                    </div>
                    {deptFilter !== 'ALL' && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          {departments.find(d => d.id === deptFilter)?.name}
                        </span>
                        <button
                          onClick={() => setDeptFilter('ALL')}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Year Filters */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Year Select
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setYear(thisYearEC)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          year === thisYearEC
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Current ({thisYearEC})
                      </button>
                      <button
                        onClick={() => setYear(thisYearEC - 1)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          year === thisYearEC - 1
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Last Year ({thisYearEC - 1})
                      </button>
                      <button
                        onClick={() => setYear(null)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          year === null
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All Years
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-700">Error</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quarterly Breakdowns Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Quarterly Breakdowns</h3>
                    <p className="text-sm text-blue-600">
                      {filteredBreakdowns.length} pending • {breakdowns.filter(b => b.status.toUpperCase() === 'APPROVED').length} approved
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedView(expandedView === 'breakdowns' ? null : 'breakdowns')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  {expandedView === 'breakdowns' ? 'Collapse' : 'Expand'}
                  <ChevronRight className={`w-4 h-4 transition-transform ${expandedView === 'breakdowns' ? 'rotate-90' : ''}`} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">Loading breakdowns...</p>
              </div>
            ) : filteredBreakdowns.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No pending breakdowns</p>
                <p className="text-gray-500 text-sm mt-1">
                  All quarterly breakdowns have been reviewed or none are submitted yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicator</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Target</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quarterly Allocation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBreakdowns.map((b) => {
                      const p = planById[b.plan];
                      const quarters = [
                        { label: 'Q1', value: b.q1 },
                        { label: 'Q2', value: b.q2 },
                        { label: 'Q3', value: b.q3 },
                        { label: 'Q4', value: b.q4 },
                      ];
                      
                      return (
                        <tr key={b.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{p?.indicator_name}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    {p?.department_name}
                                  </span>
                                  {p?.indicator_unit && (
                                    <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                      Unit: {p.indicator_unit}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-lg font-bold text-emerald-700">{p?.target}</div>
                            <div className="text-xs text-gray-500 mt-1">Annual target</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {quarters.map((q, idx) => (
                                <div key={idx} className="text-center">
                                  <div className="text-xs text-gray-500">{q.label}</div>
                                  <div className={`text-sm font-semibold ${q.value ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {q.value || '—'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => approveBreakdown(b)}
                                disabled={!isMinister}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                                  isMinister
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => rejectBreakdown(b)}
                                disabled={!isMinister}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                                  isMinister
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                              {isMinister && (
                                <button
                                  onClick={() => openEditBreakdown(b)}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                >
                                  <Eye className="w-4 h-4" />
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quarterly Performance Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Quarterly Performance</h3>
                    <p className="text-sm text-emerald-600">
                      {filteredPerfs.length} pending • {perfs.filter(p => p.status.toUpperCase() === 'APPROVED').length} approved
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedView(expandedView === 'performance' ? null : 'performance')}
                  className="text-sm text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
                >
                  {expandedView === 'performance' ? 'Collapse' : 'Expand'}
                  <ChevronRight className={`w-4 h-4 transition-transform ${expandedView === 'performance' ? 'rotate-90' : ''}`} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-gray-300 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">Loading performance reports...</p>
              </div>
            ) : filteredPerfs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No pending performance reports</p>
                <p className="text-gray-500 text-sm mt-1">
                  All performance reports have been reviewed or none are submitted yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicator</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quarter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance Explanation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPerfs.map((pr) => {
                      const p = planById[pr.plan];
                      const targetValue = parseFloat(p?.target || '0');
                      const reportedValue = parseFloat(pr.value || '0');
                      const achievementRate = targetValue > 0 ? (reportedValue / targetValue) * 100 : 0;
                      
                      return (
                        <tr key={pr.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{p?.indicator_name}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    {p?.department_name}
                                  </span>
                                </div>
                                {p?.indicator_unit && (
                                  <span className="inline-block mt-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                                    Unit: {p.indicator_unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              Quarter {pr.quarter}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Annual target: {p?.target}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-lg font-bold text-gray-900">{pr.value}</div>
                              {!isNaN(achievementRate) && (
                                <div className={`text-sm font-medium mt-1 ${
                                  achievementRate >= 100 ? 'text-emerald-600' :
                                  achievementRate >= 80 ? 'text-amber-600' :
                                  'text-red-600'
                                }`}>
                                  {achievementRate.toFixed(1)}% of target
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 whitespace-pre-line max-w-xs">
                              {pr.variance_description && pr.variance_description.trim()
                                ? pr.variance_description
                                : '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => approvePerf(pr)}
                                disabled={!isMinister}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                                  isMinister
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => rejectPerf(pr)}
                                disabled={!isMinister}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                                  isMinister
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </div>
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

        {/* Edit Breakdown Modal */}
        {isMinister && editBreakdown.open && editBreakdown.item && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Quarterly Plan</h2>
              <div className="grid grid-cols-4 gap-3">
                {[{ label: 'Q1', key: 'q1' }, { label: 'Q2', key: 'q2' }, { label: 'Q3', key: 'q3' }, { label: 'Q4', key: 'q4' }].map(({ label, key }) => (
                  <div key={key}>
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <input
                      type="number"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      value={(editBreakdown as any)[key]}
                      onChange={(e) =>
                        setEditBreakdown((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditBreakdown({ open: false, item: null, q1: '', q2: '', q3: '', q4: '' })}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditBreakdown}
                  className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Performance Modal */}
        {isMinister && editPerf.open && editPerf.item && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Quarterly Performance</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reported Value</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={editPerf.value}
                  onChange={(e) => setEditPerf((prev) => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditPerf({ open: false, item: null, value: '' })}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditPerf}
                  className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Footer */}
        <div className="mt-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing {filteredBreakdowns.length + filteredPerfs.length} pending items
              {hasActiveFilters && ' (filtered)'}
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              {!isMinister && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Only State Ministers can approve and submit to Strategic Affairs Staff
                </div>
              )}
              {isMinister && (
                <button
                  type="button"
                  onClick={submitValidatedToStrategic}
                  disabled={
                    submitting ||
                    (!breakdowns.some((b) => (b.status || '').toUpperCase() === 'APPROVED') &&
                      !perfs.some((p) => (p.status || '').toUpperCase() === 'APPROVED'))
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors duration-200 ${
                    submitting ||
                    (!breakdowns.some((b) => (b.status || '').toUpperCase() === 'APPROVED') &&
                      !perfs.some((p) => (p.status || '').toUpperCase() === 'APPROVED'))
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  {submitting ? 'Submitting to Strategic Affairs...' : 'Submit validated to Strategic Affairs'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}