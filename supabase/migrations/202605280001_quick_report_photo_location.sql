alter table public.comun_reports
  add column if not exists quick_report boolean not null default false,
  add column if not exists latitude double precision null,
  add column if not exists longitude double precision null,
  add column if not exists location_accuracy double precision null,
  add column if not exists location_source text null,
  add column if not exists public_location_level text not null default 'approximate',
  add column if not exists photo_count integer not null default 0,
  add column if not exists has_attachments boolean not null default false,
  add column if not exists source_channel text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comun_reports_location_source_check'
  ) then
    alter table public.comun_reports
      add constraint comun_reports_location_source_check
      check (location_source is null or location_source in ('browser_geolocation','manual','smoke'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'comun_reports_public_location_level_check'
  ) then
    alter table public.comun_reports
      add constraint comun_reports_public_location_level_check
      check (public_location_level in ('none','approximate','neighborhood'));
  end if;
end $$;

create table if not exists public.comun_report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.comun_reports(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text null,
  mime_type text null,
  size_bytes integer null,
  attachment_type text not null default 'photo',
  public_approved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint comun_report_attachments_type_check check (attachment_type in ('photo')),
  constraint comun_report_attachments_private_default_check check (public_approved is false)
);

alter table public.comun_report_attachments enable row level security;

drop policy if exists "Public cannot read report attachments" on public.comun_report_attachments;
create policy "Public cannot read report attachments"
on public.comun_report_attachments for select
using (false);

drop policy if exists "Public cannot insert report attachments" on public.comun_report_attachments;
create policy "Public cannot insert report attachments"
on public.comun_report_attachments for insert
with check (false);

create index if not exists comun_reports_quick_created_idx
on public.comun_reports (quick_report, created_at desc);

create index if not exists comun_report_attachments_report_id_idx
on public.comun_report_attachments (report_id, created_at desc);
