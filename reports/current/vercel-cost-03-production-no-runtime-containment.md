# COST-03 — Production no-runtime build containment

## Resultado

Execução baseada no `main` canônico `0770e87f88dbe61846393cab07cb48cb3ac65448`, em worktree isolado. O objetivo foi corrigir a decisão do Ignored Build Step para que Production analise primeiro o impacto cumulativo do diff.

`productionNoRuntime=IGNORE` · `productionRuntime=BUILD` · `productionHighRisk=BUILD` · `productionUnknown=BUILD`

`cumulativeDiffSafety=true` · `failClosed=true` · `previewCheckpointContractPreserved=true`

Não houve escrita em Supabase, negócio, ambiente, flags ou deployment manual nesta execução.

## Mudança aplicada

`scripts/ci/vercel-build-impact.mjs` não retorna mais `BUILD` apenas porque `VERCEL_ENV=production` ou a referência é `main`. A análise agora mantém, nesta ordem:

1. ambiente/ref ausente ou inconsistente: `BUILD`;
2. diff/base/head indisponível, inválido ou vazio: `BUILD`;
3. qualquer arquivo runtime, high-risk ou desconhecido: `BUILD`;
4. somente allowlist segura de no-runtime: `IGNORE`.

`VERCEL_GIT_PREVIOUS_SHA` continua sendo a base preferencial; `HEAD^` só é usado como fallback pelo wrapper existente. O checkpoint `[comun-preview]` continua sendo exigido apenas para runtime em Preview de branch `codex/**`; não é exigido para Production.

## Testes

O teste `scripts/ci/vercel-build-impact.node-test.mjs` preserva os contratos anteriores e cobre a matriz COST-03, incluindo:

- docs, reports, testes, workflows e scripts operacionais seguros em Production: `IGNORE`;
- app/lib/public, migrations, `vercel.json`, package/lockfiles e `scripts/ci`: `BUILD`;
- diffs mistos, desconhecidos, vazios, indisponíveis e referências inválidas: `BUILD`;
- diff cumulativo somente documental: `IGNORE`;
- diff cumulativo que contém runtime: `BUILD`;
- Preview Codex sem checkpoint: `IGNORE`; com checkpoint: `BUILD`.

## Verificações locais

- `node --check` nos scripts alterados: GREEN
- teste focal COST-03: 21 testes GREEN
- `npm run test:unit`: 230 arquivos / 1.287 testes GREEN
- `npm run typecheck`: GREEN
- `npm run lint`: GREEN
- `npm run build`: GREEN
- experiência/coerência: GREEN
- jornadas: GREEN
- superfícies: GREEN
- segurança: GREEN
- qualidade: GREEN
- inteligência cívica: GREEN
- grafo cívico: GREEN
- `git diff --check`: GREEN

## Auditoria Vercel

Janela consultada: `2026-08-19T00:42:47Z` até o momento da execução, usando leitura da API da Vercel para o projeto canônico.

Foram observados 100 registros na janela; 33 deployments Production Git (`target=production`, referência `main`) correspondendo a 31 SHAs únicos. A classificação usa o diff real do SHA e é conservadora: se há arquivo high-risk, classifica como `high_risk_required`; se há arquivo sem classificação conhecida, classifica como `unknown_fail_closed`; nenhum desses casos é ignorado.

| Classe | Deployments | SHAs únicos | Interpretação |
|---|---:|---:|---|
| `runtime_required` | 2 | 2 | diff contém caminho de runtime |
| `high_risk_required` | 9 | 9 | CI, Supabase, configuração, dependências ou equivalente |
| `no_runtime_avoidable` | 14 | 13 | somente allowlist segura |
| `unknown_fail_closed` | 8 | 7 | arquivo fora da allowlist, mantido em BUILD |

Taxa histórica estimada de deployments evitáveis por contagem: `14 / 33 = 42,4%`. Isto é uma estimativa de redução de quantidade de deployments, não cobrança retroativa; a API consultada não forneceu Build CPU exato por deployment.

Os casos solicitados foram confirmados:

- PR #423: merge `6caba5d01cb69ec4e484123e561d77c93779c645`, diff somente em reports, deployment Production `READY`.
- PR #424: merge `0770e87f88dbe61846393cab07cb48cb3ac65448`, diff somente em reports, deployment Production `READY`.

Também foi observada duplicação Git/CLI no mesmo SHA:

- #420 / SHA `f2116b63045df3453de689a3eea52a6447217df4`;
- #421 / SHA `d56412929053ae288082c0a9db29ee633503af7c`.

`duplicateGitCliSameShaObserved=true` · `duplicateRemovalPerformed=false`.

O repositório foi auditado para comandos de deployment/promote/alias. COST-03 não altera esse fluxo. Recomenda-se COST-04 deduplicar por SHA + causalidade + momento da última mutação de environment, distinguindo redeploy necessário por env de redeploy redundante pós-Git.

## Contenção e limites

`cost01PreviewNoRuntimeContainment=ACTIVE`

`cost02PreviewFrequencyContainment=ACTIVE`

`cost03ProductionNoRuntimeContainment=ACTIVE`

`ProductionBusinessWrites=0`

`ProductionEnvWrites=0`

`ProductionSchemaWrites=0`

`manualVercelDeploys=0`

O merge deste PR altera `scripts/ci/**` e, por isso, deve produzir Preview e build Production do próprio COST-03. Esse build é obrigatório e não é contabilizado como evitável. A prova natural seguinte será um closeout documental real; não foi criado commit artificial para gerar uma segunda medição.

## Terminal

`COMUN_COST_03_PRODUCTION_NO_RUNTIME_BUILD_CONTAINMENT_GREEN`
