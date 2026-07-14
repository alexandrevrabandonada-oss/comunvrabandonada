create table if not exists public.comun_pauta_spaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text null,
  category text null,
  community text null,
  status text not null default 'observing',
  visibility text not null default 'public',
  public_synthesis text null,
  next_step text null,
  created_from_signal text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_pauta_spaces_status_check check (status in ('observing', 'organizing', 'drafting', 'pressuring', 'resolved', 'unresolved', 'archived')),
  constraint comun_pauta_spaces_visibility_check check (visibility in ('public', 'internal', 'archived'))
);

create table if not exists public.comun_pauta_contributions (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  contribution_type text not null,
  author_alias text null,
  body text not null,
  contact_private text null,
  status text not null default 'pending',
  moderator_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_pauta_contributions_type_check check (contribution_type in ('relato', 'evidencia', 'proposta', 'duvida', 'contraponto', 'encaminhamento', 'tarefa_oferecida')),
  constraint comun_pauta_contributions_status_check check (status in ('pending', 'approved', 'rejected', 'archived'))
);

create table if not exists public.comun_pauta_tasks (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid not null references public.comun_pauta_spaces(id) on delete cascade,
  title text not null,
  description text null,
  status text not null default 'open',
  help_needed boolean not null default true,
  owner_alias text null,
  due_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_pauta_tasks_status_check check (status in ('open', 'in_progress', 'done', 'blocked', 'archived'))
);

create index if not exists comun_pauta_spaces_visibility_status_idx on public.comun_pauta_spaces (visibility, status);
create index if not exists comun_pauta_spaces_slug_idx on public.comun_pauta_spaces (slug);
create index if not exists comun_pauta_contributions_pauta_status_idx on public.comun_pauta_contributions (pauta_id, status);
create index if not exists comun_pauta_tasks_pauta_status_idx on public.comun_pauta_tasks (pauta_id, status);

alter table public.comun_pauta_spaces enable row level security;
alter table public.comun_pauta_contributions enable row level security;
alter table public.comun_pauta_tasks enable row level security;

drop policy if exists "Public can read public pauta spaces" on public.comun_pauta_spaces;
create policy "Public can read public pauta spaces"
  on public.comun_pauta_spaces
  for select
  to anon, authenticated
  using (visibility = 'public' and status <> 'archived');

drop policy if exists "Public can read approved pauta contributions" on public.comun_pauta_contributions;
create policy "Public can read approved pauta contributions"
  on public.comun_pauta_contributions
  for select
  to anon, authenticated
  using (
    status = 'approved'
    and exists (
      select 1
      from public.comun_pauta_spaces spaces
      where spaces.id = pauta_id
        and spaces.visibility = 'public'
        and spaces.status <> 'archived'
    )
  );

drop policy if exists "Public can read public pauta tasks" on public.comun_pauta_tasks;
create policy "Public can read public pauta tasks"
  on public.comun_pauta_tasks
  for select
  to anon, authenticated
  using (
    status <> 'archived'
    and exists (
      select 1
      from public.comun_pauta_spaces spaces
      where spaces.id = pauta_id
        and spaces.visibility = 'public'
        and spaces.status <> 'archived'
    )
  );

grant select on public.comun_pauta_spaces to anon, authenticated;
grant select on public.comun_pauta_contributions to anon, authenticated;
grant select on public.comun_pauta_tasks to anon, authenticated;
