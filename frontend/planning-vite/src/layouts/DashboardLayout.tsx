import type { PropsWithChildren } from 'react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/moa planinig logo.png';

// Move Icon component outside for better performance
const MenuIcon = ({ name, active }: { name: string; active?: boolean }) => {
  const color = active ? 'text-green-700' : 'text-white/90';
  
  switch (name) {
    case 'Home':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3 2 12h3v8h6v-5h2v5h6v-8h3L12 3Z"/>
        </svg>
      );
    case 'Users':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-4 6c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z"/>
        </svg>
      );
    case 'Sectors':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 10h8V3H3v7Zm10 11h8v-7h-8v7ZM3 21h8v-7H3v7Zm10-11h8V3h-8v7Z"/>
        </svg>
      );
    case 'Departments':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h18v4H3V3Zm0 6h18v4H3V9Zm0 6h18v4H3v-4Z"/>
        </svg>
      );
    case 'Indicators':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 13h4v8H3v-8Zm7-6h4v14h-4V7Zm7 3h4v11h-4V10Z"/>
        </svg>
      );
    case 'Annual Plans':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5Z"/>
        </svg>
      );
    case 'Entry Periods':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 2h10a2 2 0 0 1 2 2v3H5V4a2 2 0 0 1 2-2Zm-2 7h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Zm3 3v2h8v-2H8Z"/>
        </svg>
      );
    case 'Quarterly Breakdown':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 5h18v2H3V5Zm0 6h10v2H3v-2Zm0 6h14v2H3v-2Z"/>
        </svg>
      );
    case 'Quarterly Performance':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 19h16v2H4v-2Zm2-8h3v6H6v-6Zm5-4h3v10h-3V7Zm5 2h3v8h-3V9Z"/>
        </svg>
      );
    case 'State Minister Dashboard':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10-8h8V3h-8v10Zm0 8h8v-6h-8v6Z"/>
        </svg>
      );
    case 'Reviews & Approvals':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h18v14H7l-4 4V3Zm4 6h10V7H7v2Zm0 4h6v-2H7v2Z"/>
        </svg>
      );
    case 'Validations':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z"/>
        </svg>
      );
    case 'Activity Log':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 4h14v2H5V4Zm0 5h9v2H5V9Zm0 5h14v2H5v-2Z"/>
        </svg>
      );
    case 'Profile':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      );
    case 'Minister View':
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      );
    default:
      return (
        <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"/>
        </svg>
      );
  }
};

// Mobile menu component
const MobileMenu = ({ 
  menus, 
  isOpen, 
  onClose 
}: { 
  menus: Array<{label: string; to: string}>;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const location = useLocation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed left-0 top-0 h-full w-64 bg-green-900 text-white shadow-xl">
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {menus.map((menu) => {
            const active = location.pathname === menu.to;
            return (
              <Link
                key={menu.to}
                to={menu.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active 
                    ? 'bg-white text-green-700 font-medium' 
                    : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <MenuIcon name={menu.label} active={active} />
                <span>{menu.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default function DashboardLayout({ children }: PropsWithChildren) {
  const { user, logout } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isSuper = !!user?.is_superuser;
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Menu items based on role
  const menus = useMemo(() => {
    const common = [
      { label: 'Home', to: '/' },
      { label: 'Profile', to: '/profile' },
    ];
    const superMenus = [
      { label: 'Users', to: '/users' },
      { label: 'Sectors', to: '/sectors' },
      { label: 'Departments', to: '/departments' },
      { label: 'Indicators', to: '/indicators' },
      { label: 'Indicator Groups', to: '/indicator-groups' },
      { label: 'Annual Plans', to: '/annual-plans' },
      { label: 'Entry Periods', to: '/entry-periods' },
    ];
    const advisorMenus = [
      { label: 'Quarterly Breakdown', to: '/quarterly-breakdowns' },
      { label: 'Quarterly Performance', to: '/performances' },
      { label: 'Advisor Overall Comment', to: '/advisor-comment' },
    ];
    const leadExecutiveMenus = [
      { label: 'Quarterly Breakdown', to: '/quarterly-breakdowns' },
      { label: 'Quarterly Performance', to: '/performances' },
      { label: 'Advisor Comments', to: '/advisor-comments' },
    ];
    const ministerMenus = [
      { label: 'State Minister Dashboard', to: '/state-minister-dashboard' },
      { label: 'Reviews & Approvals', to: '/reviews' },
      { label: 'Advisor Comments', to: '/advisor-comments' },
    ];
    const strategicMenus = [
      { label: 'Validations', to: '/validations' },
      { label: 'Overall Dashboard', to: '/strategic-minister-view' },
    ];
    const executiveMenus = [
      { label: 'Final Approvals', to: '/final-approvals' },
      { label: 'Overall Dashboard', to: '/executive-minister-view' },
    ];
    const ministerViewMenus = [
      { label: 'Final Approved', to: '/minister-view' },
    ];

    const out = [...common];
    if (isSuper) out.push(...superMenus);
    if (role === 'ADVISOR') out.push(...advisorMenus);
    if (role === 'LEAD_EXECUTIVE_BODY') out.push(...leadExecutiveMenus);
    if (role === 'STATE_MINISTER') out.push(...ministerMenus);
    if (role === 'STRATEGIC_STAFF') out.push(...strategicMenus);
    if (role === 'EXECUTIVE') out.push(...executiveMenus);
    if (role === 'MINISTER_VIEW') out.push(...ministerViewMenus);
    if (isSuper || role === 'STRATEGIC_STAFF' || role === 'EXECUTIVE') {
      out.push({ label: 'Activity Log', to: '/activity-logs' });
    }

    return out;
  }, [role, isSuper]);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Menu */}
      <MobileMenu 
        menus={menus} 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />

      {/* Desktop Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-20' : 'w-64'
        } hidden md:flex flex-col bg-[#1d8d51] text-white shadow-lg transition-all duration-300 ease-in-out`}
      >
        {/* Sidebar Header */}
        <div className="h-20 px-4 flex items-center justify-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Logo" 
              className="h-10 w-10 object-contain rounded-lg bg-white p-1" 
            />
            {!collapsed && (
              <div className="flex flex-col">
                <h2 className="font-bold text-lg tracking-tight">Dashboard</h2>
                <span className="text-xs text-white/60">Ministry of Agriculture</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menus.map((menu) => {
            const active = location.pathname === menu.to;
            return (
              <Link
                key={menu.to}
                to={menu.to}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-white text-green-700 shadow-lg transform translate-x-1'
                    : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? menu.label : ''}
              >
                <MenuIcon name={menu.label} active={active} />
                {!collapsed && (
                  <span className="font-medium truncate">{menu.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          {!collapsed && (
            <div className="mb-4 p-3 bg-white/5 rounded-lg">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-white/60">{role}</span>
                {isSuper && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-200 rounded-full">
                    Superuser
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={`flex items-center justify-center p-2 rounded-lg bg-white/10 hover:bg-white/20 transition ${
                collapsed ? 'w-full' : 'flex-1'
              }`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
                </svg>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                  <span className="ml-2 text-sm">Collapse</span>
                </>
              )}
            </button>

            {!collapsed && (
              <button
                onClick={logout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-red-500/20 hover:text-red-200 transition"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                <span className="text-sm">Logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-200 shadow-sm">
          <div className="h-16 px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <img 
                  src={logo} 
                  alt="Logo" 
                  className="h-10 w-10 object-contain rounded-lg border border-gray-200 p-1" 
                />
                <div className="hidden md:block">
                  <h1 className="text-lg font-bold text-gray-900">
                    Beyond Production! <span className="text-blue-600">ከማምረት በላይ!</span>
                  </h1>
                  <p className="text-xs text-gray-500">Ministry of Agriculture Planning System</p>
                </div>
              </div>
            </div>

            {/* User Info & Mobile Controls */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                  <p className="text-xs text-gray-500">{role}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white text-sm font-semibold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <button
                onClick={logout}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
                title="Logout"
              >
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-blue border-t border-gray-200 py-4 px-6" >
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Ministry of Agriculture. All rights reserved.</p>
            <div className="flex items-center gap-4 mt-2 md:mt-0">
              <span className="hidden md:inline">|</span>
              <span>Version 1.0.0</span>
              <span className="hidden md:inline">|</span>
              <span>Planning & Monitoring System</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}