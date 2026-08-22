# 48.5-A5-A0 — Curadoria cultural unificada e readiness editorial

## Estado

`COMUN_48_5_A5_A0_CURATION_CONTRACT_GREEN_A5_A1_SCHEMA_DELTA_REQUIRED`

- Parent SHA: `0520dcdcafd2f6cefdb9b07407c5f66aa3873a3c`.
- Branch: `codex/48-5-a5-a0-cultural-curation-readiness`.
- Migrations: `0`.
- Production business/schema/environment writes: `0`.
- Publications: `0`; Search writes: `0`; collections and public assets: `0`.
- A3 is preserved as the specialized private handoff; A4 is preserved as the typed progressive-rights contract.

## Modelo reconciliado

| Especialização | Envelope de contribuição | Raiz editorial canônica | Contratos que continuam próprios |
| --- | --- | --- | --- |
| Foto/documento | `comun_archive_submissions` | `comun_archive_items` | asset privado confirmado, derivados, procedência e direitos A4 |
| Arte | `comun_archive_artwork_submissions` | `comun_archive_items` + `comun_archive_artworks` | autoria, rights holder, safety review, asset e derivados de Arte |
| História Oral | `comun_archive_oral_history_suggestions` | `comun_archive_oral_histories` + item | participantes, consentimentos granulares, bruto/transcrição privados e withdrawal |
| Rádio | `comun_radio_contributions` | programas/episódios de Rádio + item | consentimento de voz, usos de música, safety, áudio e transcrição |

Música não foi adicionada ao intake/handoff A3. Seu pipeline continua separado.

Não foi criada fila, tabela ou supermodelo A5: o resolver unifica somente a decisão editorial sobre os modelos existentes.

## Contrato de readiness

`lib/archive/cultural-curation-readiness.ts` recebe evidências normalizadas e devolve especialização, estágio, blockers estáveis, warnings, ações requeridas e evidência por dimensão. Os códigos relevantes incluem `rights_review_required`, `review_only`, `authorship_unconfirmed`, `license_required`, `asset_not_ready`, os consentimentos granulares de História Oral e os gates independentes de voz/música para Rádio.

`publicationEligible` é invariavelmente `false` neste tijolo. Direitos declarados, draft materializado e readiness editorial não autorizam publicação.

## Admin e transições

O admin de contribuições fotográficas agora mostra prontidão por material, procedência, direitos, consentimentos, safety, processamento/assets e editorial. A avaliação não expõe dados privados fora do admin.

`updateSubmissionStatus()` carrega a contribuição no servidor e rejeita transições fora da máquina de estados. Em particular, `ready_for_editorial_review` só é aceito quando o resolver retorna `readyForEditorialReview=true`; o valor de `status` do formulário não é autoridade.

O adapter fotográfico existente só pode criar um rascunho quando `readyForDraftMaterialization=true`. Ele permanece `draft`/`private`, mantém `rights_status=unknown`, não eleva asset para `permission_granted` e não escreve Search, coleções ou publicação.

## Delta mínimo para A5-A1

Há uma lacuna estrutural real para materializar de modo auditável os destinos especializados sem reimplementar uma fila paralela:

- História Oral: a sugestão não possui vínculo canônico ao item/entrevista criada; o próximo tijolo precisa decidir um vínculo privado e imutável entre `comun_archive_oral_history_suggestions` e a raiz oral, sem reduzir seus consentimentos granulares.
- Rádio: uma contribuição pode ser proposta, pauta, áudio ou testemunho e hoje não possui vínculo canônico ao programa/episódio/editorial que eventualmente a acolhe. O próximo tijolo precisa modelar esse handoff sem criar programa, episódio ou publicação automaticamente.

Arte já possui `archive_item_id` no envelope, mas o adapter deve continuar aplicando os child-gates de autoria, direitos, safety e asset antes de criar qualquer draft. A5-A0 não improvisa esses adapters.

## Verificações

- matriz focal do resolver para Foto/Documento, Arte, História Oral e Rádio;
- contrato de admin: pronta para editorial/draft depende do resolver; draft é privado, não promove rights e não escreve Search;
- typecheck, lint, build, unit e `git diff --check` serão registrados no fechamento da PR.

## Invariantes preservadas

`A3=ON/preserved`; `A4=ON/preserved`; `autoPublication=false`; `ProductionBusinessWrites=0`; `ProductionSchemaWrites=0`; `ProductionEnvWrites=0`.
