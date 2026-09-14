alter table public.comun_archive_assets
  add column if not exists requested_by_admin_id uuid references public.comun_admin_users(id) on delete set null,
  add column if not exists idempotency_key_hash text,
  add column if not exists idempotency_payload_hash text;

alter table public.comun_archive_assets
  add constraint comun_archive_assets_idempotency_hashes_check check (
    (idempotency_key_hash is null and idempotency_payload_hash is null)
    or (requested_by_admin_id is not null
      and idempotency_key_hash ~ '^[a-f0-9]{64}$'
      and idempotency_payload_hash ~ '^[a-f0-9]{64}$')
  );

create unique index comun_archive_assets_admin_idempotency_unique
  on public.comun_archive_assets(requested_by_admin_id, idempotency_key_hash)
  where idempotency_key_hash is not null;

create or replace function public.comun_claim_radio_processing(p_episode_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.comun_radio_episodes set publication_status='audio_processing', updated_at=now()
  where archive_item_id=p_episode_id and publication_status in ('draft','rights_review','editorial_review');
  return found;
end $$;

create or replace function public.comun_finish_radio_processing(p_episode_id uuid, p_duration integer)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.comun_radio_episodes set duration_seconds=p_duration, publication_status='editorial_review', updated_at=now()
  where archive_item_id=p_episode_id and publication_status='audio_processing';
  return found;
end $$;

revoke all on function public.comun_claim_radio_processing(uuid) from public,anon,authenticated;
revoke all on function public.comun_finish_radio_processing(uuid,integer) from public,anon,authenticated;
grant execute on function public.comun_claim_radio_processing(uuid) to service_role;
grant execute on function public.comun_finish_radio_processing(uuid,integer) to service_role;
