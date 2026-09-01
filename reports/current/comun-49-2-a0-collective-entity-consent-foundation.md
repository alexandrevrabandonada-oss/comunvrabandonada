# COMUN 49.2-A0-R1 — collective entity consent foundation

## Resultado

Foi criada somente a fundação privada para uma entidade coletiva declarar uma representação e registrar ou revogar consentimento versionado. Não há superfície pública, criação de relato, associação a agrupamento, candidato, projeção, mapa, pauta, ação automática ou integração com Economia Solidária.

Base: `origin/main` em `8db81d1a13c8dd84aa8e5c172c4874a822b285a5`.

## Modelo privado

- `private.comun_relata_collective_entities`: nome público mínimo, tipo, estado, criador e `creation_request_id` para idempotência. Não armazena relatos, evidências, endereço, contato, coordenadas ou atributos de perfil.
- `private.comun_relata_collective_entity_representations`: representação explícita por pessoa, com papel e estados temporais `declared`, `verified` e `revoked`.
- `private.comun_relata_collective_entity_consents`: consentimento explícito, ativo/revogado, versionado como `relata-collective-public-projection-v1`, ligado por chave composta à representação da mesma entidade.
- `private.comun_relata_collective_entity_events`: trilha append-only de criação, declaração, concessão e revogação.

Uma representação `declared` pode registrar o consentimento da entidade para esta fundação, mas nunca é autoridade de publicação. Qualquer projeção futura terá de exigir sua própria política de legitimidade e representação verificada quando aplicável; não foi inventada uma verificação humana nesta etapa.

## Contrato de consentimento e revogação

O contrato versionado afirma participação voluntária, revogável, uso exclusivamente para futura projeção pública sanitizada, ausência de publicação de relatos/evidências/contatos/localizações de pessoas, trilha privada mínima de auditoria e separação do consentimento individual `relata-public-projection-v1`.

`public.comun_relata_collective_entity_consent_set` é idempotente para conceder e revogar. Uma segunda revogação retorna estado inativo sem nova escrita de evento. O fluxo usa bloqueio transacional por entidade para preservar uma única autorização ativa por versão.

`entityConsentAloneCanOpenPublicMap()` permanece literalmente `false`: não há atalho de readiness e a flag canônica de mapa não foi alterada.

## RLS e segurança

As quatro tabelas estão em schema `private`, com RLS habilitado e forçado. `anon` e `authenticated` não têm acesso às tabelas nem às RPCs; execução e privilégios são apenas de `service_role`. A migration não referencia `public.comun_relata_cases`, candidatos, recomputação, projeções ou `COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED`.

## Migration e gates

Migration nova: `20260901000000_comun_relata_collective_entity_consent_foundation.sql`.

O CLI Supabase não está disponível neste host; nenhuma tentativa insegura de TLS foi feita. O workflow descartável `COMUN 49.2-A0-R1 disposable collective entity consent proof` sobe banco efêmero no CI, aplica todas as migrations e prova criação idempotente, consentimento, bloqueio de terceiro sem representação, revogação idempotente, isolamento de relatos e RLS/grants. Ele faz `ROLLBACK` ao final.

Validação local concluída:

- `node --test scripts/49-2-a0-r1-collective-entity-consent-contract.node-test.mjs scripts/ci/classify-migration-lane.node-test.mjs` — 20/20 verde.
- Vitest focado para contrato de entidade e readiness do mapa — 11/11 verde.
- `git diff --check` — verde.
- Classificador de migrations — `not_applicable` para gates históricos, sem expandir owners legados.

Typecheck e lint globais aguardam clone completo do CI: este worktree propositalmente esparso não contém `data/`, `app/` e `pages/` requeridos pelo projeto, portanto os diagnósticos locais são de arquivos ausentes e não de alteração desta fundação.

## Estado remoto e produção

PR/Preview/CI: pendentes de commit e push.

Nenhuma operação Production foi executada. O mapa público permanece canonicamente OFF e `/comun/denuncias/mapa` não foi alterada (404 esperado).

```text
ProductionSchemaWrites=0
ProductionEnvWrites=0
ProductionBusinessWrites=0
ProductionManualDeploys=0
```

## Próximo passo permitido

Somente após os gates remotos verdes: preparar R2 com pipeline de elegibilidade sanitizada e regra explícita de legitimidade. Não criar entidade real, não coletar consentimento real, não publicar e não ativar mapa nesta fundação.
