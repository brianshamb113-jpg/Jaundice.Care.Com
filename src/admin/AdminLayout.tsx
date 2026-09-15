import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity, FileText, Megaphone,
  Settings, LogOut, Menu, X, Building2, Bell, UserCircle,
} from 'lucide-react';
import { getSession } from './types';
import { getJcAlerts } from '../lib/user';

const pendingAlertCount = () => getJcAlerts().filter(a => !a.responded).length;

const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/facilities', label: 'Facilities', icon: Building2 },
  { path: '/admin/alerts', label: 'Alerts', icon: Bell, badge: true },
  { path: '/admin/parents', label: 'Parents', icon: UserCircle },
  { path: '/admin/children', label: 'Children', icon: Users },
  { path: '/admin/screenings', label: 'Screenings', icon: Activity },
  { path: '/admin/referrals', label: 'Referrals', icon: FileText },
  { path: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/facilities': 'Facilities',
  '/admin/alerts': 'Alerts',
  '/admin/parents': 'Parents',
  '/admin/children': 'Children',
  '/admin/screenings': 'Screenings',
  '/admin/referrals': 'Referrals',
  '/admin/announcements': 'Announcements',
  '/admin/settings': 'Settings',
};

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem('jc_admin_session');
    navigate('/admin', { replace: true });
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">☀</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">JaundiceCARE</p>
            <p className="text-white/60 text-xs">Admin Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ path, label, icon: Icon, badge }) => {
          const count = badge ? pendingAlertCount() : 0;
          return (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-white text-[#0F6E56]'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              {label}
              {count > 0 && (
                <span className="ml-auto bg-[#A32D2D] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                  {count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 font-medium text-sm transition-all"
        >
          <LogOut size={18} className="flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const session = getSession();

  const pageTitle = Object.entries(PAGE_TITLES).find(([key]) =>
    location.pathname.startsWith(key)
  )?.[1] ?? 'Admin';

  return (
    <div className="flex h-screen bg-[#F7F6F2] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-[#0F6E56]">
        <SidebarContent />
      </aside>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-[#0F6E56] z-50 md:hidden transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white/70 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E5E3DC] px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-[#5F5E5A] hover:text-[#0F6E56] transition-colors"
            >
              <Menu size={22} />
            </button>
            <h1 className="font-bold text-[#1A1A1A] text-lg">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[#5F5E5A] hidden sm:block">
              {session?.name ?? 'Administrator'}
            </span>
            <div className="w-9 h-9 bg-[#0F6E56] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {(session?.name ?? 'A')[0].toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
