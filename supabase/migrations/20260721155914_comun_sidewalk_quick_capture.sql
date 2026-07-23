-- Sprint 39 — captura rápida, autoria anônima limitada e revisão geográfica.
alter table public.comun_sidewalk_records
  add column if not exists submitter_is_anonymous boolean not null default false,
  add column if not exists location_accuracy_m numeric(10,2),
  add column if not exists suggested_public_geometry_geojson jsonb,
  add column if not exists inferred_street text,
  add column if not exists inferred_neighborhood text,
  add column if not exists geographic_risk text not null default 'unreviewed'
    check (geographic_risk in ('unreviewed','low','medium','high','sensitive'));

alter table public.comun_sidewalk_records
  add constraint comun_sidewalk_accuracy_check check (location_accuracy_m is null or (location_accuracy_m >= 0 and location_accuracy_m <= 100000));

create index if not exists comun_sidewalk_anonymous_rate_idx
  on public.comun_sidewalk_records(member_user_id,created_at desc)
  where submitter_is_anonymous is true;

-- Usuários anônimos continuam sob o papel authenticated; só enxergam a própria
-- submissão. Escritas seguem exclusivamente pelo backend, que aplica limites.
drop policy if exists "member_reads_own_sidewalk_records" on public.comun_sidewalk_records;
create policy "member_reads_own_sidewalk_records"
  on public.comun_sidewalk_records for select to authenticated
  using ((select auth.uid())=member_user_id);

comment on column public.comun_sidewalk_records.location_accuracy_m is 'Precisão original privada do GPS; nunca selecionar em projeções públicas.';
comment on column public.comun_sidewalk_records.submitter_is_anonymous is 'Sinal derivado do JWT no envio; não concede papel comunitário ou editorial.';
comment on column public.comun_sidewalk_records.suggested_public_geometry_geojson is 'Sugestão interna do moderador, distinta da geometria pública aprovada.';
