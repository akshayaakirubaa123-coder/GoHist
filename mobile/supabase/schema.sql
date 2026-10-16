-- GoHist accounts. Run this once in your Supabase project's SQL editor
-- (Dashboard > SQL Editor > New query > paste > Run).

-- Your public profile. One row per account.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  home_country text,
  created_at timestamptz not null default now()
);

-- Your history passport: every historic place you've been to.
create table if not exists public.visits (
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id text not null,
  title text not null,
  latitude double precision not null,
  longitude double precision not null,
  thumbnail_url text,
  source_url text,
  visited_at timestamptz not null,
  primary key (user_id, place_id)
);

-- Row level security: each person can only see and change their own rows.
alter table public.profiles enable row level security;
alter table public.visits enable row level security;

drop policy if exists "Own profile" on public.profiles;
create policy "Own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Own visits" on public.visits;
create policy "Own visits" on public.visits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create a profile when someone signs up, using the name they gave.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
