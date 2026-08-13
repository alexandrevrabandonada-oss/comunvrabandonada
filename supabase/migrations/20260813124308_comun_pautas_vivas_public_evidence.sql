alter table public.comun_pauta_evidence_items
  add column if not exists public_evidence_ref_id text null,
  add column if not exists public_evidence_version text null,
  add column if not exists public_evidence_payload jsonb null;

alter table public.comun_pauta_evidence_items
  drop constraint if exists comun_pauta_evidence_source_type_check;

alter table public.comun_pauta_evidence_items
  add constraint comun_pauta_evidence_source_type_check
  check (
    source_type in (
      'contribution',
      'report',
      'official_protocol',
      'manual',
      'external_reference',
      'public_evidence'
    )
  );

alter table public.comun_pauta_evidence_items
  add constraint comun_pauta_public_evidence_citation_check
  check (
    (
      source_type = 'public_evidence'
      and source_id is null
      and public_evidence_ref_id is not null
      and char_length(public_evidence_ref_id) between 3 and 240
      and public_evidence_version is not null
      and public_evidence_version ~ '^sha256:[0-9a-f]{64}$'
      and public_evidence_payload is not null
      and jsonb_typeof(public_evidence_payload) = 'object'
    )
    or
    (
      source_type <> 'public_evidence'
      and public_evidence_ref_id is null
      and public_evidence_version is null
      and public_evidence_payload is null
    )
  );

create unique index if not exists comun_pauta_public_evidence_version_unique_idx
  on public.comun_pauta_evidence_items (
    pauta_id,
    public_evidence_ref_id,
    public_evidence_version
  )
  where source_type = 'public_evidence';
