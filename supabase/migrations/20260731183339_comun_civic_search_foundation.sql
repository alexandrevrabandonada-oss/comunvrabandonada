-- TIJOLO 47.9B: additive, reconstructible, public-only civic search projection.
-- The canonical source tables remain authoritative. No private source is copied here.

begin;

create extension if not exists vector with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

do $$
begin
  if not exists (
    select 1 from pg_ts_config c join pg_namespace n on n.oid = c.cfgnamespace
    where n.nspname = 'public' and c.cfgname = 'comun_portuguese_unaccent'
  ) then
    create text search configuration public.comun_portuguese_unaccent (copy = pg_catalog.portuguese);
    alter text search configuration public.comun_portuguese_unaccent
      alter mapping for hword, hword_part, word with extensions.unaccent, portuguese_stem;
  end if;
end
$$;

create table if not exists public.comun_search_documents (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  source_type text not null,
  source_key text not null,
  source_version text not null,
  canonical_route text not null check (canonical_route ~ '^/comun(?:/|$)' and canonical_route !~ '[[:cntrl:]]'),
  title text not null check (char_length(title) between 1 and 240),
  summary text,
  public_text text not null default '',
  territory_id uuid,
  pauta_id uuid,
  process_state text,
  source_date timestamptz,
  language text not null default 'pt-BR',
  visibility text not null default 'public_projection' check (visibility = 'public_projection'),
  permission_scope text not null default 'public' check (permission_scope = 'public'),
  content_checksum text not null check (char_length(content_checksum) = 32),
  search_vector tsvector not null,
  embedding_model text,
  embedding_version text,
  embedding_dimensions integer check (embedding_dimensions is null or embedding_dimensions = 384),
  embedding extensions.vector(384),
  indexing_state text not null default 'lexical_ready'
    check (indexing_state in ('lexical_ready', 'embedding_pending', 'ready', 'failed', 'stale')),
  last_synced_at timestamptz not null default now(),
  embedded_at timestamptz,
  unique (source_type, source_key)
);

create table if not exists public.comun_search_sections (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.comun_search_documents(id) on delete cascade,
  section_kind text not null check (section_kind in ('title', 'summary', 'section', 'result', 'memory')),
  ordinal integer not null check (ordinal >= 0),
  title_context text not null,
  route_context text not null,
  public_text text not null check (char_length(public_text) between 1 and 4000),
  content_checksum text not null check (char_length(content_checksum) = 32),
  embedding_model text,
  embedding_version text,
  embedding_dimensions integer check (embedding_dimensions is null or embedding_dimensions = 384),
  embedding extensions.vector(384),
  indexing_state text not null default 'embedding_pending'
    check (indexing_state in ('embedding_pending', 'ready', 'failed', 'stale')),
  embedded_at timestamptz,
  unique (document_id, section_kind, ordinal)
);

create table if not exists public.comun_search_embedding_jobs (
  id bigint generated always as identity primary key,
  section_id uuid not null references public.comun_search_sections(id) on delete cascade,
  content_checksum text not null,
  state text not null default 'pending' check (state in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  unique (section_id, content_checksum)
);

create table if not exists public.comun_search_metrics_hourly (
  bucket timestamptz not null,
  search_kind text not null check (search_kind in ('lexical', 'hybrid', 'intent')),
  outcome text not null check (outcome in ('results', 'zero_results', 'fallback', 'timeout', 'error')),
  query_size_band text not null check (query_size_band in ('short', 'medium', 'long')),
  latency_band text not null check (latency_band in ('under_100ms', '100_300ms', '300_1000ms', 'over_1000ms')),
  confidence_band text not null default 'none' check (confidence_band in ('none', 'low', 'medium', 'high')),
  model_version text not null default 'lexical',
  total bigint not null default 0 check (total >= 0),
  primary key (bucket, search_kind, outcome, query_size_band, latency_band, confidence_band, model_version)
);

create index if not exists comun_search_documents_fts_idx
  on public.comun_search_documents using gin (search_vector);
create index if not exists comun_search_documents_filters_idx
  on public.comun_search_documents (visibility, source_type, pauta_id, territory_id, source_date desc);
create index if not exists comun_search_documents_title_trgm_idx
  on public.comun_search_documents using gin (title extensions.gin_trgm_ops);
create index if not exists comun_search_sections_document_idx
  on public.comun_search_sections (document_id, ordinal);
create index if not exists comun_search_sections_embedding_idx
  on public.comun_search_sections using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;
create index if not exists comun_search_jobs_claim_idx
  on public.comun_search_embedding_jobs (state, available_at, id)
  where state in ('pending', 'failed');

alter table public.comun_search_documents enable row level security;
alter table public.comun_search_sections enable row level security;
alter table public.comun_search_embedding_jobs enable row level security;
alter table public.comun_search_metrics_hourly enable row level security;

revoke all privileges on table public.comun_search_documents from public, anon, authenticated;
revoke all privileges on table public.comun_search_sections from public, anon, authenticated;
revoke all privileges on table public.comun_search_embedding_jobs from public, anon, authenticated;
revoke all privileges on table public.comun_search_metrics_hourly from public, anon, authenticated;
revoke all on sequence public.comun_search_embedding_jobs_id_seq from public, anon, authenticated;

create or replace function public.comun_sync_public_search_projection()
returns table (documents_upserted bigint, documents_removed bigint, sections_queued bigint)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_upserted bigint := 0;
  v_removed bigint := 0;
  v_queued bigint := 0;
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'COMUN_SEARCH_SERVER_ROLE_REQUIRED' using errcode = '42501';
  end if;

  create temporary table comun_search_candidates on commit drop as
  select 'communities'::text domain, 'comunidade'::text source_type, c.id::text source_key,
    extract(epoch from c.updated_at)::text source_version, '/comun/c/' || c.slug canonical_route,
    c.name title, c.short_description summary, coalesce(c.full_description, c.short_description, '') public_text,
    null::uuid territory_id, null::uuid pauta_id, 'active'::text process_state, c.updated_at source_date
  from public.comun_communities c where c.is_active
  union all
  select 'pautas', 'pauta', p.id::text, extract(epoch from p.updated_at)::text,
    '/comun/pautas/' || p.slug, p.title, p.summary,
    concat_ws(E'\n', p.public_synthesis, p.problem_public, p.demand_public, p.proposals_public, p.participation_public),
    p.territory_id, p.id, coalesce(p.public_status, p.status), p.updated_at
  from public.comun_pauta_spaces p where p.visibility = 'public'
  union all
  select 'territories', 'território', t.id::text, extract(epoch from t.updated_at)::text,
    '/comun/territorios/' || t.slug, t.name, t.public_summary,
    concat_ws(E'\n', t.public_summary, t.municipality, t.neighborhood, t.public_approximate_address, t.source_summary_public),
    t.id, t.pauta_id, t.status, t.updated_at
  from public.comun_hub_territories t where t.status <> 'archived' and coalesce(t.visibility, 'public') = 'public'
  union all
  select 'actions', 'ação', a.id::text, extract(epoch from a.updated_at)::text,
    '/comun/acoes/' || a.slug, a.title, a.objective_public,
    concat_ws(E'\n', a.objective_public, a.participation_public, a.guidance_public, a.expected_result_public, a.observed_result_public, a.public_record),
    a.territory_id, a.pauta_id, a.status, a.updated_at
  from public.comun_mobilization_actions a where a.visibility = 'public'
  union all
  select 'results', 'resultado', r.id::text, extract(epoch from r.updated_at)::text,
    '/comun/resultados?resultado=' || r.slug, r.title, r.public_summary,
    concat_ws(E'\n', r.public_summary, r.what_was_done_public, r.remaining_public, r.evidence_summary_public),
    r.territory_id, r.pauta_id, r.verification_status, coalesce(r.occurred_at, r.updated_at)
  from public.comun_hub_results r where r.visibility = 'public'
  union all
  select 'dossiers', 'documento', d.id::text, coalesce(d.public_version_label, extract(epoch from d.public_updated_at)::text),
    '/comun/dossies/' || d.public_slug, d.public_title, d.public_summary, coalesce(d.public_body, ''),
    null::uuid, null::uuid, 'published', coalesce(d.public_updated_at, d.published_at)
  from public.comun_pauta_dossier_publication_snapshots d where d.snapshot_status = 'active'
  union all
  select 'sidewalks', 'calçada', s.id::text, extract(epoch from s.updated_at)::text,
    '/comun/calcadas/registros/' || s.slug, s.name, s.public_summary,
    concat_ws(E'\n', s.public_summary, s.municipality, s.neighborhood, s.approximate_location, array_to_string(s.categories, ' ')),
    s.territory_id, s.pauta_id, s.status, s.updated_at
  from public.comun_sidewalk_records s where s.visibility = 'public'
  union all
  select 'archive', 'memória', i.id::text, extract(epoch from i.updated_at)::text,
    '/comun/acervo/' || i.slug, i.title, i.summary,
    concat_ws(E'\n', i.summary, i.description, i.city, i.neighborhood, i.place_name, i.approximate_date, i.genre),
    null::uuid, null::uuid, i.status, coalesce(i.published_at, i.updated_at)
  from public.comun_archive_items i where i.status = 'published' and i.visibility = 'public'
  union all
  select 'art', 'obra', a.archive_item_id::text, extract(epoch from a.updated_at)::text,
    '/comun/acervo/arte/' || i.slug, a.title_public, a.description_public,
    concat_ws(E'\n', a.subtitle_public, a.description_public, a.context_public, a.long_description_public, a.technique_public, a.creation_place_public),
    a.territory_id, null::uuid, a.publication_status, a.updated_at
  from public.comun_archive_artworks a join public.comun_archive_items i on i.id = a.archive_item_id
  where a.publication_status = 'published' and i.status = 'published' and i.visibility = 'public'
  union all
  select 'radio', 'programa', p.archive_item_id::text, extract(epoch from p.updated_at)::text,
    '/comun/radio/programas/' || p.slug_public, p.title_public, p.subtitle_public,
    concat_ws(E'\n', p.subtitle_public, p.description_public, p.frequency_public),
    p.territory_id, p.pauta_id, p.publication_status, p.updated_at
  from public.comun_radio_programs p where p.publication_status = 'published'
  union all
  select 'radio', 'episódio', e.archive_item_id::text, extract(epoch from e.updated_at)::text,
    '/comun/radio/episodios/' || e.slug_public, e.title_public, e.summary_public,
    concat_ws(E'\n', e.summary_public, e.description_public), e.territory_id, e.pauta_id,
    e.publication_status, coalesce(e.published_at, e.updated_at)
  from public.comun_radio_episodes e where e.publication_status = 'published'
  union all
  select 'archive', 'coleção', c.id::text, extract(epoch from c.updated_at)::text,
    '/comun/acervo/colecoes/' || c.slug, c.title, c.summary, concat_ws(E'\n', c.summary, c.description),
    null::uuid, null::uuid, c.status, coalesce(c.published_at, c.updated_at)
  from public.comun_archive_collections c where c.status = 'published'
  union all
  select 'memory', 'memória', m.id::text, extract(epoch from m.updated_at)::text,
    '/comun/pautas/' || p.slug || '/memoria/' || m.slug, m.title, m.public_summary,
    concat_ws(E'\n', m.public_summary, m.methodology_snapshot), m.territory_id, m.pauta_id,
    m.status, coalesce(m.published_at, m.updated_at)
  from public.comun_sidewalk_cycle_memories m join public.comun_pauta_spaces p on p.id = m.pauta_id
  where m.visibility = 'public' and m.status = 'published';

  alter table comun_search_candidates add column content_checksum text;
  update comun_search_candidates set content_checksum = md5(concat_ws(E'\x1f', domain, source_type, source_key, canonical_route, title, summary, public_text, process_state))
  where content_checksum is null;

  insert into public.comun_search_documents (
    domain, source_type, source_key, source_version, canonical_route, title, summary, public_text,
    territory_id, pauta_id, process_state, source_date, content_checksum, search_vector, indexing_state, last_synced_at
  )
  select domain, source_type, source_key, source_version, canonical_route, title, nullif(summary, ''), left(public_text, 12000),
    territory_id, pauta_id, process_state, source_date, content_checksum,
    to_tsvector('public.comun_portuguese_unaccent', concat_ws(' ', title, summary, public_text)),
    'lexical_ready', now()
  from comun_search_candidates
  on conflict (source_type, source_key) do update set
    domain = excluded.domain, source_version = excluded.source_version, canonical_route = excluded.canonical_route,
    title = excluded.title, summary = excluded.summary, public_text = excluded.public_text,
    territory_id = excluded.territory_id, pauta_id = excluded.pauta_id, process_state = excluded.process_state,
    source_date = excluded.source_date, search_vector = excluded.search_vector, last_synced_at = now(),
    indexing_state = case when public.comun_search_documents.content_checksum = excluded.content_checksum
      then public.comun_search_documents.indexing_state else 'embedding_pending' end,
    content_checksum = excluded.content_checksum,
    embedding = case when public.comun_search_documents.content_checksum = excluded.content_checksum
      then public.comun_search_documents.embedding else null end,
    embedding_model = case when public.comun_search_documents.content_checksum = excluded.content_checksum
      then public.comun_search_documents.embedding_model else null end,
    embedding_version = case when public.comun_search_documents.content_checksum = excluded.content_checksum
      then public.comun_search_documents.embedding_version else null end,
    embedded_at = case when public.comun_search_documents.content_checksum = excluded.content_checksum
      then public.comun_search_documents.embedded_at else null end;
  get diagnostics v_upserted = row_count;

  delete from public.comun_search_documents d
  where d.permission_scope = 'public' and not exists (
    select 1 from comun_search_candidates c where c.source_type = d.source_type and c.source_key = d.source_key
  );
  get diagnostics v_removed = row_count;

  insert into public.comun_search_sections (document_id, section_kind, ordinal, title_context, route_context, public_text, content_checksum)
  select d.id, s.kind, s.ordinal, d.title, d.canonical_route, s.body, md5(s.body)
  from public.comun_search_documents d
  cross join lateral (
    values
      ('title'::text, 0, left(d.title, 4000)),
      ('summary'::text, 1, left(coalesce(nullif(d.summary, ''), d.public_text), 4000)),
      ('section'::text, 2, left(d.public_text, 4000))
  ) s(kind, ordinal, body)
  where length(trim(s.body)) > 0
  on conflict (document_id, section_kind, ordinal) do update set
    title_context = excluded.title_context, route_context = excluded.route_context, public_text = excluded.public_text,
    indexing_state = case when public.comun_search_sections.content_checksum = excluded.content_checksum
      then public.comun_search_sections.indexing_state else 'embedding_pending' end,
    embedding = case when public.comun_search_sections.content_checksum = excluded.content_checksum
      then public.comun_search_sections.embedding else null end,
    embedding_model = case when public.comun_search_sections.content_checksum = excluded.content_checksum
      then public.comun_search_sections.embedding_model else null end,
    embedding_version = case when public.comun_search_sections.content_checksum = excluded.content_checksum
      then public.comun_search_sections.embedding_version else null end,
    embedded_at = case when public.comun_search_sections.content_checksum = excluded.content_checksum
      then public.comun_search_sections.embedded_at else null end,
    content_checksum = excluded.content_checksum;

  delete from public.comun_search_sections s
  using public.comun_search_documents d
  where s.document_id = d.id and not exists (
    select 1 from (values
      ('title'::text, 0, left(d.title, 4000)),
      ('summary'::text, 1, left(coalesce(nullif(d.summary, ''), d.public_text), 4000)),
      ('section'::text, 2, left(d.public_text, 4000))
    ) expected(kind, ordinal, body)
    where expected.kind = s.section_kind and expected.ordinal = s.ordinal and length(trim(expected.body)) > 0
  );

  insert into public.comun_search_embedding_jobs (section_id, content_checksum)
  select s.id, s.content_checksum from public.comun_search_sections s
  where s.embedding is null and s.indexing_state in ('embedding_pending', 'failed')
  on conflict (section_id, content_checksum) do nothing;
  get diagnostics v_queued = row_count;

  return query select v_upserted, v_removed, v_queued;
end
$$;

create or replace function public.comun_public_search_hybrid(
  p_query text,
  p_type text default null,
  p_pauta_id uuid default null,
  p_territory_id uuid default null,
  p_query_embedding extensions.vector(384) default null,
  p_limit integer default 20
)
returns table (
  type text, title text, summary text, href text, origin text, updated_at timestamptz, match_reason text
)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  with input as (
    select left(trim(coalesce(p_query, '')), 120) q,
      lower(extensions.unaccent(left(trim(coalesce(p_query, '')), 120))) normalized,
      websearch_to_tsquery('public.comun_portuguese_unaccent', left(trim(coalesce(p_query, '')), 120)) tsq,
      least(greatest(coalesce(p_limit, 20), 1), 50) lim
  ), candidates as (
    select d.*,
      lower(extensions.unaccent(d.title)) = i.normalized as exact_match,
      lower(extensions.unaccent(d.title)) like i.normalized || '%' as prefix_match,
      d.search_vector @@ i.tsq as fts_match,
      ts_rank_cd(d.search_vector, i.tsq, 32) as lexical_rank,
      similarity(lower(extensions.unaccent(d.title)), i.normalized) as typo_rank,
      case when p_query_embedding is null then null else (
        select min(s.embedding <=> p_query_embedding)
        from public.comun_search_sections s where s.document_id = d.id and s.embedding is not null
      ) end as semantic_distance
    from public.comun_search_documents d cross join input i
    where d.visibility = 'public_projection' and d.permission_scope = 'public'
      and (p_type is null or d.source_type = p_type)
      and (p_pauta_id is null or d.pauta_id = p_pauta_id)
      and (p_territory_id is null or d.territory_id = p_territory_id)
      and (i.q <> '' and (
        d.search_vector @@ i.tsq
        or lower(extensions.unaccent(d.title)) like '%' || i.normalized || '%'
        or similarity(lower(extensions.unaccent(d.title)), i.normalized) >= 0.28
        or (p_query_embedding is not null and exists (
          select 1 from public.comun_search_sections s
          where s.document_id = d.id and s.embedding is not null and s.embedding <=> p_query_embedding < 0.38
        ))
      ))
  ), ranked as (
    select c.*,
      row_number() over (order by exact_match desc, prefix_match desc, lexical_rank desc, typo_rank desc, source_date desc nulls last) lexical_position,
      case when semantic_distance is null then null else row_number() over (order by semantic_distance asc nulls last) end semantic_position
    from candidates c
  )
  select r.source_type, r.title, r.summary, r.canonical_route, initcap(r.domain), r.source_date,
    case
      when r.exact_match then 'correspondência exata'
      when r.prefix_match then 'título correspondente'
      when p_pauta_id is not null and r.pauta_id = p_pauta_id then 'mesma pauta'
      when p_territory_id is not null and r.territory_id = p_territory_id then 'mesmo território'
      when r.fts_match then 'termos relacionados'
      when r.semantic_distance is not null then 'relacionado pelo significado'
      else 'grafia aproximada'
    end
  from ranked r cross join input i
  order by
    r.exact_match desc,
    (1.0 / (60 + r.lexical_position) + coalesce(1.0 / (60 + r.semantic_position), 0)) desc,
    r.source_date desc nulls last, r.title
  limit (select lim from input)
$$;

create or replace function public.comun_claim_search_embedding_jobs(p_limit integer default 8)
returns table (job_id bigint, section_id uuid, content_checksum text, public_text text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'COMUN_SEARCH_SERVER_ROLE_REQUIRED' using errcode = '42501';
  end if;
  return query
  with claimed as (
    select j.id
    from public.comun_search_embedding_jobs j
    where j.state in ('pending', 'failed') and j.available_at <= now() and j.attempts < 5
    order by j.available_at, j.id
    for update skip locked
    limit least(greatest(coalesce(p_limit, 8), 1), 16)
  ), updated as (
    update public.comun_search_embedding_jobs j
    set state = 'processing', attempts = attempts + 1, locked_at = now(), failure_code = null
    from claimed c where j.id = c.id
    returning j.id, j.section_id, j.content_checksum
  )
  select u.id, u.section_id, u.content_checksum, s.public_text
  from updated u join public.comun_search_sections s on s.id = u.section_id;
end
$$;

create or replace function public.comun_complete_search_embedding_job(
  p_job_id bigint,
  p_content_checksum text,
  p_model text,
  p_version text,
  p_embedding extensions.vector(384)
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_section_id uuid;
  v_document_id uuid;
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'COMUN_SEARCH_SERVER_ROLE_REQUIRED' using errcode = '42501';
  end if;
  select j.section_id into v_section_id
  from public.comun_search_embedding_jobs j
  where j.id = p_job_id and j.state = 'processing' and j.content_checksum = p_content_checksum
  for update;
  if v_section_id is null then return false; end if;

  update public.comun_search_sections s set
    embedding = p_embedding, embedding_model = left(p_model, 80), embedding_version = left(p_version, 80),
    embedding_dimensions = 384, indexing_state = 'ready', embedded_at = now()
  where s.id = v_section_id and s.content_checksum = p_content_checksum
  returning s.document_id into v_document_id;
  if v_document_id is null then return false; end if;

  update public.comun_search_embedding_jobs set state = 'completed', completed_at = now(), locked_at = null
  where id = p_job_id;
  update public.comun_search_documents d set
    indexing_state = case when exists (
      select 1 from public.comun_search_sections s where s.document_id = d.id and s.indexing_state <> 'ready'
    ) then 'embedding_pending' else 'ready' end,
    embedding_model = left(p_model, 80), embedding_version = left(p_version, 80), embedding_dimensions = 384,
    embedded_at = case when not exists (
      select 1 from public.comun_search_sections s where s.document_id = d.id and s.indexing_state <> 'ready'
    ) then now() else d.embedded_at end
  where d.id = v_document_id;
  return true;
end
$$;

create or replace function public.comun_fail_search_embedding_job(p_job_id bigint, p_failure_code text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_section_id uuid;
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'COMUN_SEARCH_SERVER_ROLE_REQUIRED' using errcode = '42501';
  end if;
  update public.comun_search_embedding_jobs set
    state = case when attempts >= 5 then 'failed' else 'pending' end,
    available_at = now() + make_interval(secs => least(300, 5 * greatest(attempts, 1))),
    locked_at = null, failure_code = left(regexp_replace(coalesce(p_failure_code, 'PROVIDER_FAILURE'), '[^A-Z0-9_]', '', 'g'), 80)
  where id = p_job_id and state = 'processing'
  returning section_id into v_section_id;
  if v_section_id is null then return false; end if;
  update public.comun_search_sections set indexing_state = case
    when (select attempts from public.comun_search_embedding_jobs where id = p_job_id) >= 5 then 'failed'
    else 'embedding_pending' end
  where id = v_section_id;
  return true;
end
$$;

create or replace function public.comun_record_search_metric(
  p_search_kind text,
  p_outcome text,
  p_query_size_band text,
  p_latency_band text,
  p_confidence_band text default 'none',
  p_model_version text default 'lexical'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'COMUN_SEARCH_SERVER_ROLE_REQUIRED' using errcode = '42501';
  end if;
  insert into public.comun_search_metrics_hourly (
    bucket, search_kind, outcome, query_size_band, latency_band, confidence_band, model_version, total
  ) values (
    date_trunc('hour', now()), p_search_kind, p_outcome, p_query_size_band, p_latency_band,
    coalesce(nullif(p_confidence_band, ''), 'none'), left(coalesce(nullif(p_model_version, ''), 'lexical'), 80), 1
  )
  on conflict (bucket, search_kind, outcome, query_size_band, latency_band, confidence_band, model_version)
  do update set total = public.comun_search_metrics_hourly.total + 1;
end
$$;

revoke all on function public.comun_sync_public_search_projection() from public, anon, authenticated;
grant execute on function public.comun_sync_public_search_projection() to service_role;
revoke all on function public.comun_claim_search_embedding_jobs(integer) from public, anon, authenticated;
grant execute on function public.comun_claim_search_embedding_jobs(integer) to service_role;
revoke all on function public.comun_complete_search_embedding_job(bigint, text, text, text, extensions.vector) from public, anon, authenticated;
grant execute on function public.comun_complete_search_embedding_job(bigint, text, text, text, extensions.vector) to service_role;
revoke all on function public.comun_fail_search_embedding_job(bigint, text) from public, anon, authenticated;
grant execute on function public.comun_fail_search_embedding_job(bigint, text) to service_role;
revoke all on function public.comun_record_search_metric(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.comun_record_search_metric(text, text, text, text, text, text) to service_role;
revoke all on function public.comun_public_search_hybrid(text, text, uuid, uuid, extensions.vector, integer) from public;
grant execute on function public.comun_public_search_hybrid(text, text, uuid, uuid, extensions.vector, integer) to anon, authenticated, service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

comment on table public.comun_search_documents is 'Reconstructible public-only search projection; never a canonical source.';
comment on column public.comun_search_documents.public_text is 'Allowlisted public projection only; excludes contacts, private notes, originals, coordinates and authorization references.';
comment on table public.comun_search_metrics_hourly is 'Aggregate metrics only; raw queries and user identifiers are prohibited.';

do $ledger$
declare
  expected_path constant text := 'supabase/migrations/20260731183339_comun_civic_search_foundation.sql';
  expected_sha text := coalesce(nullif(pg_catalog.current_setting('comun.release_sha256', true), ''), 'LOCAL_VALIDATION');
  existing public.comun_schema_releases%rowtype;
begin
  select * into existing from public.comun_schema_releases where release = '20260731183339-comun-civic-search-foundation';
  if found then
    if existing.migration_path <> expected_path or existing.migration_sha256 <> expected_sha or existing.status <> 'applied' then
      raise exception 'COMUN_CIVIC_SEARCH_LEDGER_DIVERGENCE';
    end if;
  else
    insert into public.comun_schema_releases (release, migration_path, migration_sha256, pre_fingerprint, post_fingerprint, status, applied_by)
    values ('20260731183339-comun-civic-search-foundation', expected_path, expected_sha, 'ADDITIVE_PUBLIC_PROJECTION', 'ADDITIVE_PUBLIC_PROJECTION', 'applied', current_user);
  end if;
end
$ledger$;

commit;
