'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  Wallet,
  Tags,
  Users,
  HandCoins,
  Target,
  TrendingUp,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/presentation/components/ui/command';
import { useUIStore } from '@/presentation/stores/useUIStore';
import { useGlobalSearch } from '@/presentation/hooks/useGlobalSearch';
import { NAV_ITEMS, SETTINGS_ITEM } from '@/shared/config/navigation';
import type { SearchResultType } from '@/domain/entities/SearchResult';

const TYPE_LABELS: Record<SearchResultType, string> = {
  transaction: 'Transacciones',
  account: 'Cuentas',
  category: 'Categorías',
  client: 'Clientes',
  debt: 'Deudas',
  savings_goal: 'Ahorros',
  investment: 'Inversiones',
  subscription: 'Suscripciones',
};

const TYPE_ICON: Record<SearchResultType, typeof ArrowLeftRight> = {
  transaction: ArrowLeftRight,
  account: Wallet,
  category: Tags,
  client: Users,
  debt: HandCoins,
  savings_goal: Target,
  investment: TrendingUp,
  subscription: RefreshCw,
};

interface CommandPaletteProps {
  userId?: string;
}

/** Debounce simple sin dependencias extra — 250ms es suficientemente rápido para sentirse instantáneo sin spamear Supabase en cada tecla. */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function CommandPalette({ userId }: CommandPaletteProps) {
  const router = useRouter();
  const open = useUIStore((state) => state.commandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const toggle = useUIStore((state) => state.toggleCommandPalette);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const { data: results = [], isFetching } = useGlobalSearch(userId ?? '', debouncedQuery);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggle();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function goTo(href: string) {
    setOpen(false);
    router.push(href as Route);
  }

  const groupedResults = results.reduce<Partial<Record<SearchResultType, typeof results>>>((groups, result) => {
    const list = groups[result.type] ?? [];
    list.push(result);
    groups[result.type] = list;
    return groups;
  }, {});

  const isSearching = query.trim().length >= 2;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleNavItems = normalizedQuery
    ? NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(normalizedQuery))
    : NAV_ITEMS;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar módulos, transacciones, cuentas..." value={query} onValueChange={setQuery} />
      <CommandList>
        {isSearching && isFetching && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Buscando...
          </div>
        )}

        {!isSearching && (
          <CommandGroup heading="Módulos">
            {visibleNavItems.map((item) => (
              <CommandItem key={item.href} onSelect={() => goTo(item.href)}>
                <item.icon className="size-4" />
                {item.label}
              </CommandItem>
            ))}
            {(!normalizedQuery || SETTINGS_ITEM.label.toLowerCase().includes(normalizedQuery)) && (
              <CommandItem onSelect={() => goTo(SETTINGS_ITEM.href)}>
                <SETTINGS_ITEM.icon className="size-4" />
                {SETTINGS_ITEM.label}
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {isSearching && !isFetching && results.length === 0 && <CommandEmpty>No se encontraron resultados.</CommandEmpty>}

        {isSearching &&
          !isFetching &&
          (Object.entries(groupedResults) as Array<[SearchResultType, typeof results]>).map(([type, items]) => {
            const Icon = TYPE_ICON[type];
            return (
              <CommandGroup key={type} heading={TYPE_LABELS[type]}>
                {items.map((item) => (
                  <CommandItem key={item.id} onSelect={() => goTo(item.href)}>
                    <Icon className="size-4" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{item.title}</span>
                      {item.subtitle && <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
      </CommandList>
    </CommandDialog>
  );
}
