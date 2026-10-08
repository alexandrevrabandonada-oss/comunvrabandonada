-- Reduced search projection fixture, not a migration/RLS audit. Relevant column
-- types and artwork FK match the repository migrations. No canonical DB is used.
create table public.comun_hub_territories (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  name text not null, public_summary text, updated_at timestamptz default now(),
  visibility text not null check (visibility in ('public','internal','archived')),
  status text not null check (status in ('active','monitoring','archived'))
);
create table public.comun_archive_items (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  title text not null, summary text, item_type text, updated_at timestamptz default now(),
  status text not null check (status in ('draft','review','changes_requested','approved','published','unpublished','archived')),
  visibility text not null check (visibility in ('private','public'))
);
create table public.comun_archive_artworks (
  archive_item_id uuid primary key references public.comun_archive_items(id) on delete cascade,
  title_public text not null, description_public text, updated_at timestamptz default now(),
  publication_status text not null check (publication_status in ('draft','rights_review','editorial_review','approved','published','withdrawn','archived'))
);
-- Healthy rows in every other source let error tests prove selective failure.
do $$ declare t text; begin
  foreach t in array array['comun_communities','comun_pauta_spaces','comun_mobilization_actions','comun_hub_results','comun_pauta_dossier_publication_snapshots','comun_radio_programs','comun_radio_episodes','comun_archive_collections'] loop
    execute format('create table public.%I (
      id uuid default gen_random_uuid(), slug text, slug_public text, public_slug text,
      name text, title text, title_public text, public_title text, summary text,
      short_description text, public_summary text, objective_public text,
      description text, description_public text, summary_public text,
      updated_at timestamptz default now(), published_at timestamptz default now(),
      pauta_id uuid, is_active boolean, visibility text, status text, publication_status text)', t);
    execute format('insert into public.%I (slug,slug_public,public_slug,name,title,title_public,public_title,summary,short_description,public_summary,objective_public,description,description_public,summary_public,is_active,visibility,status,publication_status)
      values (''searchproof'',''searchproof'',''searchproof'',''searchproof healthy'',''searchproof healthy'',''searchproof healthy'',''searchproof healthy'',''calçada safe'',''calçada safe'',''calçada safe'',''calçada safe'',''calçada safe'',''calçada safe'',''calçada safe'',true,''public'',%L,''published'')', t, case when t='comun_pauta_dossier_publication_snapshots' then 'active' else 'published' end);
  end loop;
  foreach t in array array['comun_hub_territories','comun_archive_items','comun_archive_artworks','comun_communities','comun_pauta_spaces','comun_mobilization_actions','comun_hub_results','comun_pauta_dossier_publication_snapshots','comun_radio_programs','comun_radio_episodes','comun_archive_collections'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;
insert into public.comun_hub_territories (slug,name,public_summary,visibility,status)
select 'territory-'||visibility||'-'||status, 'searchproof territory '||visibility||' '||status, 'calçada safe', visibility,status
from unnest(array['public','internal','archived']) visibility
cross join unnest(array['active','monitoring','archived']) status;
insert into public.comun_archive_items (slug,title,summary,item_type,status,visibility)
select 'root-'||status||'-'||visibility, 'searchproof root '||status||' '||visibility, 'calçada safe','document',status,visibility
from unnest(array['draft','review','changes_requested','approved','published','unpublished','archived']) status
cross join unnest(array['public','private']) visibility;
insert into public.comun_archive_artworks (archive_item_id,title_public,description_public,publication_status)
select id,'searchproof artwork '||status||' '||visibility,'calçada safe','published' from public.comun_archive_items;
-- Public published roots with unpublished artworks must also be excluded.
insert into public.comun_archive_items (slug,title,summary,item_type,status,visibility)
select 'art-'||status,'searchproof nonpublished art root '||status,'calçada safe','document','published','public'
from unnest(array['draft','rights_review','editorial_review','approved','withdrawn','archived']) status;
insert into public.comun_archive_artworks (archive_item_id,title_public,description_public,publication_status)
select id,'searchproof unpublished artwork '||substr(slug,5),'calçada safe',substr(slug,5)
from public.comun_archive_items where slug like 'art-%';
notify pgrst, 'reload schema';
