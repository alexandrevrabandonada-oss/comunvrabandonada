# Estado atual do COMUN

Atualizado em 23 de julho de 2026.

## Linha ativa

- repositório: `alexandrevrabandonada-oss/comunvrabandonada`;
- branch única: `codex/tijolo-41-baseline-canonico`;
- PR única: #30, aberta, não draft e mesclável;
- HEAD de partida deste lote:
  `10ef55ef82d530954aade4dcffa68e2569ac6090`;
- base `main`: `b2f6733dacd15ec21601ed6b6837b42213b87d70`.

## Hardening

A release `20260723220112-canonical-security-hardening` ficou executável pelo
role `postgres` disponível. Ela corrige integralmente o escopo controlável pelo
COMUN e mantém os defaults de `supabase_admin` como observações gerenciadas.

Foram preparados:

- view pública `security_invoker`, RLS e grants de coluna sanitizados;
- defaults futuros pertencentes a `postgres` endurecidos;
- duas funções definer com `search_path=pg_catalog`;
- trigger `auth.on_auth_user_created` preservado;
- ledger privado `public.comun_schema_releases`;
- lint obrigatório de privilégios explícitos;
- runner de release por manifesto, checksum e fingerprints;
- CI com diagnóstico separado e repetição única para 502 transitório.

## Decisão

Estado técnico esperado após FAST, FULL e Vercel no mesmo HEAD:
`COMUN_SECURITY_HARDENING_READY_TO_PROMOTE`.

Não houve migration remota, `comun:promover`, merge, alteração de domínio ou
mudança em produção. O gate humano permanece 0/3 e o piloto público fechado.
