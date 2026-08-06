# COMUN 48.1B-R2A-S1 — contrato territorial e onboarding mínimo

Data: 2026-08-06
Branch: `codex/tijolo-48-1b-production-domain-pilot`
Head de trabalho inicial: `2d0f6f04d25f11cc503d1935ec00a30ea51dd9ce`
Head verificado: `9ab125d433fe99c5e4e918b5cc59117155a1d76a`

## Diagnóstico

O onboarding e `saveCommunityProfileAction` dependiam diretamente de
`COMUN_TERRITORY_CATALOG_LOCAL`. Em CI, a jornada agregada usava o fluxo
territorial sem aplicar a migration local-only
`20260805090000_comun_member_profile_territory_selection.sql`; o schema
canônico não possui as colunas `territory_municipality`,
`territory_neighborhood` e `territory_source_version`.

As três migrations da cadeia R2A continuam byte a byte preservadas. Nenhuma
quarta migration foi criada e nenhuma migration territorial foi promovida.

## Contrato implementado

O resolver `lib/comun-territory-profile.ts` centraliza a capacidade:

- `COMUN_TERRITORY_PROFILE_ENABLED=enabled` habilita somente quando uma
  extensão promovida for comprovadamente disponível;
- o alias `COMUN_TERRITORY_CATALOG_LOCAL=enabled` só funciona fora de
  Production com `ALLOW_LOCAL_TESTS=true`;
- em Production, a capacidade fica desligada por padrão;
- a UI recebe a decisão do server-side e não detecta schema por erro de runtime.

Quando desligada, a UI não renderiza cidade/bairro nem inputs territoriais. A
ação envia somente o payload mínimo de perfil e ignora campos territoriais
adulterados no cliente. O onboarding de Calçadas passa a dizer
`Continuar o registro`.

Quando habilitada na lane local-only, cidade e bairro continuam opcionais,
textuais, privados e sem coordenadas.

## Separação de testes

- Jornada candidata Production: alias e flag territoriais desligados; cobre
  conclusão do onboarding sem schema territorial.
- `COMUN Territory / local-only contract`: Supabase descartável, migration
  local-only aplicada explicitamente, persistência de cidade/bairro,
  visibilidade privada e cleanup.

## Verificação

- resolver unitário: 3/3;
- testes unitários existentes: 502/502;
- typecheck: verde;
- lint focal: verde;
- formatting e `git diff --check`: verdes;
- Quality Performance e lane territorial local-only no head final: run `31129274128`, verde;
- topology e runtime E2E privado no head final: run `31130644215`, verde;
- runtime descartável, cadeia R2A e cleanup concluídos sem conexão remota;
- nenhuma consulta ou escrita no Supabase remoto;
- nenhuma alteração de flags, Google, piloto ou `launch_publicly`.

## Estado

O runtime R2A, a jornada candidata sem território e a lane local-only estão
verdes no head final. A cadeia R2A continua sem migration territorial. A PR
#174 pode avançar para READY/merge após a atualização documental; a promoção
remota permanece uma fase posterior e não inclui a migration local-only.

## Pós-merge e promoção R2A (2026-08-06)

- PR #174 mesclada com head `3015626c3f6cb188f2099ffef6bdcc5a58708532`;
- merge commit: `a0eda5cc7ba7e1ae9e7cf74fa9d9f5c24950d378`;
- dry-run remoto reconciliado: exatamente as três migrations R2A, sem
  `20260724233256` no plano e sem a migration territorial local-only;
- promoção remota concluída: as três migrations aparecem aplicadas no ledger;
- SHA das migrations: core `0648404b…`, attachment fix `f092f26d…`, wallet fix
  `0d4b9a27…`;
- exceção externa de Calçadas restaurada byte a byte após a promoção;
- postflight read-only: 14 tabelas R2A com RLS e force-RLS, nenhum grant para
  `PUBLIC`/`anon`/`authenticated` nas tabelas escopadas, RPCs server-only e
  bucket `comun-relata-private` privado;
- `supabase db lint --linked` registrou apenas o finding preexistente da função
  `public.comun_sync_public_search_projection` referindo relação ausente
  `comun_search_candidates`, fora do escopo R2A;
- smoke `https://comunsocial.online`: `/comun`, `/comun/relatar` e
  `/comun/calcadas` em 200; Relata novo, Ônibus e APIs de piloto em 404;
- HTML de `/comun/relatar` sem chaves territoriais, flags ou fixtures;
- nenhuma flag pública, Google, allowlist, piloto ou `launch_publicly` foi
  ativada.

Resultado: `COMUN_48_1B_R2A_REMOTE_SCHEMA_PROMOTED_DOMAIN_STABLE_FLAGS_OFF`.
