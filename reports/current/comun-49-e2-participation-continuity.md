# 49-E2 — orientação pública e continuidade privada

Entrega candidata no PR #520; não integrada nem ativada. Base consultada:
`74cc0ed1779f5432496c3f852ce92bed3524a3a1`. Head preservado do PR:
`af47674945bed9d9c10a2e499319f61027161683`.

Candidato funcional: `1a46d5550a4ddd98ed467c322dcf1c6e480d4946`.
Tree: `fc4dd7095c2098aaf86f5c3db75fb53d0c5fa6c0`.
Os checkpoints até `11127473e5bba612826a9b87e7bfd08d06923c4c` alteram somente
documentação. A continuação abaixo acrescenta correção de CI; o runtime de UI
continua idêntico a `1a46d555` e deve ser comparado por arquivos, sem transferir
resultados dos scripts de CI antigos para os novos.

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
ou replay remoto. Nenhuma migration mudou nesta entrega. Não se classificam
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

## Continuação — preflights históricos

Os cinco consumers A1/A2/A4/A5/P6C-C passam a usar o reconciliador existente
quando o estado é promoted, ou sem mudança SQL no P6C-C. Candidate permanece
no caminho anterior, com plano exato e restauração. Metadata/RLS anteriores
continuam obrigatórios; nenhuma lane é dispensada. O helper exige a linha única
accepted do Hardening e hashes/fingerprints imutáveis antes de isolar temporariamente
somente os dois arquivos já aplicados. Arquivo SQL pendente desconhecido bloqueia.

Reutiliza-se a correção stdout/stderr de Escola #503 no SHA `a8dbe550583526eae631deafa3c574fbcfb18993`, sem portar runtime, migration ou progresso.
Cada child process recebe `PGOPTIONS=-c default_transaction_read_only=on`;
a consulta tem BEGIN READ ONLY/ROLLBACK. Exit nonzero, sinal ou saída sem marcador
de sucesso bloqueiam, mesmo que outra stream contenha texto de sucesso.

PASS local: 15 testes Linux (quatro do helper e execução do passo real de onze
workflows), cobrindo ledger ausente/divergente, stdout/stderr, plano desconhecido,
saída vazia, erro de processo e restauração byte-identical. Stubs são prova do
contrato de processo, não prova de banco. 113 Solo, ESLint e Prettier dos arquivos
afetados, checks Node e diff-check passaram. Migration/manifest/release bundles
permanecem sem diff. A prova read-only real fica para os mesmos gates remotos.

Ubuntu WSL foi usado com Node 22.19.0 temporário, pacote verificado contra
SHASUMS256 oficial: `c0649af18e6a24f6fe5535a3e86b341dd49a8e71117c8b68bde973ef834f16f2`.
Não houve uso de credencial Production nesses testes locais.

BLOCKED — executor Docker local da Escola: Docker Desktop 4.61.0 foi iniciado,
mas o backend reporta falha no Inference manager ao remover o socket dockerInference.
O socket é um reparse point de tamanho zero inacessível ao sistema. A tentativa
reversível de renomeá-lo para preservação falhou; o serviço Windows está parado
e não pôde ser aberto por Start-Service nesta sessão. A distro docker-desktop
permanece stopped; Ubuntu funciona. Não foi feito reset/factory reset, remoção
recursiva, limpeza de volumes ou alteração do settings-store. Requisito mínimo:
recuperar a inicialização do Docker e tornar a API Linux responsiva. Até isso,
Auth/Postgres da Escola não recebe PASS e não usa banco hospedado como substituto.

### Resultado remoto do reconciliador

No SHA `be68783e249840114544b6d687d040782bc4f508`, os cinco preflights reais
passaram: A1 run `37561034654`, A2 `37561034836`, A4 `37561034782`, A5
`37561034788` e P6C-C `37561034690`. Preview Git exato READY,
GitHub Preview Deployment `6899994457` success e COST-02 local checkpoint-fresh.
Esses resultados não significam promoção de schema ou certificação global.

A UI da run `37561034849` terminou com 11/12: o caso de resposta inválida usava
getByRole(alert) na página inteira e encontrou também **next-route-announcer**.
O log comprovou que o alerta correto da carteira estava presente. Correção focal:
selecionar o alerta dentro da carteira e exigir a mensagem de indisponibilidade.
Nenhum retry, timeout ou comportamento de aplicação foi alterado. Repetição local
completa: 12/12 PASS, zero retries. A nova revisão remota é vinculada ao novo head
no corpo do PR, sem transferir a falha anterior para PASS.

Na run `37561385804`, head `49329c37888b5b1f00471328e869e27b20d7d406`,
o contrato 48.3-E2 falhou porque comparava a formatação antiga do comando
Supabase (aspas simples/linha única) com o helper formatado pelo Prettier.
O teste agora inspeciona a AST e exige exatamente um spawnSync, executável
Supabase e os cinco argumentos, incluindo --dry-run e a origem da URL.
Nenhum comando, aplicação, workflow ou regra de autorização foi alterado
nesta correção. Repetição completa local: 243 arquivos, 1.407 testes PASS;
ESLint, Prettier e diff-check dos arquivos afetados PASS. A conferência remota
continua no novo checkpoint; o PR permanece draft enquanto houver pendências.
