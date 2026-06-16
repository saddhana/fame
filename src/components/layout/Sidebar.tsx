'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  GitBranch,
  Users,
  Camera,
  Info,
  LogOut,
  LogIn,
  TreePine,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthContext';
import { useSidebar } from './SidebarContext';

const navItems = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/family-tree', label: 'Silsilah', icon: GitBranch },
  { href: '/members', label: 'Anggota', icon: Users },
  { href: '/gallery', label: 'Galeri', icon: Camera },
  { href: '/about', label: 'Tentang', icon: Info },
];

export function Sidebar() {
  const pathname = usePathname();
  const authed = useAuth();
  const { collapsed, toggle } = useSidebar();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-emerald-700 text-white min-h-screen fixed left-0 top-0 z-40 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn('flex items-center border-b border-emerald-600 transition-all duration-300', collapsed ? 'flex-col gap-2 py-3 px-2' : 'px-4 py-3')}>
        {/* Top row: logo + toggle button */}
        <div className={cn('flex items-center w-full', collapsed ? 'justify-center' : 'gap-3')}>
          <Link href="/" className="flex items-center gap-3 group min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-md group-hover:bg-white/30 transition-colors shrink-0">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-white leading-tight" style={{ fontFamily: 'var(--font-playfair)' }}>FAME</h1>
                <p className="text-[11px] text-white/60 tracking-widest uppercase font-medium">Keluarga Kita</p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={toggle}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-all"
              title="Ciutkan menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Collapsed: show expand button below icon */}
        {collapsed && (
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-all"
            title="Perluas menu"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 py-3 space-y-0.5 bg-emerald-800/30', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-emerald-600' : 'text-white/70 group-hover:text-white')} />
              {!collapsed && (
                <span className={cn('truncate', isActive && 'font-semibold')}>{item.label}</span>
              )}
              {/* Tooltip on collapsed */}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-stone-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Auth */}
      <div className={cn('border-t border-emerald-600 py-3 bg-emerald-800/30', collapsed ? 'px-2' : 'px-3')}>
        {authed ? (
          <button
            onClick={handleLogout}
            title={collapsed ? 'Keluar' : undefined}
            className={cn(
              'flex items-center rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/15 transition-all duration-200 w-full mt-0.5',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
        ) : (
          <Link
            href="/login"
            title={collapsed ? 'Masuk' : undefined}
            className={cn(
              'flex items-center rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/15 transition-all duration-200 w-full mt-0.5',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
            )}
          >
            <LogIn className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Masuk</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}
