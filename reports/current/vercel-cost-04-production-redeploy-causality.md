# COST-04 — Production redeploy causal deduplication

## Escopo e baseline

Esta entrega parte do `main` canônico `d2e2454eee9da0adbaa06363d485b7265e6d5015`, merge documental do COST-03. O trabalho foi feito no worktree isolado da branch `codex/cost-04-production-redeploy-causality`; o worktree original foi preservado.

COST-01, COST-02 e COST-03 permanecem preservados. COST-04 não altera produto, Supabase, secrets, flags ou o fluxo operacional de deployment CLI fora dos dois runners explicitamente abrangidos.

## Diagnóstico Vercel

Janela de auditoria herdada do COST-03: `2026-08-19T00:42:47Z` até a execução desta entrega. A API da Vercel foi consultada somente em modo read-only para o projeto canônico.

Foram observados deployments Production Git documentados no COST-03, incluindo:

- PR #423: merge `6caba5d01cb69ec4e484123e561d77c93779c645`, somente reports, Production `READY`;
- PR #424: merge `0770e87f88dbe61846393cab07cb48cb3ac65448`, somente reports, Production `READY`;
- PR #425 / COST-03: merge `d2e2454eee9da0adbaa06363d485b7265e6d5015`, Production `READY`;
- PRs #420 e #421: duplicações Git/CLI observadas para os SHAs `f2116b63045df3453de689a3eea52a6447217df4` e `d56412929053ae288082c0a9db29ee633503af7c`.

Classificação histórica conservadora:

- `no_runtime_avoidable`: #423 e #424, por diff documental e sem mutação de environment causal associada;
- `unknown_fail_closed`: duplicações Git/CLI sem timestamp de mutação de environment comprovável na API disponível; não foram tratadas como seguramente evitáveis;
- `runtime_required` / `high_risk_required`: continuam BUILD conforme o contrato COST-03.

Não foi inventado custo por deployment. A API consultada não fornece Build CPU exato por deployment. `duplicateGitCliSameShaObserved=true`; `duplicateRemovalPerformed=false`; `COST04Recommended=true`.

## Contrato implementado

O novo núcleo puro em `scripts/ci/vercel-production-redeploy-causality.mjs` decide por:

1. SHA exato;
2. target Production e estado do deployment;
3. timestamp de criação/início do deployment;
4. timestamp da mutação do environment relevante;
5. necessidade separada de build e promoção/alias.

Um deployment pronto só é reutilizado após a mutação quando foi criado estritamente depois dela. Deployment ativo do SHA exato é aguardado de forma limitada; falha, cancelamento, timeout ou metadata inválida fecham em BUILD. Deployment pronto sem alias canônico resulta em promoção somente, sem novo build.

O contrato continua fail-closed para base, head, diff ou metadata ausentes. COST-03 permanece intacto: Production no-runtime pode ser `IGNORE`, runtime/high-risk/unknown exigem `BUILD`, e o checkpoint `[comun-preview]` continua sendo regra de Preview Codex, não de Production.

Os runners atualizados são:

- `scripts/run-48-6-b2-a2-production.sh`;
- `scripts/run-48-6-b2-a2-r5-sensitive-spatial-key.sh`.

Ambos fazem reconsulta imediatamente antes de decidir, não fazem `vercel deploy --prod` quando um deployment exact-SHA fresco pode ser reutilizado e preservam o caminho de promoção sem rebuild. Nenhuma lógica lê valor de secret; a causalidade de environment usa somente metadata.

## Testes

O teste do núcleo cobre 20 cenários, incluindo deployment READY fresco, mutação posterior, igualdade de timestamp, SHA divergente, Preview, falha/cancelamento, espera por deployment ativo, CLI promote-only, alias canônico, metadata ausente/malformada, recheck, replay e estados desconhecidos.

O teste de contrato verifica que os dois runners consultam Production, usam o núcleo causal, mantêm `create_production_deployment` atrás de `needsBuild` e não removem o caminho de deploy obrigatório.

## Escritas e limites

Durante implementação e auditoria:

`ProductionBusinessWrites=0`

`ProductionEnvWrites=0`

`ProductionSchemaWrites=0`

`ManualProductionBuildsCreated=0`

Não houve cancelamento de deployment existente, alteração de Spend Management ou deploy manual para produzir prova. O único build Production esperado desta frente é o build normal decorrente do merge do próprio COST-04, pois a mudança toca `scripts/ci/**` e os runners.

## Auditoria de comandos e recomendação

O repositório contém caminhos históricos e especializados de deployment/promote/alias além dos dois runners corrigidos. Eles foram classificados como ativos/legados/unknown conforme o script e a evidência disponível, sem alteração neste tijolo. A recomendação para COST-04 é aplicar deduplicação apenas onde a causalidade de environment puder ser comprovada; nunca deduplicar por SHA isolado. Para COST-05, manter como requisito futuro a observabilidade causal comum antes de ampliar a cobertura.

## Resultado esperado

`COMUN_COST_04_PRODUCTION_REDEPLOY_CAUSAL_DEDUP_GREEN`

`productionReuse=CAUSAL`

`productionPromoteOnly=SEPARATE`

`productionRuntime=BUILD`

`productionHighRisk=BUILD`

`productionUnknown=BUILD`

`cumulativeDiffSafety=true`

`failClosed=true`

`previewCheckpointContractPreserved=true`
