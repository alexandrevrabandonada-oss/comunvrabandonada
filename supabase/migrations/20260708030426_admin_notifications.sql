create table if not exists public.comun_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'dossier_factual_assigned',
    'dossier_editorial_assigned',
    'dossier_due_today',
    'dossier_overdue',
    'dossier_changes_requested',
    'dossier_ready_to_publish',
    'dossier_blocked_same_reviewer',
    'dossier_due_date_changed',
    'dossier_priority_high'
  )),
  target_type text not null default 'pauta_dossier',
  target_id uuid not null,
  title text not null,
  body text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to text,
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists comun_admin_notifications_status_idx on public.comun_admin_notifications(status);
create index if not exists comun_admin_notifications_kind_idx on public.comun_admin_notifications(kind);
create index if not exists comun_admin_notifications_priority_idx on public.comun_admin_notifications(priority);
create index if not exists comun_admin_notifications_assigned_to_idx on public.comun_admin_notifications(assigned_to) where assigned_to is not null;
create index if not exists comun_admin_notifications_target_idx on public.comun_admin_notifications(target_type, target_id);
create index if not exists comun_admin_notifications_created_at_idx on public.comun_admin_notifications(created_at desc);

alter table public.comun_admin_notifications enable row level security;

revoke all on table public.comun_admin_notifications from anon, authenticated;
grant all on table public.comun_admin_notifications to service_role;
