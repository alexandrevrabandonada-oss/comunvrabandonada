# COMUN — Tijolo 48.0A-N1 — gate Chromium de rede degradada

Atualizado em 3 de agosto de 2026.

## Resultado desta candidata

`COMUN_QUALITY_NETWORK_CHROMIUM_STABILIZATION_CANDIDATE`

O marcador terminal `COMUN_QUALITY_NETWORK_CHROMIUM_STABILIZED` depende de
duas execuções remotas limpas: o workflow focal e o workflow pós-merge
completo. Nenhuma mudança de produto, flag, rota, banco ou integração externa
integra esta faixa.

## Baseline resolvido

- `repository_main_sha`: `28dd410dffe96b1065a2846545dbde2a20799bc9`;
- `functional_product_sha`: `c70d1ceab802a7df591c9e6ac2aee07d364c3b1b`;
- `production_observed_sha`: `c70d1ceab802a7df591c9e6ac2aee07d364c3b1b`;
- o `main` documental é descendente legítimo do merge funcional;
- a ausência de deployment do commit exclusivamente documental não é drift;
- Production, em leitura: `/comun/relata` = `404`, `/comun` = `200`;
- commit intermediário entre o estado informado e `origin/main`: nenhum.

## Evidência dos dois crashes

| Attempt | Run/job                   | Runner                                             | Início do gate     | Resultado         |
| ------- | ------------------------- | -------------------------------------------------- | ------------------ | ----------------- |
| 1       | `30818903916/91703507060` | GitHub-hosted Ubuntu 24.04, image `20260720.247.2` | 18 casos, 1 worker | `SIGSEGV`, exit 1 |
| 2       | `30818903916/91705236587` | GitHub-hosted Ubuntu 24.04, image `20260720.247.2` | 18 casos, 1 worker | `SIGSEGV`, exit 1 |

Nos dois attempts, Node foi `22.19.0`, Playwright `1.61.1` e Chromium
headless shell revision `1228` (`149.0.7827.55`). PWA, acessibilidade,
performance e carga passaram antes do crash. O primeiro processo caiu ao criar
o contexto do projeto low-Android; no segundo attempt, caiu ao criar o contexto
de um projeto desktop que deveria terminar pulado. O stderr registrou
`Received signal 11 SEGV_MAPERR 0000000001b0` e o Playwright encerrou com
`browser.newContext: Target page, context or browser has been closed`.

Trace e contexto de erro foram gerados no diretório de resultados, mas o
workflow publicou deliberadamente somente JSON sanitizado. Vídeo estava
desligado e screenshot configurado apenas em falha. Memória, disco e
`/dev/shm` não foram medidos nos runs históricos; portanto, falta de memória não
é declarada causa. A candidata passa a imprimir `free -h` e `df -h . /dev/shm`
antes do teste, sem inserir esses dados no artifact allowlisted.

## Causa operacional confirmada

O script anterior usava `playwright.quality-performance.config.ts`, com nove
projetos. Os dois testes `@network` eram multiplicados por todos eles. O skip do
cenário lento ocorria dentro do corpo do teste e a assinatura já solicitava a
fixture `page`; assim, browser, contexto e página eram criados antes do skip.

Reprodução local controlada no mesmo Playwright/Chromium:

| Contrato                                   | Casos | Chromium iniciados | Duração | Resultado       |
| ------------------------------------------ | ----: | -----------------: | ------: | --------------- |
| comando anterior                           |    18 |                  9 |    44 s | 10 pass, 8 skip |
| anterior + `--project=320x568-low-android` |     2 |                  1 |    16 s | 2 pass          |
| configuração focal, execução 1             |     2 |                  1 |    16 s | 2 pass          |
| configuração focal, execução 2             |     2 |                  1 |    15 s | 2 pass          |

O pico de memória não foi comparado retroativamente porque não havia telemetria
de processo nos runs anteriores. A redução comprovada é de nove para um
processo Chromium por execução, sem inferir causalidade de memória.

## Patch

- configuração `playwright.quality-network.config.ts` com um único projeto
  Chromium low-Android, `workers: 1`, `fullyParallel: false` e `retries: 0`;
- os dois checks funcionais foram preservados: fallback da busca e rede lenta
  com latência, throughput, Service Worker, offline e recuperação online;
- trace em falha e screenshot em falha preservados; vídeo continua desligado;
- runner próprio classifica `browser_process_crash`, `functional_failure` ou
  `green` e sempre mantém o exit code real;
- artifact contém somente run, attempt, SHA, runner, Node, Playwright, revisão
  do Chromium, projeto, etapa, exit code, signal e classificação;
- lane remota focal em PR (e `mode=network` para despacho posterior), sem retry
  e sem `continue-on-error`;
- PR lane e post-merge continuam executando o mesmo contrato funcional focal.

## Diferenças entre lanes

A PR lane usa release e Supabase descartáveis locais e executa as regressões
amplas. A lane pós-merge usa Production, preflight de SHA, orçamento obrigatório
e transporte agregado allowlisted. Antes do patch ambas reutilizavam a mesma
configuração geral de nove projetos para rede. Depois do patch ambas chamam o
runner focal idêntico; somente a origem da aplicação continua diferente.

## Gates

- runner node tests: `2/2` verdes;
- rede focal local consecutiva: `2/2` verdes;
- lint, typecheck e build: verdes;
- workflow focal remoto: pendente;
- PR checks: pendentes;
- post-merge completo: pendente;
- `launch_publicly`: não acionado;
- 47.9D: não iniciado.
