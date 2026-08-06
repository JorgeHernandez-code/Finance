'use client';

import { ICON_NAMES, getIcon } from '@/shared/config/iconMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/ui/select';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

/** Reusado por Categorías (Fase 8) y Cuentas (Fase 9). Ver shared/config/iconMap.ts. */
export function IconPicker({ value, onChange }: IconPickerProps) {
  const SelectedIcon = getIcon(value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <SelectedIcon className="size-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {ICON_NAMES.map((name) => {
          const Icon = getIcon(name);
          return (
            <SelectItem key={name} value={name}>
              <span className="flex items-center gap-2">
                <Icon className="size-4" /> {name}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
