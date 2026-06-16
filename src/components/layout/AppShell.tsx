'use client';

import { useSidebar } from './SidebarContext';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <main className={cn('min-h-screen pb-24 lg:pb-0 transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
      {children}
    </main>
  );
}
