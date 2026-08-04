-- COMUN 48.0I. Reconciliação de fontes e observação read-only do Fiscaliza VR.
-- Forward-only, local-only. Nenhuma submissão, conta ou protocolo é criado.

create table private.comun_forwarding_source_records (
  id text primary key,
  channel_id text not null references private.comun_forwarding_channels(id) on delete restrict,
  adapter_id text references private.comun_forwarding_adapters(id) on delete restrict,
  source_kind text not null check (source_kind in ('current_general','current_specific_service','historical_source')),
  source_url text not null,
  source_version text not null,
  observed_at timestamptz not null,
  deadline_value integer,
  deadline_unit text,
  deadline_nature text not null,
  operational_status text not null,
  included_in_due_calculation boolean not null default false,
  claims jsonb not null default '[]'::jsonb,
  notes_sanitized text not null default '',
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  check (jsonb_typeof(claims) = 'array'),
  check (deadline_value is null or deadline_value > 0),
  check (source_kind <> 'historical_source' or included_in_due_calculation = false)
);

create table private.comun_forwarding_channel_observations (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null references private.comun_forwarding_channels(id) on delete restrict,
  adapter_id text references private.comun_forwarding_adapters(id) on delete restrict,
  source_version text not null,
  observation_type text not null check (observation_type in ('public_read_only','human_micro_gate')),
  state text not null check (state in ('source_verified','public_entry_reachable','authentication_boundary_observed','service_category_observed','form_fields_observed','review_boundary_observed','submission_boundary_observed','protocol_behavior_unconfirmed','operationally_observed_no_submission','degraded','unavailable')),
  observed_at timestamptz not null,
  environment text not null check (environment in ('public_web','local_fixture','human_observation')),
  authentication_required text not null check (authentication_required in ('yes','no','unconfirmed')),
  service_found text not null check (service_found in ('yes','no','unconfirmed')),
  fields_observed jsonb not null default '[]'::jsonb,
  attachment_behavior text not null default 'unconfirmed',
  review_screen_observed text not null default 'unconfirmed',
  submission_boundary_observed text not null default 'unconfirmed',
  protocol_behavior text not null default 'unconfirmed',
  tracking_behavior text not null default 'unconfirmed',
  accessibility_notes text not null default '',
  mobile_notes text not null default '',
  result text not null,
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  review_due_at timestamptz,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(fields_observed) = 'array')
);

alter table private.comun_forwarding_adapters
  add column if not exists source_general_deadline_value integer,
  add column if not exists source_general_deadline_unit text,
  add column if not exists source_general_deadline_nature text not null default 'not_stated',
  add column if not exists historical_source_notes text not null default '';

update private.comun_forwarding_adapters
set source_stated_duration = 30,
    source_stated_unit = 'days',
    service_expectation = 'Previsão informada para realização: 30 dias. É uma estimativa de execução do serviço, não prazo legal.',
    source_general_deadline_value = null,
    source_general_deadline_unit = null,
    source_general_deadline_nature = 'not_stated',
    historical_source_notes = 'Fonte de 2019 menciona resposta inicial em até 48 horas; registro histórico, não usado para vencimento nem anonimato atual.',
    version = 'fiscaliza-vr-lighting-v2',
    updated_at = now()
where id = 'vr-fiscaliza-lighting-v1';

update private.comun_forwarding_channels
set source_version = 'fiscaliza-vr-operational-observation-v1',
    protocol_behavior = 'unconfirmed',
    tracking_behavior = 'source_described_unconfirmed',
    updated_at = now()
where id = 'vr-fiscaliza-web';

insert into private.comun_forwarding_source_records
  (id, channel_id, adapter_id, source_kind, source_url, source_version, observed_at, deadline_value, deadline_unit, deadline_nature, operational_status, included_in_due_calculation, claims, notes_sanitized, evidence_hash)
values
  ('fiscaliza-general-2026-08-04','vr-fiscaliza-web',null,'current_general','https://servicos.voltaredonda.rj.gov.br/cartaServicos/435/','fiscaliza-vr-operational-observation-v1','2026-08-04T00:00:00Z',null,null,'not_stated','current',false,'["ininterrupto","cadastro_atual","protocolo_esperado","acompanhamento_esperado"]','A carta geral informa atendimento ininterrupto e cadastro; não informa prazo atual.',repeat('0',64)),
  ('fiscaliza-lighting-2026-08-04','vr-fiscaliza-web','vr-fiscaliza-lighting-v1','current_specific_service','https://servicos.voltaredonda.rj.gov.br/cartaServicos/158/','fiscaliza-vr-operational-observation-v1','2026-08-04T00:00:00Z',30,'days','service_realization_estimate','current',true,'["Secretaria Municipal de Infraestrutura","nome_e_contato","rua_numero_referencia"]','Previsão informada para realização: 30 dias; estimativa de serviço, não prazo legal.',repeat('1',64)),
  ('fiscaliza-historical-2019-02-13','vr-fiscaliza-web','vr-fiscaliza-lighting-v1','historical_source','https://www.voltaredonda.rj.gov.br/cidade/27-noticias-em-destaque/seplag/818-fiscaliza-vr-facilita-atendimento-ao-cidad%C3%A3o/','fiscaliza-vr-operational-observation-v1','2026-08-04T00:00:00Z',48,'hours','historical_initial_response_window','operational_confirmation_required',false,'["resposta_inicial_historica","perfil","acompanhamento","notificacoes"]','Fonte publicada em 2019; não promove anonimato nem prazo atual.',repeat('2',64))
on conflict (id) do update set source_url=excluded.source_url, source_version=excluded.source_version, deadline_value=excluded.deadline_value, deadline_unit=excluded.deadline_unit, deadline_nature=excluded.deadline_nature, operational_status=excluded.operational_status, included_in_due_calculation=excluded.included_in_due_calculation, claims=excluded.claims, notes_sanitized=excluded.notes_sanitized, evidence_hash=excluded.evidence_hash;

insert into private.comun_forwarding_channel_observations
  (channel_id, adapter_id, source_version, observation_type, state, observed_at, environment, authentication_required, service_found, fields_observed, attachment_behavior, review_screen_observed, submission_boundary_observed, protocol_behavior, tracking_behavior, accessibility_notes, mobile_notes, result, evidence_hash, review_due_at)
values
  ('vr-fiscaliza-web','vr-fiscaliza-lighting-v1','fiscaliza-vr-operational-observation-v1','public_read_only','operationally_observed_no_submission','2026-08-04T00:00:00Z','public_web','unconfirmed','unconfirmed','["categoria","descricao","bairro_ou_endereco","ponto_de_referencia","foto_opcional"]','declared_by_historical_source_unconfirmed','unconfirmed','not_reached','unconfirmed','described_by_sources_not_verified','Observação sem PII; página pública municipal acessível.', 'Entrada oficial redireciona para host legado indisponível; nenhum preenchimento realizado.', 'Fonte reconciliada; entrada externa indisponível e nenhuma submissão executada.', repeat('3',64), '2026-09-04T00:00:00Z')
on conflict do nothing;

create or replace function public.comun_forwarding_observation_list(p_channel_id text default 'vr-fiscaliza-web')
returns table(observation_id uuid, channel_id text, adapter_id text, source_version text, state text, observation_type text, observed_at timestamptz, authentication_required text, service_found text, fields_observed jsonb, submission_boundary_observed text, protocol_behavior text, result text, evidence_hash text)
language sql stable security definer set search_path = 'pg_catalog'
as $$
  select id, channel_id, adapter_id, source_version, state, observation_type, observed_at, authentication_required, service_found, fields_observed, submission_boundary_observed, protocol_behavior, result, evidence_hash
  from private.comun_forwarding_channel_observations
  where channel_id = p_channel_id
  order by observed_at desc, created_at desc
$$;

alter table private.comun_forwarding_source_records enable row level security;
alter table private.comun_forwarding_source_records force row level security;
alter table private.comun_forwarding_channel_observations enable row level security;
alter table private.comun_forwarding_channel_observations force row level security;
revoke all on table private.comun_forwarding_source_records, private.comun_forwarding_channel_observations from public, anon, authenticated;
revoke all on table private.comun_forwarding_source_records from public, anon, authenticated;
revoke all on table private.comun_forwarding_channel_observations from public, anon, authenticated;
revoke all on function public.comun_forwarding_observation_list(text) from public, anon, authenticated;
grant execute on function public.comun_forwarding_observation_list(text) to service_role;

create or replace function public.comun_forwarding_source_reconciliation()
returns table(source_kind text, deadline_value integer, deadline_unit text, deadline_nature text, included_in_due_calculation boolean, operational_status text)
language sql stable security definer set search_path = 'pg_catalog'
as $$
  select source_kind, deadline_value, deadline_unit, deadline_nature, included_in_due_calculation, operational_status
  from private.comun_forwarding_source_records
  order by source_kind
$$;

revoke all on function public.comun_forwarding_source_reconciliation() from public, anon, authenticated;
grant execute on function public.comun_forwarding_source_reconciliation() to service_role;
