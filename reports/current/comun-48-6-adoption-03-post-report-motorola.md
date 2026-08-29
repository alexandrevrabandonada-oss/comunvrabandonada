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
- `tsc --noEmit`: aprovado com dependências locais disponíveis.
- `git diff --check`: aprovado.
- E2E de `390x844`: não iniciou porque o harness local tentou obter `supabase` por `npx` e falhou com `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. O navegador integrado também confirmou que `http://127.0.0.1:3137/comun/relatar` recusava conexão. Nenhum dado de produção foi criado.
- `next build --webpack`: a compilação chegou a concluir, mas o typecheck global falhou em defeito pré-existente e fora deste escopo: `app/comun/reciclagem/page.ts` exporta `Hero`, que não é uma exportação de página válida. O Turbopack padrão também não aceita o `node_modules` compartilhado do worktree para esta validação local.

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
