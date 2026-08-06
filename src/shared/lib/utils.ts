import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind de forma segura: clsx resuelve condicionales,
 * twMerge elimina conflictos (ej. "px-2" vs "px-4" se queda solo con el último).
 * Base de todos los componentes de presentation/components/ui.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
