import { create } from 'zustand';

/**
 * Estado puramente de interfaz (nunca datos del servidor — eso vive en
 * React Query, ver presentation/hooks). Sidebar móvil y command palette
 * necesitan vivir arriba del árbol para que la Topbar y el atajo de teclado
 * global los controlen sin prop-drilling.
 */
interface UIState {
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
}));
