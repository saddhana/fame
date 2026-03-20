'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home,
  GitBranch,
  Users,
  Camera,
  Info,
  LogOut,
  TreePine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/family-tree', label: 'Silsilah', icon: GitBranch },
  { href: '/members', label: 'Anggota', icon: Users },
  { href: '/gallery', label: 'Galeri', icon: Camera },
  { href: '/about', label: 'Tentang', icon: Info },
];

export function Sidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-amber-900 via-amber-950 to-stone-900 text-amber-100 min-h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-amber-800/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-600/20 group-hover:shadow-amber-600/40 transition-shadow">
            <TreePine className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-amber-50">FAME</h1>
            <p className="text-[10px] text-amber-400/60 tracking-widest uppercase">Keluarga Kita</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group',
                isActive
                  ? 'bg-amber-700/30 text-amber-50'
                  : 'text-amber-300/70 hover:text-amber-100 hover:bg-amber-800/30'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-amber-400 to-orange-500 rounded-r-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={cn('w-5 h-5 transition-colors', isActive ? 'text-amber-400' : 'text-amber-500/50 group-hover:text-amber-400/70')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-amber-800/50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-amber-400/60 hover:text-amber-200 hover:bg-amber-800/30 transition-all duration-200 w-full"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
