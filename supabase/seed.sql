-- Datos de prueba para ver el dashboard con información real en vez de vacío.
--
-- CÓMO USARLO:
-- 1. Regístrate primero en la app de verdad (localhost:3000/register) — esto
--    crea tu fila en auth.users y, por el trigger de 0001, tu fila en profiles.
-- 2. En Supabase: Table Editor -> auth -> users -> copia tu "id" (UUID).
-- 3. En este archivo, reemplaza TODAS las apariciones de
--    'YOUR_USER_ID_HERE' por ese UUID (Ctrl+H / buscar y reemplazar).
-- 4. Pega el archivo completo en el SQL Editor de Supabase y ejecútalo.
--
-- Es seguro volver a correrlo: usa `on conflict do nothing` donde aplica,
-- pero si ya corriste el seed antes vas a tener filas duplicadas en las
-- tablas sin unique constraint (transactions, budgets, etc.) — bórralas
-- manualmente desde Table Editor si quieres repetir la carga desde cero.

-- Categorías -------------------------------------------------------------
insert into public.categories (user_id, name, type, color, icon, is_system) values
  ('YOUR_USER_ID_HERE', 'Comida', 'expense', '#f59e0b', 'utensils', true),
  ('YOUR_USER_ID_HERE', 'Transporte', 'expense', '#3b82f6', 'car', true),
  ('YOUR_USER_ID_HERE', 'Salud', 'expense', '#ef4444', 'heart-pulse', true),
  ('YOUR_USER_ID_HERE', 'Casa', 'expense', '#8b5cf6', 'home', true),
  ('YOUR_USER_ID_HERE', 'Tecnología', 'expense', '#06b6d4', 'cpu', true),
  ('YOUR_USER_ID_HERE', 'Educación', 'expense', '#22c55e', 'book', true),
  ('YOUR_USER_ID_HERE', 'Streaming', 'expense', '#ec4899', 'tv', true),
  ('YOUR_USER_ID_HERE', 'Freelance', 'income', '#14b8a6', 'briefcase', true),
  ('YOUR_USER_ID_HERE', 'Salario', 'income', '#22c55e', 'wallet', true);

-- Cuentas ------------------------------------------------------------------
insert into public.accounts (user_id, name, type, currency, initial_balance, color, icon) values
  ('YOUR_USER_ID_HERE', 'Efectivo', 'cash', 'COP', 300000, '#22c55e', 'banknote'),
  ('YOUR_USER_ID_HERE', 'Nequi', 'digital_wallet', 'COP', 1200000, '#8b5cf6', 'smartphone'),
  ('YOUR_USER_ID_HERE', 'Bancolombia', 'bank', 'COP', 5400000, '#ffcc00', 'building-bank'),
  ('YOUR_USER_ID_HERE', 'PayPal', 'digital_wallet', 'USD', 850, '#3b82f6', 'wallet');

-- Clientes -------------------------------------------------------------
insert into public.clients (user_id, name, color, icon) values
  ('YOUR_USER_ID_HERE', 'Bonarep', '#14b8a6', 'briefcase'),
  ('YOUR_USER_ID_HERE', 'Trendencia', '#ec4899', 'briefcase'),
  ('YOUR_USER_ID_HERE', 'Automatizaciones', '#3b82f6', 'briefcase');

-- Transacciones de los últimos 2 meses -------------------------------------
insert into public.transactions (user_id, account_id, category_id, type, amount, description, transaction_date)
select
  'YOUR_USER_ID_HERE',
  (select id from public.accounts where user_id = 'YOUR_USER_ID_HERE' and name = 'Bancolombia'),
  (select id from public.categories where user_id = 'YOUR_USER_ID_HERE' and name = 'Salario'),
  'income', 4500000, 'Pago mensual', date_trunc('month', current_date)::date + 4
union all
select
  'YOUR_USER_ID_HERE',
  (select id from public.accounts where user_id = 'YOUR_USER_ID_HERE' and name = 'Nequi'),
  (select id from public.categories where user_id = 'YOUR_USER_ID_HERE' and name = 'Comida'),
  'expense', 85000, 'Mercado semanal', current_date - 2
union all
select
  'YOUR_USER_ID_HERE',
  (select id from public.accounts where user_id = 'YOUR_USER_ID_HERE' and name = 'Efectivo'),
  (select id from public.categories where user_id = 'YOUR_USER_ID_HERE' and name = 'Transporte'),
  'expense', 12000, 'Taxi', current_date - 1
union all
select
  'YOUR_USER_ID_HERE',
  (select id from public.accounts where user_id = 'YOUR_USER_ID_HERE' and name = 'Bancolombia'),
  (select id from public.categories where user_id = 'YOUR_USER_ID_HERE' and name = 'Streaming'),
  'expense', 45900, 'Netflix', current_date - 5;

-- Ingreso por cliente
insert into public.transactions (user_id, account_id, category_id, client_id, type, amount, description, transaction_date)
select
  'YOUR_USER_ID_HERE',
  (select id from public.accounts where user_id = 'YOUR_USER_ID_HERE' and name = 'Bancolombia'),
  (select id from public.categories where user_id = 'YOUR_USER_ID_HERE' and name = 'Freelance'),
  (select id from public.clients where user_id = 'YOUR_USER_ID_HERE' and name = 'Bonarep'),
  'income', 1800000, 'Proyecto de automatización', current_date - 10;

-- Presupuesto ---------------------------------------------------------------
insert into public.budgets (user_id, category_id, amount, period, start_date)
select
  'YOUR_USER_ID_HERE',
  (select id from public.categories where user_id = 'YOUR_USER_ID_HERE' and name = 'Comida'),
  500000, 'monthly', date_trunc('month', current_date)::date;

-- Deuda + un abono -----------------------------------------------------------
insert into public.debts (user_id, creditor_name, direction, principal_amount, interest_rate, start_date, status)
values ('YOUR_USER_ID_HERE', 'Tarjeta de crédito', 'i_owe', 1500000, 2.5, current_date - 60, 'active');

insert into public.debt_payments (debt_id, amount, payment_date)
select id, 300000, current_date - 15 from public.debts
where user_id = 'YOUR_USER_ID_HERE' and creditor_name = 'Tarjeta de crédito';

-- Meta de ahorro + aportes ----------------------------------------------------
insert into public.savings_goals (user_id, name, target_amount, target_date, icon, color)
values ('YOUR_USER_ID_HERE', 'Laptop nueva', 6000000, current_date + 180, 'laptop', '#22c55e');

insert into public.savings_contributions (savings_goal_id, amount, contribution_date)
select id, 500000, current_date - 20 from public.savings_goals
where user_id = 'YOUR_USER_ID_HERE' and name = 'Laptop nueva';

-- Inversión -------------------------------------------------------------
insert into public.investments (user_id, name, type, amount_invested, start_date)
values ('YOUR_USER_ID_HERE', 'CDT Bancolombia', 'other', 3000000, current_date - 90);

-- Suscripciones -------------------------------------------------------------
insert into public.subscriptions (user_id, name, category_id, amount, currency, billing_cycle, next_billing_date) values
  ('YOUR_USER_ID_HERE', 'Netflix', (select id from public.categories where user_id = 'YOUR_USER_ID_HERE' and name = 'Streaming'), 45900, 'COP', 'monthly', date_trunc('month', current_date)::date + interval '1 month'),
  ('YOUR_USER_ID_HERE', 'Claude', (select id from public.categories where user_id = 'YOUR_USER_ID_HERE' and name = 'Tecnología'), 20, 'USD', 'monthly', date_trunc('month', current_date)::date + interval '1 month');
