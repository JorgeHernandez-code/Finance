import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { NavLinks } from './NavLinks';

/**
 * Sidebar persistente de escritorio. En móvil no se renderiza (oculta con
 * `hidden lg:flex`); la navegación móvil vive en MobileSidebar.tsx (Sheet).
 */
export function Sidebar() {
  return (
    <aside className="glass sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Wallet className="size-4" />
        </div>
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Finance
        </Link>
      </div>
      <NavLinks />
    </aside>
  );
}
