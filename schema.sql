-- Caderno de Pontos — esquema do banco (rode isto inteiro no SQL Editor do Supabase)

-- 1) Perfis (um por usuário, criado automaticamente no cadastro)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user','admin')),
  daily_goal numeric not null default 21,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));
  -- (impede que o próprio usuário se promova a admin pelo app; isso só se faz pelo SQL editor)

-- Função auxiliar: verifica se quem está logado é admin, sem causar recursão no RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

-- 2) Lista de alimentos (compartilhada, só admin edita)
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points numeric not null,
  category text not null default 'Outros',
  created_at timestamptz not null default now()
);

alter table public.foods enable row level security;

create policy "foods_select_authenticated" on public.foods
  for select using (auth.role() = 'authenticated');

create policy "foods_admin_write" on public.foods
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) Registros diários (cada usuário só vê/edita os seus)
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  food_name text not null,
  points numeric not null,
  qty numeric not null default 1,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists entries_user_date_idx on public.entries (user_id, entry_date);

alter table public.entries enable row level security;

create policy "entries_owner_all" on public.entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5) Depois de criar SUA conta pelo próprio site, rode isto (trocando o e-mail)
-- para virar admin:
-- update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
