# 49-E2 — orientação pública e continuidade privada

Entrega candidata no PR #520; não integrada nem ativada. Base consultada:
`74cc0ed1779f5432496c3f852ce92bed3524a3a1`. Head preservado do PR:
`af47674945bed9d9c10a2e499319f61027161683`.

Candidato funcional: `1a46d5550a4ddd98ed467c322dcf1c6e480d4946`.
Tree: `fc4dd7095c2098aaf86f5c3db75fb53d0c5fa6c0`.
Um checkpoint posterior altera somente documentação; a equivalência funcional
deve ser verificada com `git diff --name-only 1a46d555..HEAD`.

## Comportamento e limites

A carteira existente retoma registros, oferece orientação conforme o estado e
volta aos registros sem colocar handles ou conteúdo privado na URL pública.
Loading, erro e conteúdo inválido não viram vazio. Registros retirados não
geram convite para retomada. Consentimentos, permissões, schema, storage e API
de escrita permanecem no contrato existente. A orientação e a busca usam um
fallback público opt-in para permanecer consultáveis sem JavaScript; nenhuma
superfície privada ativa esse fallback.

Escola #503 continua draft/flag off no head `a8dbe550583526eae631deafa3c574fbcfb18993`.
Não houve cópia de seu progresso nem link para uma formação ainda indisponível.
Integração canônica, revisão editorial e ativação permanecem dependências.
Competências e Fábrica continuam entregas abertas, distintas de funcionalidade
integrada. Governança, facilidade percebida e ensaio humano não foram simulados.

## Prova local

Node 22.19.0, npm 10.9.3, dependências do lockfile; Chromium instalado pelo
Playwright do repositório. Testes executados na árvore funcional acima.

| Comando                                                                                                                                                        | Resultado                   | Alcance                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run test:unit`                                                                                                                                            | PASS — 1.407 / 243 arquivos | Suite completa; repetida após correção da shell                                                                         |
| `npx vitest run lib/comun-practice-guidance.test.ts lib/comun-one-product-contract.test.ts lib/comun-wallet-relata-action.test.ts`                             | PASS — 50                   | Fases públicas allowlisted, contratos existentes                                                                        |
| `npm run solo:test`                                                                                                                                            | PASS — 113, zero skipped    | Inventário explícito e controles existentes                                                                             |
| `npm run typecheck`                                                                                                                                            | PASS                        | Tipos; build também verifica a árvore final                                                                             |
| `npm run lint`                                                                                                                                                 | PASS                        | ESLint completo; arquivos modificados rechecados depois                                                                 |
| `npm run build`                                                                                                                                                | PASS                        | Compilação otimizada e geração de páginas                                                                               |
| `npx playwright test -c playwright.participation-continuity.config.ts`                                                                                         | PASS — 12, zero retries     | Carteira sintética: leitura, foco, retorno, reload, vazio, erro, retry, resposta inválida, retirada; 360×800 e 1366×768 |
| `npx playwright test -c playwright.experience-coherence.config.ts tests/experience-coherence/participation-paths.spec.ts --project=360x800 --project=1366x768` | PASS — 6, zero retries      | Público canônico/legacy; orientação e formulário da busca sem JavaScript                                                |
| Prettier dos arquivos alterados e `git diff --check`                                                                                                           | PASS                        | Formatação e whitespace                                                                                                 |

Dois testes Node de coerência e quatro de classificação de superfícies também
passaram. Axe: zero findings serious/critical nas superfícies avaliadas; não
equivale a certificação universal de acessibilidade.

Os 12 casos da carteira interceptam respostas com uma fixture sintética e
contam chamadas de escrita: zero. Não provam identidade Auth, RLS ou persistência
do backend. O reload relê a fixture; não certifica recuperação real de dados.
Os seis casos públicos exercitam a aplicação local. Screenshots sintéticos
mobile/desktop foram inspecionados fora do repositório. Dispositivos físicos,
tecnologia assistiva, percepção de fricção e ensaio humano permanecem NOT_RUN.

## Findings corrigidos

1. Falha de leitura era indistinguível de carteira vazia: estados explícitos e retry.
2. Contraste inadequado na carteira legacy: fundo e texto corrigidos, axe repetido.
3. Shell prendia conteúdo público no loading sem JavaScript: fallback público opt-in.
4. Inventário Solo desatualizado: 16 nomes já em main, reproduzidos na base limpa
   `74cc0ed1`, registrados explicitamente. Arquivo desconhecido segue bloqueado.

Uma tentativa da suíte pública perdeu o servidor compartilhado; não foi contada
como PASS. Repetição independente expôs a falha sem JavaScript e, depois da
correção, os seis casos passaram com servidor próprio. Nenhum retry foi adicionado.

## Entrega e operação

Primeiro checkpoint `ab06c1d86ef8aa1bbc8cea07823642572207beae`: Preview Git
`dpl_H82gGSbZonFT5DqF3GDA2ZWVEUbR` READY e GitHub Deployment `6899813907`
no SHA exato, environment Preview, status success, URL HTTPS `.vercel.app`.
Um checkpoint documental subsequente corrige somente Prettier do roadmap e
registra os blockers abaixo; seu Preview precisa de validação própria.

Gates globais não verdes: preflights A2/A4/A5 e P6C-C falharam antes de qualquer
prova de produto. Artifacts das runs `37559796309`, `37559796275`, `37559796294`
e `37559796222` mostram o dry-run recusando
`20260922120000_comun_canonical_security_hardening_v2.sql` como arquivo anterior
à última migration remota. Isso requer reconciliação do planner com a release
externa aceita, em frente separada; não autoriza `include-all`, reparo de history
ou replay remoto. Nenhuma migration changed nesta entrega. Não se classificam
esses failures como skipped nem como PASS.

A run Launch Readiness `37559796257` encontrou somente Prettier no roadmap:
correção documental aplicada e revalidada com Prettier 3.9.9. Resultados das
demais suítes ainda em execução não são presumidos. O PR permanece draft.

O workflow `comun-participation-continuity.yml` usa conteúdo sintético e não
recebe secrets Production. Checkpoint/Preview e checks remotos pertencem ao SHA
da revisão, registrados no PR. Resultado local não é transferido para deployment
ou Production. `pilot_noindex` permanece; zero merge, migration activation,
schema write, business write ou alteração de flag Production nesta rodada.

Próxima frente: integrar os modelos de progresso da Escola quando #503 estiver
reconciliado e aprovado; manter orientação pública e convites voluntários nos
fluxos existentes enquanto essa dependência continua aberta.
