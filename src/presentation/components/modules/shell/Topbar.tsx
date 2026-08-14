'use client';

import Link from 'next/link';
import { LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { logoutAction } from '@/app/(auth)/actions';
import { Button } from '@/presentation/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/presentation/components/ui/avatar';
import { useUIStore } from '@/presentation/stores/useUIStore';
import { ThemeToggle } from './ThemeToggle';

interface TopbarProps {
  /** Nombre para el avatar/menú — llega de la sesión real en Fase 4. Placeholder por ahora. */
  userEmail?: string;
}

export function Topbar({ userEmail = 'tu@correo.com' }: TopbarProps) {
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSidebarOpen(true)}>
        <Menu className="size-5" />
        <span className="sr-only">Abrir menú</span>
      </Button>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex h-9 max-w-sm flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="truncate">{userEmail}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings#profile">
                <User className="size-4" /> Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="size-4" /> Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => void logoutAction()}>
              <LogOut className="size-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
