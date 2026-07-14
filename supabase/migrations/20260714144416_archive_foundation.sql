create extension if not exists pgcrypto;

create table public.comun_archive_items (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  item_type text not null check (item_type in ('photograph','document','place','artist','music_release','oral_history','video','poster','newspaper','other')),
  title text not null, summary text, description text, city text, neighborhood text, place_name text,
  approximate_date text, year_start integer, year_end integer, circa boolean not null default false,
  source_name text, source_description text, credits text,
  rights_status text not null default 'unknown' check (rights_status in ('public_domain','permission_granted','licensed','external_link_only','restricted','unknown')),
  license_text text, permission_reference text,
  status text not null default 'draft' check (status in ('draft','review','changes_requested','approved','published','unpublished','archived')),
  visibility text not null default 'private' check (visibility in ('private','public')),
  editorial_notes text, genre text, members text, official_links jsonb not null default '[]'::jsonb,
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_assets (
  id uuid primary key default gen_random_uuid(),
  archive_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  asset_role text not null check (asset_role in ('original','public_version','thumbnail','cover','transcript','attachment')),
  storage_provider text not null default 'r2',
  bucket_scope text not null check (bucket_scope in ('private_original','public_safe')),
  object_key text not null, public_url text, original_filename text, mime_type text, size_bytes bigint,
  checksum_sha256 text, width integer, height integer, duration_seconds integer, alt_text text, credits text,
  rights_status text check (rights_status is null or rights_status in ('public_domain','permission_granted','licensed','external_link_only','restricted','unknown')),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected','archived')),
  created_at timestamptz not null default now(), unique(bucket_scope, object_key)
);

create table public.comun_archive_collections (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
  summary text, description text, cover_asset_id uuid references public.comun_archive_assets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','review','approved','published','unpublished','archived')),
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.comun_archive_collection_items (
  collection_id uuid references public.comun_archive_collections(id) on delete cascade,
  archive_item_id uuid references public.comun_archive_items(id) on delete cascade,
  position integer not null default 0, editorial_note text, primary key(collection_id, archive_item_id)
);

create table public.comun_archive_relations (
  id uuid primary key default gen_random_uuid(), source_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  target_item_id uuid not null references public.comun_archive_items(id) on delete cascade,
  relation_type text not null check (relation_type in ('related_to','depicts','created_by','performed_by','located_at','part_of','before_after','mentioned_in','related_pauta','related_dossier')),
  public_note text, internal_note text, created_at timestamptz not null default now(), check(source_item_id <> target_item_id)
);

create index comun_archive_items_public_idx on public.comun_archive_items(status, visibility, published_at desc);
create index comun_archive_items_search_idx on public.comun_archive_items using gin (to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(description,'') || ' ' || coalesce(city,'') || ' ' || coalesce(neighborhood,'') || ' ' || coalesce(place_name,'') || ' ' || coalesce(source_name,'') || ' ' || coalesce(credits,'') || ' ' || coalesce(approximate_date,'')));
create index comun_archive_assets_item_idx on public.comun_archive_assets(archive_item_id, bucket_scope, review_status);
create index comun_archive_collection_items_position_idx on public.comun_archive_collection_items(collection_id, position);

alter table public.comun_archive_items enable row level security;
alter table public.comun_archive_assets enable row level security;
alter table public.comun_archive_collections enable row level security;
alter table public.comun_archive_collection_items enable row level security;
alter table public.comun_archive_relations enable row level security;

create policy "Public reads published archive items" on public.comun_archive_items for select to anon, authenticated using (status='published' and visibility='public' and published_at is not null);
create policy "Public reads safe approved archive assets" on public.comun_archive_assets for select to anon, authenticated using (bucket_scope='public_safe' and review_status='approved' and public_url is not null and exists (select 1 from public.comun_archive_items i where i.id=archive_item_id and i.status='published' and i.visibility='public'));
create policy "Public reads published archive collections" on public.comun_archive_collections for select to anon, authenticated using (status='published' and published_at is not null);
create policy "Public reads published collection links" on public.comun_archive_collection_items for select to anon, authenticated using (exists (select 1 from public.comun_archive_collections c where c.id=collection_id and c.status='published') and exists (select 1 from public.comun_archive_items i where i.id=archive_item_id and i.status='published' and i.visibility='public'));
create policy "Public reads public archive relations" on public.comun_archive_relations for select to anon, authenticated using (internal_note is null and exists (select 1 from public.comun_archive_items i where i.id=source_item_id and i.status='published' and i.visibility='public') and exists (select 1 from public.comun_archive_items i where i.id=target_item_id and i.status='published' and i.visibility='public'));

revoke all on public.comun_archive_items, public.comun_archive_assets, public.comun_archive_collections, public.comun_archive_collection_items, public.comun_archive_relations from anon, authenticated;
grant select on public.comun_archive_items, public.comun_archive_assets, public.comun_archive_collections, public.comun_archive_collection_items, public.comun_archive_relations to anon, authenticated;
grant select, insert, update, delete on public.comun_archive_items, public.comun_archive_assets, public.comun_archive_collections, public.comun_archive_collection_items, public.comun_archive_relations to service_role;
