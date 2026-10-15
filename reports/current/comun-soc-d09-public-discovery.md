# SOC-D09 — descoberta pública limitada

Candidato funcional: `e3a9f5ae134d69e303519761d390fa5cafbc107b`; tree `ea3912a1918dd3ea106f231e372d2f1ca91d688d`.
Base main: `8b0ba0d2c90295a6579e8e8808a9e765583e86c9`.
Branch: `codex/comun-soc-d09-public-discovery-20261015`.
Estado: implementação candidata; não integrada nem certificada em Production.

## Entrega

Explorar apresenta até dois itens por fonte pública elegível (máximo seis), com
crédito/fonte, contexto quando disponível, data qualificada e direitos. Não exige
conta ou tarefa. Vazio omite a categoria; falha isolada não apaga as outras fontes.
Detalhe revalida publicação; links de retorno carregam somente contexto público.
Retirada mostra indisponibilidade e saída. A inspeção final preservou a margem dos filtros existente: com o CSS completo
da aplicação não há overflow. A falha de 16px pertencia à fixture incompleta. Nenhuma publicação, schema, flag ou indexação.

Acervo/Rádio agora preservam erros no limite de consulta em leitores com estado,
mantendo adaptadores legados. Feirinha reutiliza a projeção `available/unavailable`
existente; comunidades seed não entram. Fotografia/documento iniciam o recorte do
Acervo sem invadir os leitores culturais especializados. Programas da Rádio são
atribuição de contexto, não identidade inventada do autor.

## Reconciliação preservada

Consulta GitHub desta rodada confirmou main acima, #545 aberto/não draft em
`0eb41ec40622b86a8a75ef95a4a37e470d0ea958`, #546 draft em
`d39656f4732f4c873e2236186f7b5e6713f1c211` e #549 draft em
`24e486643eebf9c294b0b72cca7322da1d9c55bc`, ainda baseado em #546.
Nenhum merge. Evidências antigas permanecem vinculadas aos seus SHAs.
O candidato novo deriva diretamente de main: apenas o pin Playwright do #549 foi
portado como `5ab787956b09943360428c0dc4a1317fc08a969c`, sem runtime da Feirinha.
A revisão SOC-D08 anterior não é aprovação humana independente.

## Provas locais concluídas

| Estado        | Comando/prova                                                   | Resultado/limite                                                                                                                                                |
| ------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PASS          | `node node_modules/vitest/vitest.mjs run --exclude='tests/**'`  | 255 arquivos, 1.502 testes; inclui 40 focais de leitores/projeção/isolar fontes                                                                                 |
| PASS          | `node --test scripts/discovery/lab-guard.node-test.mjs`         | 3 contratos de destino/runner/ausência de credenciais Production                                                                                                |
| PASS          | `node node_modules/typescript/bin/tsc --noEmit`                 | tipos sem erros                                                                                                                                                 |
| PASS          | ESLint dos arquivos alterados                                   | zero erros/warnings; geração `.next` não é código fonte                                                                                                         |
| PASS          | `npm run build`                                                 | build completo Next 16.3.8/Turbopack, 132 páginas estáticas                                                                                                     |
| PASS          | `node tests/public-discovery/run-fixture.mjs build`             | build separado, páginas/componentes/leitores reais, transporte controlado                                                                                       |
| PASS          | `npx playwright test -c playwright.public-discovery.config.ts`  | 12/12, mobile 390×844 e desktop 1366×768, Chromium156; axe da seção, teclado/foco, overflow, sem pageerror/escrita no fluxo, retirada, retorno e entrada direta |
| PASS          | `node scripts/db/lint-explicit-database-privileges.mjs`         | 55 migrations; nenhuma alterada                                                                                                                                 |
| PASS          | validator SECURITY DEFINER                                      | 0 migrations/functions alteradas, não é prova DB/RLS                                                                                                            |
| PASS          | Prettier 3.9.6 e `git diff --check`                             | arquivos novos/alterados formatados                                                                                                                             |
| BLOCKED       | Docker local                                                    | consulta limitada de versão sem resposta; interrompida, sem repetir diagnóstico equivalente                                                                     |
| NOT_RUN local | Auth/Postgres real SOC-D09                                      | job isolado preparado; navegador acima não substitui esta prova                                                                                                 |
| NOT_RUN       | aparelhos reais, Safari/Firefox, leitor de tela e ensaio humano | não executados                                                                                                                                                  |

Resultado JSON do navegador SHA-256: `3feb17451ba4efd2ad162c0d6e8d39801608255fe1fbda9ae08b66dff0a57293`. Artefato permanece
local em `test-results/public-discovery`, sem dados reais. Browser plugin não
disponível nesta sessão: Playwright foi o caminho disponível. Versões: Node22.19.0,
Vitest4.1.11, Playwright1.64.1/Chromium156.0.8078.4rev1248.
Falhas iniciais preservadas na execução: browser ainda não instalado, transporte
controlado sem método `is`, cenário que derrubava dependência compartilhada e o
CSS incompleto da fixture. Instalado runner fixado, corrigida a fixture; nenhum timeout
ampliado ou erro funcional filtrado para obter verde.

## Automação e limites

`docs/comun-public-discovery-lab.md` contém os comandos. Workflow dedicado separa
browser com transporte controlado de Auth/Postgres real, sem secrets Production.
Launcher real aceita apenas runner hospedado efêmero vazio, verifica o container e
portas antes das fixtures, emite sessões reais A/B, testa recusa da bridge privada,
lê via PostgREST e limpa somente IDs criados. O resultado remoto deverá ser
registrado separadamente; não inferir PASS do preparo do workflow.

A página de organização recebeu formatação Prettier além das linhas focais de
retorno/item atual; não muda autorização, actions, consentimento ou grants.
A amostra pública real anterior não confirmou itens editoriais elegíveis: não
inventamos conteúdo para preencher esta seção. Preview não é disponibilidade em
Production. Escola continua estacionada: CAPTCHA exclusivo/humano, cinco fluxos
externos, backup/restauração frescos e seis preflights não dispensados.

## Evidência remota e autocorreção

Em `3ad8bcb80bd29577bb1b20e642d4353c3bea1c10`, run
[38755178014](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/38755178014):
`browser=SUCCESS` e `real-auth-postgres=SUCCESS`. O teste real comprovou sessões
Auth distintas A/B, RPC server-only recusada para anônimo/A/B com 42501, cinco
fixtures Acervo via Postgres, leitor real via PostgREST e limpeza de usuários/itens
com contagem zero. Não é prova de mídia/Storage ou RLS de todos os domínios.

A inspeção visual detectou CSS v2 ausente na fixture: importado o mesmo CSS do
layout do produto. Reproduzida a margem original com o CSS completo, não houve
overflow (390/390); a suposta correção de margem do produto foi retirada. Os
12 cenários passaram novamente localmente com o CSS completo (11,8s); nenhum
cenário foi removido. O resultado
anterior não certifica fidelidade visual completa.

Falha de formatação demonstrada em Launch Readiness da run `38755177349`:
Prettier3.9.10 apontou somente linha vazia extra no roadmap; removida. Não se
altera expectativa ou gate. Preflights seguem independentes: nesta rodada, 48.2-A e 48.4-A1/A2/A3/A4/A5/A6
falharam antes de consultar schema porque `sslmode=verify-full` não encontrou
`/home/runner/.postgresql/root.crt`. Runs 38755177869, 38755177363, 38755177887,
38755177942, 38755177455, 38755177846 e 38755178109. Não atribuir essas falhas
novas à migration da Escola: a pendência da Escola continua no checkpoint anterior,
mas essas execuções não chegaram a comprová-la. Não reduzir TLS nem alterar secrets.
Próximo passo de infraestrutura é disponibilizar a CA confiável pelo caminho
protegido existente antes da consulta; essa captura não certificou schema remoto.

## Próxima ação

Abrir PR draft contra main com checkpoint explícito, executar job real descartável,
consultar checks e Preview do SHA exato. Resolver defeitos demonstrados nesta frente;
não integrar enquanto gates aplicáveis bloqueados. Depois, próximo incremento único
é continuidade da busca/filtros, sem outra pilha dependente da Escola.

## Fechamento do harness

No checkpoint `1f711e318542e3e7062537d6fdf5617bf0df7e77`, a run SOC-D09
[38756092261](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/38756092261)
concluiu browser e real-auth-postgres SUCCESS. Quality
[38756091478](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/38756091478)
concluiu cinco jobs SUCCESS e dois pós-merge SKIPPED. GitHub Preview deployment
`7096131617` possui SHA exato e status success; COST-02 SUCCESS. Isso não dispensa
os preflights TLS que continuam bloqueantes.

A revisão acrescentou captura de console.error e HTTP >=400 no percurso feliz.
Essa asserção demonstrou recursos ausentes na fixture (SW/Acervo usado pelo retorno).
O build do laboratório agora copia somente os quatro assets públicos allowlisted
SW/ícones do próprio checkout e reutiliza as páginas reais offline/Acervo/manifest.
Nada é copiado de configuração privada. Assets gerados ficam ignorados no Git.
O teste mantém a asserção estrita, sem filtrar 404: 12/12 PASS local (14,6s),
TypeScript e ESLint focal PASS. Esse delta é somente harness; nenhum leitor,
contrato de direitos, página do produto ou prova real Auth/Postgres mudou.

Hash SHA-256 do JSON dessa bateria reforçada: `02f43f2b75535b7dac03c19f474e308c49f36f607a5717621da164856d333f0a`.
O novo checkpoint explícito exige sua própria execução remota/Preview; consultar
inventário final no corpo do PR #552. Manter draft e sem merge enquanto houver
falhas ou pendências aplicáveis. Nenhuma certificação editorial/Production/humana.
