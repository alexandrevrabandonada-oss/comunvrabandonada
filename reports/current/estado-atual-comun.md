# Estado atual do COMUN

Atualizado em 24 de julho de 2026.

## Linha ativa

- repositório: `alexandrevrabandonada-oss/comunvrabandonada`;
- branch única: `codex/tijolo-41-baseline-canonico`;
- PR única: #30, aberta, não draft e mesclável;
- HEAD de partida deste lote:
  `10ef55ef82d530954aade4dcffa68e2569ac6090`;
- HEAD técnico aprovado:
  `9ea9cc8b2cfaee6303fcd1ee8abe15e65c609107`;
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

Estado técnico anteriormente comprovado após FAST, FULL e Vercel no mesmo HEAD:
`COMUN_SECURITY_HARDENING_READY_TO_PROMOTE`.

Evidências:

- captura sanitizada determinística: run `30054188587`;
- FAST: run `30054740000`, sucesso;
- FULL: run `30054740000`, sucesso;
- Vercel Preview: sucesso;
- fingerprint pré:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- fingerprint pós:
  `82989755711d63a14d209cc2074fd3656288e74fb030331dac282acac7a8265b`.

Não houve migration remota, merge, alteração de domínio ou mudança em
produção. O gate humano permanece 0/3 e o piloto público fechado.

## Promoção final

O run `30057245879` criou o checkpoint sanitizado `8583227864`, mas interrompeu
o runner forward-only com `SOLO_FORWARD_ONLY_FAILED`. A captura read-only
`30057335078` confirmou rollback total: fingerprint pré inalterado, 9
bloqueantes e ledger ausente. A label foi removida, a PR permanece aberta e a
main não avançou.

## Correção do runner em validação

A causa exata foi reproduzida com PostgreSQL 17: a consulta JSON era executada
no formato tabular padrão do `psql`, e o runner aplicava `JSON.parse` sobre
cabeçalho, separador, documento e contador `(1 row)`. A exceção nativa não
recebia marcador próprio, contribuindo para o diagnóstico genérico no workflow.

O patch separa `executeSql`, `queryJson` e `queryScalar`, canoniza o transporte,
sanitiza todas as falhas de processo e adiciona um preflight remoto
estritamente read-only no `COMUN Nightly`. A migration e seu checksum
permanecem idênticos.

Decisão corrente até a conclusão dos novos gates:
`SOLO_PROMOTION_FAILED`. A decisão só poderá avançar para
`COMUN_SECURITY_HARDENING_READY_TO_RETRY_PROMOTION` depois de FAST, FULL,
Vercel e preflight remoto read-only verdes no novo HEAD. A label
`comun:promover` continua ausente.
