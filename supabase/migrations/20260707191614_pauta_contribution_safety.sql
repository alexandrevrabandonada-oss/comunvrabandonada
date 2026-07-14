alter table public.comun_pauta_contributions
  add column if not exists risk_level text not null default 'normal',
  add column if not exists risk_reasons text[] not null default '{}',
  add column if not exists moderation_priority text not null default 'normal',
  add column if not exists submitter_hash text null,
  add column if not exists user_agent_hash text null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists reviewed_by text null;

alter table public.comun_pauta_contributions
  drop constraint if exists comun_pauta_contributions_risk_level_check;
alter table public.comun_pauta_contributions
  add constraint comun_pauta_contributions_risk_level_check
  check (risk_level in ('normal', 'attention', 'high'));

alter table public.comun_pauta_contributions
  drop constraint if exists comun_pauta_contributions_moderation_priority_check;
alter table public.comun_pauta_contributions
  add constraint comun_pauta_contributions_moderation_priority_check
  check (moderation_priority in ('normal', 'review_first', 'possible_abuse'));

create index if not exists comun_pauta_contributions_risk_idx
  on public.comun_pauta_contributions (status, risk_level, moderation_priority, created_at);

create index if not exists comun_pauta_contributions_submitter_hash_idx
  on public.comun_pauta_contributions (submitter_hash, created_at)
  where submitter_hash is not null;
