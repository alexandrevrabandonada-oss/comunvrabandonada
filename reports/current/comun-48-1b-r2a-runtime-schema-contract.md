# COMUN 48.1B-R2A — contrato runtime/schema

## Estado atual

`COMUN_48_1B_R2A_L1_BLOCKED_RUNTIME_E2E_SCOPE`

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
`ffcfc1b22d889452b8c57817393b1b9ea24fca862abc04344f58bae081d2f4ab`.

## Rehearsal local

Foram executados dois bancos descartáveis isolados, A (`56000/56001`) e B
(`56100/56101`), sem seed de conteúdo e sem contato remoto. Ambos aplicaram a
cadeia até a migration candidata. O rehearsal focal R2A verde confirmou criação,
recibo, linha do tempo de quatro estados e retirada; Carteira confirmou
rotação/recuperação e isolamento. A matriz B confirmou 14/14 tabelas com RLS
forçada, zero grants públicos e RPCs somente `service_role`; o bucket é privado,
8 MB e JPEG/PNG/WebP.

O smoke HTTP real em A confirmou wallet `201`, Relata `201`, resposta sem envio
oficial e rollback por flags com todos os métodos ocultos em `404`. O runner
amplo de evidências/coletivos não foi usado porque essas funções pertencem às
migrations local-only excluídas deste bundle R2A; isso é uma fronteira de escopo,
não uma falsa aprovação.

## Próximo gate

Os gates locais do núcleo R2A e o dry-run read-only do SHA atual estão verdes,
mas o terminal L1 permanece bloqueado por escopo de E2E. A PR #174 permanece
draft. Nenhuma flag pública, migration remota,
Google, allowlist, piloto ou `launch_publicly` foi ativado.

O dry-run do SHA atual propôs somente a migration candidata após quarentena
temporária da exceção externa e das migrations explicitamente local-only; todos
os arquivos foram restaurados.
