'use client';

import type { ReactNode } from 'react';
import { Label } from '@/presentation/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';

export const NONE = '__none';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Etiqueta + control + ayuda/error, con la misma separación en todos los formularios. */
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: { value: string; label: string }[];
  /** Si se indica, agrega una opción "vacía" con este texto (valor null). */
  emptyLabel?: string;
  hint?: string;
  error?: string;
}

/** Select de Radix con soporte para "sin valor" (Radix no admite value=""). */
export function SelectField({ label, value, onChange, options, emptyLabel, hint, error }: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={emptyLabel} />
        </SelectTrigger>
        <SelectContent>
          {emptyLabel && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
