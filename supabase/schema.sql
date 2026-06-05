-- ============================================================
-- TrackFit Pro – Supabase Schema (idempotente – resetea todo)
-- ============================================================

-- ── Drop todo en orden inverso de dependencias ───────────────
drop trigger if exists on_video_correction_update on public.video_corrections;
drop trigger if exists on_video_correction_insert on public.video_corrections;
drop trigger if exists on_exercise_log_insert     on public.exercise_logs;
drop trigger if exists on_auth_user_created        on auth.users;

drop function if exists public.notify_student_on_review();
drop function if exists public.notify_trainer_on_video();
drop function if exists public.notify_trainer_on_log();
drop function if exists public.handle_new_user();

drop table if exists public.notifications       cascade;
drop table if exists public.video_corrections   cascade;
drop table if exists public.exercise_logs       cascade;
drop table if exists public.exercises           cascade;
drop table if exists public.sessions            cascade;
drop table if exists public.profiles            cascade;

-- ── Profiles ────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null check (role in ('trainer','student')),
  trainer_id  uuid references public.profiles(id) on delete set null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Trainer can read their students"
  on public.profiles for select
  using (auth.uid() = trainer_id or auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Sessions ────────────────────────────────────────────────
create table public.sessions (
  id             uuid primary key default gen_random_uuid(),
  trainer_id     uuid not null references public.profiles(id) on delete cascade,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  scheduled_date date,
  notes          text,
  status         text not null default 'pending' check (status in ('pending','active','completed')),
  created_at     timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Trainer manages own sessions"
  on public.sessions for all
  using (auth.uid() = trainer_id);

create policy "Student reads own sessions"
  on public.sessions for select
  using (auth.uid() = student_id);

create policy "Student updates own sessions"
  on public.sessions for update
  using (auth.uid() = student_id);

-- ── Exercises ───────────────────────────────────────────────
create table public.exercises (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.sessions(id) on delete cascade,
  name           text not null,
  sets           integer not null default 3,
  reps           text not null default '8-12',
  rest_seconds   integer default 90,
  youtube_url    text,
  technical_note text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Trainer manages exercises in own sessions"
  on public.exercises for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.trainer_id = auth.uid()
    )
  );

create policy "Student reads exercises in own sessions"
  on public.exercises for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.student_id = auth.uid()
    )
  );

-- ── Exercise Logs ───────────────────────────────────────────
create table public.exercise_logs (
  id             uuid primary key default gen_random_uuid(),
  exercise_id    uuid not null references public.exercises(id) on delete cascade,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  session_id     uuid not null references public.sessions(id) on delete cascade,
  weight_kg      numeric(6,2),
  completed_sets integer,
  rpe            integer check (rpe between 1 and 10),
  comment        text,
  logged_at      timestamptz not null default now(),
  unique (exercise_id, student_id)
);

alter table public.exercise_logs enable row level security;

create policy "Student manages own logs"
  on public.exercise_logs for all
  using (auth.uid() = student_id);

create policy "Trainer reads logs of their students"
  on public.exercise_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = student_id and p.trainer_id = auth.uid()
    )
  );

-- ── Video Corrections ───────────────────────────────────────
create table public.video_corrections (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  trainer_id       uuid not null references public.profiles(id) on delete cascade,
  exercise_name    text not null,
  video_url        text not null,
  student_comment  text,
  trainer_response text,
  status           text not null default 'pending' check (status in ('pending','reviewed')),
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz
);

alter table public.video_corrections enable row level security;

create policy "Student manages own video corrections"
  on public.video_corrections for all
  using (auth.uid() = student_id);

create policy "Trainer manages corrections for their students"
  on public.video_corrections for all
  using (auth.uid() = trainer_id);

-- ── Notifications ───────────────────────────────────────────
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         text not null,
  message      text not null,
  reference_id uuid,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users manage own notifications"
  on public.notifications for all
  using (auth.uid() = user_id);

-- ── Triggers de notificaciones ──────────────────────────────
create or replace function public.notify_trainer_on_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_trainer_id  uuid;
  v_student_name text;
  v_session_name text;
begin
  select p.trainer_id, p.full_name into v_trainer_id, v_student_name
    from public.profiles p where p.id = new.student_id;

  select s.name into v_session_name
    from public.sessions s where s.id = new.session_id;

  if v_trainer_id is not null then
    insert into public.notifications (user_id, type, message, reference_id)
    values (v_trainer_id, 'session_logged',
            v_student_name || ' registro actividad en "' || v_session_name || '"',
            new.session_id);
  end if;
  return new;
end;
$$;

create trigger on_exercise_log_insert
  after insert on public.exercise_logs
  for each row execute procedure public.notify_trainer_on_log();

create or replace function public.notify_trainer_on_video()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_student_name text;
begin
  select full_name into v_student_name
    from public.profiles where id = new.student_id;

  insert into public.notifications (user_id, type, message, reference_id)
  values (new.trainer_id, 'correction_submitted',
          v_student_name || ' subio un video de "' || new.exercise_name || '" para correccion',
          new.id);
  return new;
end;
$$;

create trigger on_video_correction_insert
  after insert on public.video_corrections
  for each row execute procedure public.notify_trainer_on_video();

create or replace function public.notify_student_on_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'reviewed' and old.status = 'pending' then
    insert into public.notifications (user_id, type, message, reference_id)
    values (new.student_id, 'correction_reviewed',
            'Tu entrenador respondio la correccion de "' || new.exercise_name || '"',
            new.id);
  end if;
  return new;
end;
$$;

create trigger on_video_correction_update
  after update on public.video_corrections
  for each row execute procedure public.notify_student_on_review();

-- ── Índices ─────────────────────────────────────────────────
create index on public.sessions (student_id);
create index on public.sessions (trainer_id);
create index on public.exercises (session_id);
create index on public.exercise_logs (student_id, logged_at desc);
create index on public.exercise_logs (session_id);
create index on public.video_corrections (student_id);
create index on public.video_corrections (trainer_id);
create index on public.notifications (user_id, read, created_at desc);
