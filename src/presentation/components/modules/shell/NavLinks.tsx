'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, SETTINGS_ITEM } from '@/shared/config/navigation';
import { cn } from '@/shared/lib/utils';

interface NavLinksProps {
  onNavigate?: () => void;
}

/**
 * Lista de navegación compartida entre la sidebar de escritorio y el Sheet
 * (drawer) de móvil — así ambas quedan sincronizadas por diseño, no por copia.
 */
export function NavLinks({ onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
              'hover:bg-muted hover:text-foreground',
              isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-auto border-t border-border pt-3">
        <Link
          href={SETTINGS_ITEM.href as Route}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
            'hover:bg-muted hover:text-foreground',
            pathname?.startsWith(SETTINGS_ITEM.href) && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
          )}
        >
          <SETTINGS_ITEM.icon className="size-4 shrink-0" />
          {SETTINGS_ITEM.label}
        </Link>
      </div>
    </nav>
  );
}
