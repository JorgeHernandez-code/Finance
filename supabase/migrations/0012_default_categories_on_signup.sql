-- Cada usuario nuevo (registro por email o Google) llegaba sin categorías,
-- obligándolo a crearlas todas a mano antes de poder registrar su primera
-- transacción. Extendemos el trigger de 0001 para que, además del profile,
-- cree el set de categorías por defecto (mismas que usaba seed.sql para
-- pruebas), marcadas is_system = true igual que antes.
--
-- No se toca la firma del trigger (on_auth_user_created sigue apuntando a
-- handle_new_user); solo se reemplaza el cuerpo de la función.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.categories (user_id, name, type, color, icon, is_system) values
    (new.id, 'Comida', 'expense', '#f59e0b', 'utensils', true),
    (new.id, 'Transporte', 'expense', '#3b82f6', 'car', true),
    (new.id, 'Salud', 'expense', '#ef4444', 'heart-pulse', true),
    (new.id, 'Casa', 'expense', '#8b5cf6', 'home', true),
    (new.id, 'Tecnología', 'expense', '#06b6d4', 'cpu', true),
    (new.id, 'Educación', 'expense', '#22c55e', 'book', true),
    (new.id, 'Streaming', 'expense', '#ec4899', 'tv', true),
    (new.id, 'Freelance', 'income', '#14b8a6', 'briefcase', true),
    (new.id, 'Salario', 'income', '#22c55e', 'wallet', true);

  return new;
end;
$$;
