'use client';

import { Wallet } from 'lucide-react';
import { Sheet, SheetContent } from '@/presentation/components/ui/sheet';
import { useUIStore } from '@/presentation/stores/useUIStore';
import { NavLinks } from './NavLinks';

export function MobileSidebar() {
  const mobileSidebarOpen = useUIStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);

  return (
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <SheetContent side="left" className="flex w-72 max-w-[80vw] flex-col p-0">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Wallet className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Finance</span>
        </div>
        <NavLinks onNavigate={() => setMobileSidebarOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
