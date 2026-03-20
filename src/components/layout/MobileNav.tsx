'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, GitBranch, Users, Camera, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/family-tree', label: 'Silsilah', icon: GitBranch },
  { href: '/members', label: 'Anggota', icon: Users },
  { href: '/gallery', label: 'Galeri', icon: Camera },
  { href: '/about', label: 'Tentang', icon: Info },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-amber-200/50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl text-sm font-medium transition-all duration-200 min-w-16 active:scale-95',
                isActive
                  ? 'text-amber-700'
                  : 'text-stone-400 hover:text-amber-600'
              )}
            >
              <div className={cn(
                'p-2 rounded-xl transition-all duration-200',
                isActive ? 'bg-amber-100' : ''
              )}>
                <Icon className={cn('w-6 h-6', isActive ? 'text-amber-600' : '')} />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
