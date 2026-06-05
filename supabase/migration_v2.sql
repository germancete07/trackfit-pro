-- ============================================================
-- TrackFit Pro – Migration v2
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── Columnas adicionales en profiles ────────────────────────
alter table public.profiles
  add column if not exists birth_date          date,
  add column if not exists training_goal       text,
  add column if not exists physical_limitations text,
  add column if not exists start_date          date,
  add column if not exists trainer_notes       text,
  add column if not exists archived            boolean not null default false;

-- ── Trigger actualizado: lee full_name y trainer_id del metadata ─
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, full_name, trainer_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'trainer_id', '')::uuid
  );
  return new;
end;
$$;

-- ── Tabla training_days ─────────────────────────────────────
create table if not exists public.training_days (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  trainer_id  uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  created_at  timestamptz not null default now(),
  unique (student_id, day_of_week)
);

alter table public.training_days enable row level security;

drop policy if exists "Trainer manages training days" on public.training_days;
drop policy if exists "Student reads own training days" on public.training_days;

create policy "Trainer manages training days"
  on public.training_days for all
  using (auth.uid() = trainer_id);

create policy "Student reads own training days"
  on public.training_days for select
  using (auth.uid() = student_id);

create index if not exists training_days_student_idx on public.training_days (student_id);

-- ── Storage: bucket avatars ─────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload own avatar"   on storage.objects;
drop policy if exists "Avatars are publicly readable" on storage.objects;
drop policy if exists "Users can update own avatar"   on storage.objects;
drop policy if exists "Users can delete own avatar"   on storage.objects;

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );
