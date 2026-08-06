'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, MoreHorizontal, Pencil, Trash2, Lock } from 'lucide-react';
import { useCategories } from '@/presentation/hooks/useCategories';
import { getIcon } from '@/shared/config/iconMap';
import type { Category, CategoryType } from '@/domain/entities/Category';
import { Button } from '@/presentation/components/ui/button';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';
import { CategoryFormDialog } from './CategoryFormDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';

interface CategoriesViewProps {
  userId: string;
  initialData: Category[];
}

function CategoryRow({
  category,
  indented,
  onEdit,
  onDelete,
}: {
  category: Category;
  indented: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  const Icon = getIcon(category.icon);

  return (
    <div className={`flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/40 ${indented ? 'ml-6' : ''}`}>
      <div className="flex items-center gap-3">
        <div
          className="flex size-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${category.color}26`, color: category.color }}
        >
          <Icon className="size-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{category.name}</span>
          {category.isSystem && (
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" /> Sistema
            </Badge>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Pencil className="size-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            destructive
            onClick={() => {
              if (category.isSystem) {
                toast.error('No puedes eliminar una categoría del sistema. Puedes editarla o dejarla de usar.');
                return;
              }
              onDelete(category);
            }}
          >
            <Trash2 className="size-4" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CategoryColumn({
  title,
  type,
  categories,
  onEdit,
  onDelete,
}: {
  title: string;
  type: CategoryType;
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  const items = categories.filter((c) => c.type === type);
  const topLevel = items.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) => items.filter((c) => c.parentId === parentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {topLevel.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Sin categorías todavía.</p>}
        {topLevel.map((category) => (
          <div key={category.id}>
            <CategoryRow category={category} indented={false} onEdit={onEdit} onDelete={onDelete} />
            {childrenOf(category.id).map((child) => (
              <CategoryRow key={child.id} category={child} indented onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CategoriesView({ userId, initialData }: CategoriesViewProps) {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories(userId, initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['categories', userId] });
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Categorías</h1>
          <p className="text-sm text-muted-foreground">Organiza tus transacciones por tipo de gasto o ingreso.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nueva categoría
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CategoryColumn title="Gastos" type="expense" categories={categories} onEdit={openEdit} onDelete={setDeleting} />
        <CategoryColumn title="Ingresos" type="income" categories={categories} onEdit={openEdit} onDelete={setDeleting} />
      </div>

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          invalidate();
        }}
      />

      <DeleteCategoryDialog
        category={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          invalidate();
        }}
      />
    </div>
  );
}
