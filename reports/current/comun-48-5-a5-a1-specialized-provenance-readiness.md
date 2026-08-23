# 48.5-A5-A1 — Proveniência especializada imutável e readiness pré-materialização

## Estado

Candidate local para CI/PR. O rollout Production é deliberadamente separado.

- Parent main pós-#363: `d2f220d32c2dc5ca602719ecc44c6271af0002af`.
- Branch: `codex/48-5-a5-a1-specialized-provenance-readiness`.
- Migration: `20260823003249_comun_cultural_specialized_provenance_readiness.sql`.
- SHA-256: `771975081046474022764A8E69743CC6015EBB4A817C614719FA7D6DFC74BDFB`.
- Production migrations, business/schema/environment writes, fixtures, publications, Search writes and public-asset promotions: `0`.

## Cardinalidade reconciliada

| Fonte especializada | Raiz canônica | Decisão |
| --- | --- | --- |
| `comun_archive_oral_history_suggestions` | item `oral_history` + `comun_archive_oral_histories` | A sugestão pode ganhar no máximo uma raiz privada. Várias sugestões podem contextualizar a mesma raiz no futuro; por isso não há unicidade inversa artificial. |
| `comun_radio_contributions` | item `community_radio_program` ou `community_radio_episode` | Cada contribuição recebe no máximo um alvo canônico tipado. Um programa/episódio pode ter várias contribuições contextuais, especialmente correções, complementos ou retiradas. |
| `comun_archive_artwork_submissions` | `archive_item_id` existente | Nenhuma coluna nova: Arte já possui vínculo e preserva autoria, holder, licença, safety, assets e derivados próprios. |

Não havia uso que modelasse múltiplos alvos canônicos por envelope. A FK direta no envelope é, portanto, a menor estrutura que representa a cardinalidade comprovada; nenhuma fila, workflow genérico, supermodelo ou ledger paralelo foi criado.

`pauta_proposal` e `agenda` continuam pendentes de rota editorial própria. `own_music` permanece bloqueado como fronteira do pipeline Música/Rádio. `community_audio` e `authorized_testimony` exigem destino de episódio e programa explícitos; o texto livre nunca escolhe o destino. `correction`, `complement` e `withdrawal` podem ser reconciliados manualmente com uma raiz existente, sem criar uma nova.

## Schema e proveniência

A migration é somente aditiva e não atualiza linhas existentes:

- História Oral recebe `private_root_archive_item_id` nullable.
- Rádio recebe o par nullable `private_root_kind` (`program|episode`) + `private_root_archive_item_id`; a constraint rejeita par parcial.
- Trigger tipado verifica `oral_history`, `community_radio_program` e `community_radio_episode`, conforme o vínculo.
- Depois de estabelecido, o vínculo não pode ser limpo nem retargeted silenciosamente.
- As quatro funções de link/materialização usam bloqueio `FOR UPDATE`, retornam o mesmo alvo no replay e falham fechadas em conflito. Elas são `security invoker`, com `EXECUTE` revogado de `public`, `anon` e `authenticated`, e concedido apenas a `service_role`.

As ações server-side ainda não são expostas por rota pública. Elas requerem admin/editor e registram `logComunAdminAction`; o RPC continua sendo a autoridade atômica. Assim, o merge não exige as colunas novas em Production antes do rollout A5-A1-R1.

## Raízes privadas

- História Oral: cria item `draft`/`private`, `rights_status=unknown` e raiz `publication_status=consent_pending`. O resumo de sugestão entra somente em `internal_summary`. O criador legado também foi corrigido para criar novos rascunhos com `rights_status=unknown`; nenhuma linha histórica é modificada.
- Rádio: `program_proposal` pode criar somente programa privado. `community_audio`/`authorized_testimony` podem criar somente episódio privado e exigem programa existente escolhido explicitamente. Nenhum episódio, grade, feed, asset, Search ou publicação é criado por reflexo.

## Readiness em duas fases

`lib/archive/cultural-curation-readiness.ts` continua sendo o único resolver.

1. `readyForPrivateRootCreation` avalia evidência disponível no envelope: handoff, título/resumo, proveniência, status compatível e decisão editorial explícita. Para Rádio inclui a escolha explícita de destino/programa.
2. `readyForEditorialReview` continua a avaliar direitos, assets, safety e os child-gates que só existem após a raiz.

Para História Oral, a criação de raiz não exige consentimento final de publicação, áudio público, transcrição pública ou aprovação de participante. Após a raiz, preservação/gravação/voz/transcrição/consentimento final/withdrawal continuam distintos e faltas bloqueiam a prontidão editorial. `publicationEligible` permanece invariavelmente `false`.

## Segurança e efeitos proibidos

Anon e authenticated permanecem sem CRUD dos envelopes especializados; service role mantém apenas as operações necessárias. Não há views/RPCs públicos novos.

O contrato proíbe publication, `visibility=public`, `status=published`, Search, coleções, promoção de asset e inferência de autoria, titularidade, consentimento ou licença. Direitos completos, draft privado e readiness editorial não autorizam publicação.

## Provas

- Testes focais de readiness e contratos A3/A4/A5-A1: GREEN localmente.
- Lint, typecheck, build e `git diff --check`: GREEN localmente.
- Workflow dedicada: `.github/workflows/comun-48-5-a5-a1-disposable.yml`. Ela inicia apenas Supabase local no runner, faz reset/replay e executa `scripts/comun-cultural-specialized-provenance-a5-a1-disposable.sql`.
- A prova valida fresh apply, replay, vínculos nulos de legado, alvo inválido/cross-domain, par parcial, retargeting, raízes privadas, grants/RLS e ausência de Search/assets/coleções; as fixtures são terminadas com `ROLLBACK`.

Neste host, a execução local do stack foi bloqueada antes de migrations por `LegacyDbSetupError`: uma imagem de suporte falha com `ERR_INVALID_PACKAGE_CONFIG` para `dotenv` sob Node `v24.19.0`. Nenhum schema nem dado local/remote foi aplicado nesse erro. A workflow CI é a prova descartável autoritativa desta migration.

## Próximo boundary

`A5-A1-R1 — Production rollout` deverá, em execução separada, fazer preflight read-only, conferir o checksum acima, aplicar somente esta migration e manter A3/A4 inalteradas. Não usar `db push`, repair, reset, seed remoto ou `--include-all`.

Estado esperado após CI/merge: `COMUN_48_5_A5_A1_SPECIALIZED_PROVENANCE_SCHEMA_GREEN_PRODUCTION_ROLLOUT_REQUIRED`.

`A3=ON/preserved`; `A4=ON/preserved`; `autoPublication=false`; `ProductionBusinessWrites=0`; `ProductionSchemaWrites=0`; `ProductionEnvWrites=0`; `ProductionMigrationApplied=false`.
