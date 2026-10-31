import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, ClipboardCheck, GraduationCap, History, Info, LayoutDashboard, Mic, Moon, Settings, Sun, Monitor } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '../utils/format';
import { useSettings } from '../hooks/useSettings';
import type { ThemePref } from '../types';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/practice', label: 'Practice', icon: BookOpen },
  { to: '/test', label: 'Full Test', icon: ClipboardCheck },
  { to: '/improve', label: 'Improve', icon: GraduationCap },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function ThemeSwitcher() {
  const { settings, update } = useSettings();
  const opts: { v: ThemePref; Icon: typeof Sun; label: string }[] = [
    { v: 'light', Icon: Sun, label: 'Light' },
    { v: 'dark', Icon: Moon, label: 'Dark' },
    { v: 'system', Icon: Monitor, label: 'System' },
  ];
  return (
    <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {opts.map(({ v, Icon, label }) => (
        <button
          key={v}
          onClick={() => update({ theme: v })}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          className={cn('flex flex-1 items-center justify-center rounded-lg py-1.5 transition-colors',
            settings.theme === v ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">DET Speaking</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Personal trainer</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
              )}
            >
              <Icon className="h-[18px] w-[18px]" /> {label}
            </NavLink>
          ))}
          <NavLink
            to="/about"
            className={({ isActive }) => cn('mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800')}
          >
            <Info className="h-[18px] w-[18px]" /> How scoring works
          </NavLink>
        </nav>
        <div className="mt-4"><ThemeSwitcher /></div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><Mic className="h-4 w-4" /></div>
          <span className="text-sm font-bold">DET Speaking</span>
        </div>
        <div className="flex items-center gap-2">
          <NavLink to="/about" aria-label="How scoring works" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Info className="h-5 w-5" /></NavLink>
          <div className="w-28"><ThemeSwitcher /></div>
        </div>
      </header>

      <main className="pb-24 lg:pb-10 lg:pl-64">
        <div key={pathname} className="mx-auto max-w-6xl animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
              isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400')}
          >
            <Icon className="h-5 w-5" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
