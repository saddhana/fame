import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { AppShell } from '@/components/layout/AppShell';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { AuthProvider } from '@/components/AuthContext';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();

  return (
    <AuthProvider isAuthenticated={authed}>
      <SidebarProvider>
        <Sidebar />
        <AppShell>{children}</AppShell>
        <MobileNav />
      </SidebarProvider>
    </AuthProvider>
  );
}
