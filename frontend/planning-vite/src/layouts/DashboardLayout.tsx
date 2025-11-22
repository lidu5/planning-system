import type { PropsWithChildren } from 'react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/moa logo final.jpg';

export default function DashboardLayout({ children }: PropsWithChildren) {
  const { user, logout } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isSuper = !!user?.is_superuser;
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Icon component for menu items
  const Icon = ({ name }: { name: string }) => {
    const commonProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'currentColor' } as any;

    switch (name) {
      case 'Home':
        return <svg {...commonProps}><path d="M12 3 2 12h3v8h6v-5h2v5h6v-8h3L12 3Z"/></svg>;
      case 'Users':
        return <svg {...commonProps}><path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-4 6c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z"/></svg>;
      case 'Sectors':
        return <svg {...commonProps}><path d="M3 10h8V3H3v7Zm10 11h8v-7h-8v7ZM3 21h8v-7H3v7Zm10-11h8V3h-8v7Z"/></svg>;
      case 'Departments':
        return <svg {...commonProps}><path d="M3 3h18v4H3V3Zm0 6h18v4H3V9Zm0 6h18v4H3v-4Z"/></svg>;
      case 'Indicators':
        return <svg {...commonProps}><path d="M3 13h4v8H3v-8Zm7-6h4v14h-4V7Zm7 3h4v11h-4V10Z"/></svg>;
      case 'Annual Plans':
        return <svg {...commonProps}><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5Z"/></svg>;
      case 'Entry Periods':
        return <svg {...commonProps}><path d="M7 2h10a2 2 0 0 1 2 2v3H5V4a2 2 0 0 1 2-2Zm-2 7h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Zm3 3v2h8v-2H8Z"/></svg>;
      case 'Quarterly Breakdown':
        return <svg {...commonProps}><path d="M3 5h18v2H3V5Zm0 6h10v2H3v-2Zm0 6h14v2H3v-2Z"/></svg>;
      case 'Quarterly Performance':
        return <svg {...commonProps}><path d="M4 19h16v2H4v-2Zm2-8h3v6H6v-6Zm5-4h3v10h-3V7Zm5 2h3v8h-3V9Z"/></svg>;
      case 'Reviews & Approvals':
        return <svg {...commonProps}><path d="M3 3h18v14H7l-4 4V3Zm4 6h10V7H7v2Zm0 4h6v-2H7v2Z"/></svg>;
      case 'Validations':
        return <svg {...commonProps}><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z"/></svg>;
      default:
        return <svg {...commonProps}><circle cx="12" cy="12" r="9"/></svg>;
    }
  };

  // Menu items based on role
  const menus = useMemo(() => {
    const common = [{ label: 'Home', to: '/' }];
    const superMenus = [
      { label: 'Users', to: '/users' },
      { label: 'Sectors', to: '/sectors' },
      { label: 'Departments', to: '/departments' },
      { label: 'Indicators', to: '/indicators' },
      { label: 'Annual Plans', to: '/annual-plans' },
      { label: 'Entry Periods', to: '/entry-periods' },
    ];
    const advisorMenus = [
      { label: 'Quarterly Breakdown', to: '/quarterly-breakdowns' },
      { label: 'Quarterly Performance', to: '/performances' },
    ];
    const ministerMenus = [
      { label: 'Quarterly Breakdown', to: '/quarterly-breakdowns' },
      { label: 'Quarterly Performance', to: '/performances' },
      { label: 'Reviews & Approvals', to: '/reviews' },
    ];
    const strategicMenus = [
      { label: 'Validations', to: '/validations' },
    ];
    const executiveMenus = [
      { label: 'Final Approvals', to: '/final-approvals' },
    ];
    const ministerViewMenus = [
      { label: 'Final Approved', to: '/minister-view' },
    ];

    const out = [...common];
    if (isSuper) out.push(...superMenus);
    if (role === 'ADVISOR') out.push(...advisorMenus);
    if (role === 'STATE_MINISTER') out.push(...ministerMenus);
    if (role === 'STRATEGIC_STAFF') out.push(...strategicMenus);
    if (role === 'EXECUTIVE') out.push(...executiveMenus);
    if (role === 'MINISTER_VIEW') out.push(...ministerViewMenus);
    // For MINISTER_VIEW we currently show only common/home until their pages are added
    return out;
  }, [role, isSuper]);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} hidden md:flex flex-col bg-green-900 text-white transition-all duration-200`}
      >
        <div className="h-14 px-4 flex items-center font-semibold">Dashboard</div>
        <nav className={`flex-1 ${collapsed ? 'px-1' : 'px-2'} py-2 space-y-1`}>
          {menus.map((menu) => {
            const active = location.pathname === menu.to;
            const base = 'flex items-center gap-3 px-3 py-2 rounded transition-colors';
            const inactive = 'text-white/90 hover:bg-[#388E3C]';
            const activeCls = 'bg-white text-green-700';
            return (
              <Link
                key={menu.to}
                to={menu.to}
                className={`${base} ${active ? activeCls : inactive}`}
                title={menu.label}
              >
                <span className="shrink-0">
                  <Icon name={menu.label} />
                </span>
                {!collapsed && <span className="truncate">{menu.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-3 border-t border-white/10 text-sm text-white/90 ${collapsed ? 'px-2' : ''}`}>
          {!collapsed && (
            <div className="mb-2">
              {user?.username} {isSuper ? '(Superuser)' : ''}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="px-3 py-2 rounded bg-white text-green-700 hover:bg-gray-100 transition"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? '>>' : '<<'}
            </button>
            {!collapsed && (
              <button
                onClick={logout}
                className="flex-1 px-3 py-2 rounded bg-white text-green-700 hover:bg-gray-100 transition"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-4 md:px-6">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
              <h1 className="text-lg md:text-xl font-semibold text-gray-800">
                Beyond Production! <span className="text-blue-600">ከማምረት በላይ!</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="px-2 py-1 rounded border text-sm"
              >
                {collapsed ? 'Menu' : 'Close'}
              </button>
              <span className="text-sm text-gray-600">{user?.username}</span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
