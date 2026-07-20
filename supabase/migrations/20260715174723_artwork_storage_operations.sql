insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
 ('archive-private-originals','archive-private-originals',false,31457280,array['image/jpeg','image/png','image/webp']),
 ('archive-public-derivatives','archive-public-derivatives',true,15728640,array['image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table public.comun_archive_storage_uploads(
 id uuid primary key default gen_random_uuid(), archive_item_id uuid references public.comun_archive_items(id) on delete cascade,
 submission_id uuid references public.comun_archive_artwork_submissions(id) on delete cascade,
 idempotency_key text not null unique, bucket_id text not null check(bucket_id='archive-private-originals'), object_key text not null unique,
 original_filename text not null, declared_mime text not null, declared_size bigint not null check(declared_size between 1 and 31457280),
 state text not null default 'waiting_file' check(state in('waiting_file','uploading','confirming','validating','processing','ready_for_review','failed','removed')),
 expires_at timestamptz not null default(now()+interval '30 minutes'), failure_code text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((archive_item_id is not null)::int+(submission_id is not null)::int=1)
);
create index comun_archive_storage_uploads_expiry_idx on public.comun_archive_storage_uploads(state,expires_at);
alter table public.comun_archive_storage_uploads enable row level security;
revoke all on public.comun_archive_storage_uploads from anon,authenticated;
grant select,insert,update,delete on public.comun_archive_storage_uploads to service_role;
create trigger comun_archive_storage_uploads_updated_at before update on public.comun_archive_storage_uploads for each row execute function public.set_updated_at();
