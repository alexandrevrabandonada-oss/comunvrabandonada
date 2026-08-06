# COMUN 48.1B-R2A-S1 — contrato territorial e onboarding mínimo

Data: 2026-08-06
Branch: `codex/tijolo-48-1b-production-domain-pilot`
Head de trabalho: `2d0f6f04d25f11cc503d1935ec00a30ea51dd9ce`

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
- nenhuma consulta ou escrita no Supabase remoto;
- nenhuma alteração de flags, Google, piloto ou `launch_publicly`.

## Estado

O runtime R2A permanece verde. A PR #174 precisa de nova CI após este patch;
não está pronta para READY/merge até a jornada Production e a lane local-only
ficarem verdes.
