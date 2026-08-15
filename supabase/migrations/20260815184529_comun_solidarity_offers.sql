create table public.comun_solidarity_offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 3 and 96),
  organization_territory_id uuid not null
    references public.comun_territorial_organizations(territory_id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 140),
  public_summary text not null check (char_length(btrim(public_summary)) between 10 and 1200),
  offer_kind text not null
    check (offer_kind in ('good','service','resource','space','skill','support','other')),
  modalities text[] not null
    check (
      cardinality(modalities) between 1 and 8
      and modalities <@ array['sale','exchange','donation','loan','cession','mutual_aid','cooperation','other']::text[]
      and array_position(modalities, null) is null
    ),
  price_amount_cents bigint
    check (price_amount_cents is null or price_amount_cents between 0 and 9007199254740991),
  price_currency text check (price_currency is null or price_currency = 'BRL'),
  price_note_public text check (price_note_public is null or char_length(price_note_public) <= 300),
  availability_public text check (availability_public is null or char_length(availability_public) <= 500),
  status text not null default 'draft'
    check (status in ('draft','pending_review','published','paused','expired','archived')),
  reviewed_at timestamptz,
  published_at timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comun_solidarity_offers_price_pair check (
    (price_amount_cents is null and price_currency is null)
    or (price_amount_cents is not null and price_currency = 'BRL')
  ),
  constraint comun_solidarity_offers_validity_order check (
    published_at is null or valid_until is null or valid_until > published_at
  ),
  constraint comun_solidarity_offers_publication_gate check (
    status <> 'published'
    or (
      reviewed_at is not null
      and published_at is not null
      and valid_until is not null
      and valid_until > published_at
    )
  )
);

comment on table public.comun_solidarity_offers is
  'Ofertas temporárias de organizações da economia solidária; não representa produto, estoque, pedido, pagamento ou troca concluída.';
comment on column public.comun_solidarity_offers.price_amount_cents is
  'Informação pública opcional; não inicia cobrança, pedido ou pagamento.';

create index comun_solidarity_offers_public_idx
  on public.comun_solidarity_offers(status, valid_until, published_at desc)
  where status = 'published';
create index comun_solidarity_offers_organization_idx
  on public.comun_solidarity_offers(organization_territory_id, status, valid_until);

create trigger comun_solidarity_offers_updated_at
before update on public.comun_solidarity_offers
for each row execute function public.set_updated_at();

alter table public.comun_solidarity_offers enable row level security;
alter table public.comun_solidarity_offers force row level security;

revoke all on table public.comun_solidarity_offers from public, anon, authenticated;
grant select, insert, update, delete on table public.comun_solidarity_offers to service_role;
