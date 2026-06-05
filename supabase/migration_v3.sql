-- ============================================================
-- TrackFit Pro – Migration v3
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── Push subscriptions ──────────────────────────────────────
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id);

-- ── Reminder hour en profiles ────────────────────────────────
alter table public.profiles
  add column if not exists reminder_hour integer check (reminder_hour between 0 and 23);

-- ── Database Webhook: notificar al insertar notificacion ────
-- Configurar manualmente en Supabase Dashboard:
-- Database → Webhooks → Create new webhook
--   Name: push_on_notification
--   Table: public.notifications
--   Events: INSERT
--   URL: https://trackfit-pro.vercel.app/api/push/send
--   Headers: { "x-webhook-secret": "<tu PUSH_WEBHOOK_SECRET>" }
