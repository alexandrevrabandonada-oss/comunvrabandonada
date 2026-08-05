# COMUN 48.1B-R2A — contrato runtime/schema

## Estado atual

`COMUN_48_1B_R2A_RUNTIME_SCHEMA_ALIGNMENT_REQUIRED`

O bundle anterior criava tabelas `comun_production_*` que não eram chamadas
pelas APIs reais. A migration candidata foi corrigida para os nomes canônicos
do runtime: Relata (`private.comun_relata_*` / `public.comun_relata_*`),
Carteira (`private.comun_participation_wallet_*`) e evidências privadas.

## Contrato comprovado estaticamente

- RPCs Relata, Carteira, localização e anexos preservam as assinaturas usadas
  por `app/api/comun/relata` e `app/api/comun/participation-wallet`;
- `comun_participation_wallet_link_account` exige gesto explícito, usuário
  autenticado, é idempotente e registra evento;
- schema `private` revoga acesso de `public`, `anon` e `authenticated`;
- tabelas têm RLS habilitada e forçada, sem policies de cliente;
- funções são `security definer`, com `search_path=pg_catalog,private,public`,
  `execute` somente para `service_role`;
- sequência e Storage privado são cobertos por grants/revogação explícitos;
- publicação, forwarding, STMU e dados sintéticos não entram neste bundle;
- rollback permanece por flags, com APIs dormentes em 404 e dados preservados.

## Dry-run reconciliado

Com a migration excepcional de Calçadas e as doze migrations local-only
explicitamente manifestadas em quarentena restaurável, `supabase migration
list --linked` e `supabase db push --linked --dry-run` propuseram somente:

`20260805130000_comun_production_pilot_core_bundle.sql`

Seeds e roles ficaram vazios; nenhum push mutável foi executado. O SHA atual é
`a107009151cd15bf8468ed3fbdaa422dddaecad1e418954977dbaacd0c0627df`.

## Rehearsal local

Foi tentado reset em banco local descartável. O Docker não conseguiu iniciar o
container PostgreSQL do projeto porque a porta publicada `55432` está em
conflito/reserva do host (`LegacyStartContainerStartError`). O container foi
recriado apenas no escopo do laboratório, sem tocar em Supabase remoto. Até a
recuperação dessa porta, RLS/runtime E2E em banco não são promovidos a verde.

## Próximo gate

Executar duas rehearsals em bancos locais frescos, E2E real de Carteira/Relata/
evidência/Conta, auditoria RLS/grants por papel e prova de rollback. A PR #174
permanece draft; nenhuma flag, migration remota, Google, allowlist, piloto ou
`launch_publicly` foi ativado.
