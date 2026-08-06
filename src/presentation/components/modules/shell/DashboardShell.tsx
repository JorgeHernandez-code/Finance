import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { PageTransition } from './PageTransition';
import { IdleLogoutWatcher } from './IdleLogoutWatcher';

/**
 * Composición final del shell del dashboard: sidebar + topbar + contenido.
 * Este es el único lugar donde se ensamblan; app/(dashboard)/layout.tsx solo
 * lo invoca — mantiene app/ libre de lógica de layout real (docs/01-ARQUITECTURA.md §3.1).
 */
interface DashboardShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userId?: string;
}

export function DashboardShell({ children, userEmail, userId }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <MobileSidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 p-4 lg:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <CommandPalette userId={userId} />
      <IdleLogoutWatcher />
    </div>
  );
}
