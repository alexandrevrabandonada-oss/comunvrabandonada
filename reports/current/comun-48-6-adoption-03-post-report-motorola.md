# COMUN 48.6 Adoption-03 — Pós-relato Motorola

## Escopo e invariantes

- `classificationEngineChanged=false`
- `routingEngineChanged=false`
- `officialChannelsChanged=false`
- `persistenceChanged=false`
- `map=false`
- `autoSend=false`
- `autoPauta=false`
- `autoAction=false`
- `ProductionSchemaWrites=0`
- `ProductionEnvWrites=0`
- `ProductionBusinessWrites=0`

## Resultado de UX

- `postSavePrimaryActionsVisible=1`
- `recoveryBeforeSecondaryPanels=true`
- `technicalGroupingHidden=true`
- `advancedGuidanceProgressive=true`
- `evidenceProgressive=true`
- `educationChannelsBeforeNetworkChoice=false`
- `advancedGuidanceDefaultExpanded=false`
- `evidenceDefaultExpanded=false`
- `emergencySafetyAlwaysVisible=true`

O recibo agora mantém confirmação, protocolo, código de recuperação e classificação juntos. A ação primária `Continuar` revela a próxima decisão local; em Educação, isso abre a pergunta de rede sem despejar canais. `Não sei` continua uma escolha válida. Emergência, proteção infantil e seus avisos não ficam atrás da progressão.

## Validação local

- `npm run test:unit -- --run lib/comun-48-6-adoption-03-post-report-motorola.test.ts lib/comun-relata-routing.test.ts lib/comun-education-service-routing-v1.test.ts lib/comun-relata-evidence.test.ts lib/server/comun-denuncias-routing-guide.test.ts`: **40 testes aprovados**.
- `npm run test:unit`: **1294 testes aprovados em 231 arquivos**.
- `npm run typecheck`, `npm run lint` e `git diff --check`: aprovados.
- `npm run build`: **GREEN** no `origin/main` e no Adoption-03 rebased, em worktrees limpos com dependências físicas.
- O suposto blocker em `app/comun/reciclagem/page.tsx` não foi reproduzido: o `origin/main` atual compilou GREEN, portanto nenhum gate-repair foi criado nem integrado.
- A primeira tentativa de e2e usou `NODE_OPTIONS=--use-system-ca`; a verificação TLS permaneceu ativa e o erro de certificado foi recuperado. O Supabase local continuou bloqueado porque o Docker Desktop não estava em execução.
- `playwright.comun-relata-mocked.config.ts`: **4 cenários GREEN** (390x844 e desktop), com mocks locais de receipt, save, canais, evidências e agrupamento. Não houve banco, Supabase ou write de Production.

## R1 — gate repair e validação final

- `functionalImplementationCommit=f2824246`
- `rebaseBase=7118a08b917f454a32afb094d0d59101636ad052`
- `preExistingBuildBlocker=false`
- `preExistingBuildBlockerFixedSeparately=false`
- `recyclingGateRepairPR=not_required`
- `globalBuildFinal=GREEN`
- `localSupabaseTLS=RECOVERED_WITH_SYSTEM_CA`
- `localE2EInfrastructureBlocked=true` (Docker Desktop indisponível)
- `tlsVerificationDisabled=false`
- `mobile390x844=GREEN_MOCKED_CONTRACT`
- `mobile390x844Validated=true`

## Terminal final esperado

`COMUN_48_6_ADOPTION_03_POST_REPORT_MOTOROLA_GREEN_MAP_OFF`

```text
singleSentenceCapturePreserved=true
classificationPreserved=true
officialRoutingPreserved=true
postReportOneNextAction=true
recoveryPrioritized=true
educationQuestionProgressive=true
technicalGroupingVisible=false
advancedGuidanceDefaultExpanded=false
evidenceDefaultExpanded=false
emergencySafetyAlwaysVisible=true
publicMap=false
automaticOfficialSend=false
automaticPauta=false
automaticAction=false
ProductionSchemaWrites=0
ProductionEnvWrites=0
ProductionBusinessWrites=0
COST01=preserved
COST02=preserved
COST03=preserved
COST04=preserved
```
