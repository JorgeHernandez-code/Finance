import { describe, expect, it } from 'vitest';
import { cn } from '@/shared/lib/utils';

describe('cn', () => {
  it('une clases estáticas', () => {
    expect(cn('px-2', 'text-sm')).toBe('px-2 text-sm');
  });

  it('resuelve condicionales', () => {
    expect(cn('base', false && 'oculto', true && 'visible')).toBe('base visible');
  });

  it('elimina conflictos de Tailwind quedándose con el último valor', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('ignora valores falsy', () => {
    expect(cn('base', null, undefined, 0, '')).toBe('base');
  });
});
