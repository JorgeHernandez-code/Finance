'use client';

import { Check } from 'lucide-react';
import { COLOR_PALETTE } from '@/shared/config/colorPalette';
import { cn } from '@/shared/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/**
 * Reusado por Categorías (Fase 8) y Cuentas (Fase 9) — cualquier módulo con
 * un campo `color` hexadecimal en su tabla.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            'flex size-7 items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
            value === color ? 'border-foreground' : 'border-transparent'
          )}
          style={{ backgroundColor: color }}
          aria-label={color}
        >
          {value === color && <Check className="size-3.5 text-white drop-shadow" />}
        </button>
      ))}
    </div>
  );
}
