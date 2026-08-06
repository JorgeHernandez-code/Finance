import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseCategoryRepository } from '@/infrastructure/supabase/repositories/SupabaseCategoryRepository';
import { ListCategories } from '@/application/use-cases/categories/ListCategories';
import { CategoriesView } from '@/presentation/components/modules/categories/CategoriesView';

export const metadata = { title: 'Categorías' };

export default async function CategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const categories = await new ListCategories(new SupabaseCategoryRepository(supabase)).execute(user.id);

  return <CategoriesView userId={user.id} initialData={categories} />;
}
