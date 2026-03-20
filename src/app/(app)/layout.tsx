import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
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
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pb-24 lg:pb-0">
        {children}
      </main>
      <MobileNav />
    </AuthProvider>
  );
}
