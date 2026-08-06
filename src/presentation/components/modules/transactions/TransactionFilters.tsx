'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { TransactionFiltersDto } from '@/application/dto/transaction';
import type { AccountOption, CategoryOption } from '@/domain/entities/ReferenceOption';
import { Input } from '@/presentation/components/ui/input';
import { Button } from '@/presentation/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/ui/select';

const ALL = 'all';

interface TransactionFiltersProps {
  filters: TransactionFiltersDto;
  onChange: (patch: Partial<TransactionFiltersDto>) => void;
  onReset: () => void;
  accounts: AccountOption[];
  categories: CategoryOption[];
}

export function TransactionFilters({ filters, onChange, onReset, accounts, categories }: TransactionFiltersProps) {
  // La búsqueda se debounce localmente para no disparar una query por cada
  // tecla — el resto de filtros (selects, fechas) sí actualizan de inmediato.
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');

  useEffect(() => {
    setSearchDraft(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchDraft !== (filters.search ?? '')) {
        onChange({ search: searchDraft || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const hasActiveFilters =
    !!filters.search || filters.type !== 'all' || !!filters.accountId || !!filters.categoryId || !!filters.dateFrom || !!filters.dateTo;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:w-56">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar descripción..."
          className="pl-8"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
        />
      </div>

      <Select value={filters.type} onValueChange={(value) => onChange({ type: value as TransactionFiltersDto['type'], page: 1 })}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los tipos</SelectItem>
          <SelectItem value="income">Ingresos</SelectItem>
          <SelectItem value="expense">Gastos</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.accountId ?? ALL}
        onValueChange={(value) => onChange({ accountId: value === ALL ? undefined : value, page: 1 })}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Cuenta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las cuentas</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.categoryId ?? ALL}
        onValueChange={(value) => onChange({ categoryId: value === ALL ? undefined : value, page: 1 })}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las categorías</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          className="w-full sm:w-36"
          value={filters.dateFrom ?? ''}
          onChange={(e) => onChange({ dateFrom: e.target.value || undefined, page: 1 })}
        />
        <span className="text-xs text-muted-foreground">a</span>
        <Input
          type="date"
          className="w-full sm:w-36"
          value={filters.dateTo ?? ''}
          onChange={(e) => onChange({ dateTo: e.target.value || undefined, page: 1 })}
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="size-4" /> Limpiar
        </Button>
      )}
    </div>
  );
}
