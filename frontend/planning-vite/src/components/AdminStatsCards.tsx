import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import api from '../lib/api';

type Stats = {
  total_indicators: number;
  total_annual_plans: number;
  total_sectors: number;
  total_users: number;
};

export default function AdminStatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/admin-stats/');
        setStats(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Failed to load stats');
      }
    })();
  }, []);

  const Card = ({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) => (
    <div className="rounded-xl bg-white shadow p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
    </div>
  );

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!stats) return <div className="text-sm">Loading stats...</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card label="Total Indicators" value={stats.total_indicators} icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M3 13h4v8H3v-8Zm7-6h4v14h-4V7Zm7 3h4v11h-4V10Z" />
        </svg>
      } />
      <Card label="Total Annual Plans" value={stats.total_annual_plans} icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5Z" />
        </svg>
      } />
      <Card label="Total Sectors" value={stats.total_sectors} icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M3 10h8V3H3v7Zm10 11h8v-7h-8v7ZM3 21h8v-7H3v7Zm10-11h8V3h-8v7Z" />
        </svg>
      } />
      <Card label="Total Users" value={stats.total_users} icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-4 6c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" />
        </svg>
      } />
    </div>
  );
}
