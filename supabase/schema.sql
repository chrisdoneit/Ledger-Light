-- Run this in Supabase: Project → SQL Editor → New query → paste all → Run

-- Profiles: one row per user, holds account-level settings
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  starting_balance numeric not null default 0,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

-- Trades
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  symbol text not null,
  direction text not null check (direction in ('long','short')),
  size numeric,
  entry numeric,
  exit numeric,
  pnl numeric not null,
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- Journal entries: one per user per day
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  highlight text,
  text text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- Daily goals
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row Level Security: every table, users only ever see their own rows
alter table profiles enable row level security;
alter table trades enable row level security;
alter table journal_entries enable row level security;
alter table goals enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own trades" on trades for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own journal entries" on journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals" on goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for trade screenshots
insert into storage.buckets (id, name, public) values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

create policy "upload own screenshots" on storage.objects for insert
  with check (bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "view screenshots" on storage.objects for select
  using (bucket_id = 'screenshots');

create policy "delete own screenshots" on storage.objects for delete
  using (bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
