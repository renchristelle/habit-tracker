-- Éclosion — schéma Supabase
-- À coller une fois dans Supabase > SQL Editor > New query, puis "Run".

-- Habitudes
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,                         -- 'sport' | 'phone' | 'medit' | 'bed' | autre
  kind text not null check (kind in ('sport', 'boolean', 'bedtime')),
  name text not null,
  flower text not null,
  color text not null,
  deep text not null,
  days smallint[] not null default '{1,1,1,1,1,1,1}',  -- lundi → dimanche (1 = prévue)
  yes_label text,
  no_label text,
  bedtime_limit text default '23:30',        -- pour kind = 'bedtime'
  identity text,
  sort smallint not null default 0,
  started_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

-- Saisies quotidiennes (une ligne par habitude et par jour)
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id uuid not null references public.habits on delete cascade,
  day date not null,
  -- sport : {"arms":1,"abs":0,"legs":2,"no":false}
  -- boolean : {"value":true|false}
  -- bedtime : {"time":"23:10"}
  -- tous : {"rest":true} pour un jour de repos ponctuel
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (habit_id, day)
);

-- Repos planifiés (déplacement, vacances)
create table if not exists public.rest_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  label text not null,
  start_day date not null,
  end_day date not null,
  habit_ids uuid[],                          -- null = toutes les habitudes
  created_at timestamptz not null default now(),
  check (end_day >= start_day)
);

-- Fleurs du jardin : position mémorisée à la création
create table if not exists public.garden_flowers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id uuid not null references public.habits on delete cascade,
  month date not null,                       -- 1er jour du mois
  idx smallint not null,                     -- n-ième fleur de l'habitude ce mois-ci
  x real not null,
  y real not null,
  rot smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (habit_id, month, idx)
);

create index if not exists entries_user_day on public.entries (user_id, day);
create index if not exists flowers_user_month on public.garden_flowers (user_id, month);

-- Sécurité : chacun ne voit que ses propres données
alter table public.habits enable row level security;
alter table public.entries enable row level security;
alter table public.rest_periods enable row level security;
alter table public.garden_flowers enable row level security;

do $$
declare t text;
begin
  foreach t in array array['habits', 'entries', 'rest_periods', 'garden_flowers'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
