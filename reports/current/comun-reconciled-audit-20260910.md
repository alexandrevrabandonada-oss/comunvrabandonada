# COMUN — fechamento local e reconciliação isolada

Data local: 10/09/2026. Repositório: `alexandrevrabandonada-oss/comunvrabandonada`.
Este relatório substitui a descrição de bloqueio da reconciliação no fechamento
anterior; não substitui nem altera as provas históricas preservadas.

**Resultado:** candidato reconciliado local, sem envio remoto. A validação
Auth/Postgres/Storage e a ausência de efeitos duplicados **não estão certificadas**.
O laboratório percorreu a cadeia selecionada de migrations, mas o bootstrap
posterior falhou por memória. Há harness reproduzível, não um resultado integrado
simulado. Production permanece **NOT_INSPECTED**.

## Referências e leitura das evidências

- Main consultada novamente por `git ls-remote`: `1387e1bcecdc4147bb5dad41aa7d541ec97b1497`.
- Runtime reconciliado: `f30c4d57d544b68111c0c7a9abf85bf099b8bb48`.
- Harness inicial: `def3d747fa4a8e53bd49e33d9c63225017734489`.
- SHA técnico validado: **`0932178165e7d556ada31c56a3b20614757b22ab`**.
- O SHA final do pacote, sua árvore e o hash do bundle constam do manifesto
  externo que acompanha o bundle; os commits posteriores ao SHA técnico contêm
  somente documentação/evidências. A equivalência é verificada no empacotamento.
- Evidências: [diretório](audit-reconciled-20260910/provenance.json),
  [bootstrap sanitizado](audit-reconciled-20260910/lab-bootstrap.json),
  [transferência e SP-0](audit-reconciled-20260910/transfer-and-sp0.json).
  Logs finais e comandos estão em `audit-reconciled-20260910/verified/`.

PASS significa somente o escopo explicitado. NOT_RUN não é PASS. Nenhum SKIPPED
foi somado. Os resultados históricos de 888 testes/23 cenários não foram
transferidos automaticamente ao novo candidato.

## 1. PRESERVAÇÃO — PASS

Árvore original: `C:/Projetos/COMUM VR ABANDONADA`, branch
`codex/48-2-d4b0-surface-water-raw`, HEAD
`aa4e3b4bf745ba497b853c61f267319e8bb9f2f7`.
Backup anterior: `C:/Projetos/comun-audit-preserved-20260910`.
Foram revalidados os **50 hashes**, o estado tracked/untracked e o index vazio,
sem modificação dos arquivos originais. Não se usou reset, clean ou stash.
As cópias e logs privados anteriores permanecem no ambiente original.

`git show -s --format=%H,%P,%T`, `git merge-base`, `git diff --name-status` e
comparação SHA256 constam de `provenance.json`, incluindo pais, árvores e arquivos.
Objetos recuperados, sem reconstrução por descrição:

| Papel | SHA completo | Árvore |
| --- | --- | --- |
| Snapshot preservado | `797099b41aa61ecb1bf575c7dfd066705f2ee11f` | `fa3abc87e2724b17fb954683011905ea7a0565de` |
| Correções locais antigas | `3d8dc82a6ba812f1dd79612de4148d579b9b5fcc` | `09f942ba4c9dea85611a8c7670eb4d0fb6d98ca6` |
| Pacote antigo | `9c7eb605b6238c8cd0656c7fff7802a7243ba937` | `72a1e3bbeba2d453ca81cab42c33ffba490fe384` |

O snapshot tem pai `aa4e3b4`; `3d8dc82a` tem pai `797099b4`; `9c7eb605`
tem pai `1da865ab7305924b7b37d5fbc80d1d680f685fe6`. O ancestral comum com
main da linhagem original é `2f70b68532cbcd0dd62d3dba6f7cc3331447f4bc`.
A diferença `3d8dc82a..9c7eb605` contém apenas relatórios/evidências; isso foi
apurado, não presumido. O bundle antigo passou `git bundle verify`; requer
`aa4e3b4bf745ba497b853c61f267319e8bb9f2f7` e seu hash consta de
`original-bundle.txt`. Nenhum objeto necessário ficou ausente.

Checkpoint relatado: `comun-project-audit-2026-09-10.md`, SHA256
`19a452d5e05297273d5f6b758cf93ee814fa9ec79db2e6ec337a42c146eb33cb`.
A classificação preservada distingue 35 arquivos da auditoria, 14 preexistentes
e um misto (`app/comun/radio/actions.ts`). O relatório não exporta `.env`, sessões
ou logs privados de bootstrap.

## 2. RECONCILIAÇÃO — PASS

Worktree inicial própria em C: e cópia final em
`D:/COMUN-AUDIT-RECONCILED-20260910`, branch `codex/audit-reconciled-20260910`.
O candidato parte da main efetivamente consultada, não da árvore histórica.
`git apply --3way` transportou a seleção de correções. As decisões foram:

- Manter os 14 arquivos puramente preexistentes fora do pacote.
- No arquivo misto de rádio, preservar `submitRadioContribution` de main;
  transportar somente autorização editorial e bloqueios de publicação da auditoria.
- Manter o módulo cultural atual e suas salvaguardas. Acrescentar apenas o escopo
  público explícito `comun_audio` e a regressão correspondente; não copiar a versão
  histórica inteira. Flags permanecem OFF.
- Preservar as salvaguardas mais recentes de `lib/radio.ts` na aplicação em três vias.
- Transportar normalização de escopos, metadados físicos de Storage, waveform,
  guards da rádio/cron, regressões e compatibilidade dos mapas com o lock auditado.
  Não houve nova funcionalidade de mapa ou Observatório, nem nova rodada de upgrades.
- Adaptar o teste antigo de CI à contenção de Preview já presente em main.
  A primeira execução revelou expectativa obsoleta; os controles de runtime não
  foram afrouxados. Permanecem negativas para nomes desconhecidos e diff ausente.
- Exclusões de lint/Vitest retiram dependências, worktrees e artefatos; não foram
  removidos casos ativos para obter verde.

O primeiro commit contém 34 arquivos; os seguintes acrescentam harness, instruções
e tipos gerados. Nenhuma migration do produto foi criada. PR #432 e os cinco
documentos do SP-0 não foram incorporados. Não foi demonstrada dependência real
da rádio em SP-0; os imports e chamadas reconciliados permanecem no fluxo existente.
Lista exata e proveniência por arquivo estão no JSON e no histórico do bundle.

## 3. TESTES LOCAIS

Todos os comandos finais usam o SHA técnico `0932178165e7d556ada31c56a3b20614757b22ab`,
ambiente sem credenciais de projeto, dependências do lock auditado e execução
sequencial. Versões e exits individuais acompanham `verified/results.json`.

| Estado | Comando / escopo |
| --- | --- |
| PASS | `node node_modules/eslint/bin/eslint.js .` |
| PASS | `node node_modules/vitest/vitest.mjs run --exclude=tests/** --pool=threads --maxWorkers=1`: 239 arquivos, 1.348 testes, sem skip |
| PASS | `node --test scripts/ci/comun-central.node-test.mjs scripts/ci/vercel-build-impact.node-test.mjs`: 26 casos |
| PASS | `tsx scripts/radio-storage-cycle.mjs`: FFmpeg real; WAV → MP3/waveform, provider em memória, sem banco |
| PASS | `node node_modules/next/dist/bin/next build` |
| PASS | `node node_modules/typescript/bin/tsc --noEmit` |
| PASS | Playwright: mapas e jornadas mobile/tablet, servidor próprio em loopback:3116, retries 0 |

Falhas intermediárias foram preservadas: forks esgotaram memória; um clone com
`core.autocrlf=true` provocou cinco falhas contratuais (CRLF vs LF/hashes). Foram
restaurados somente bytes LF comprovadamente iguais aos blobs Git, sem editar
assertions ou hashes de migrations. A suíte completa passou depois disso.
Build em C: falhou por falta de disco; em D:, o limite artificial de heap de
1536 MiB falhou no TypeScript. Com limite de 4096 MiB, o build passou.
Essas falhas de execução não foram apagadas nem contadas como PASS.

Node 22.19.0, npm 10.9.3, Next 16.3.4, TypeScript 5.9.3, Vitest 4.1.11,
Playwright 1.61.1, tsx 4.23.13, FFmpeg/ffprobe 8.1.1, Supabase JS 2.110.5.
Dependências foram copiadas da instalação local com o mesmo lock; uma instalação
limpa `npm ci` **não foi reexecutada** neste ciclo. `npm audit` atual: NOT_RUN.
Não há conclusão de “zero vulnerabilidades atuais”.

## 4. AUTH/POSTGRES/STORAGE — BLOCKED

Manifesto: `scripts/audit/radio-lab-migrations.json`, base main acima, 63 arquivos
fixados por SHA256. Usa a cadeia canônica até `20260723220112` mais o perfil da
rádio `20260730213205`; não aplica todas as 110 migrations nem `local-migrations`.
O ledger remoto histórico foi tratado como referência documental, não prova de
schema atual. Nenhum serviço hospedado foi acessado.

Docker Desktop foi iniciado de modo oculto; havia outras stacks locais, que não
foram acessadas, alteradas ou desligadas. A stack própria `audit_radio_0ec2cf06cf6a`
usou marcador, configuração hashada e portas verificadas. Uma colisão de porta
foi corrigida somente na configuração própria. PostgreSQL executou **63 migrations
sem erro SQL registrado**. Isso é PASS apenas para esse replay; não para Auth/RLS.

O bootstrap seguinte terminou com `out of memory allocating heap arena map` ao
preparar outro container. Não houve `LAB_READY`, criação de usuários Auth ou upload
integrado. A CLI registrou remoção dos containers próprios; uma inspeção subsequente
confirmou ausência naquele momento. A verificação final/`stop` encontrou timeout
do Docker: cleanup final é **BLOCKED**, não se certifica estado atual dos volumes.
Os logs originais permanecem privados e têm hashes no extrato sanitizado.

Versões observadas: CLI 2.117.0, Engine 29.2.1, Postgres 17.6.1.167,
Auth v2.196.0, PostgREST v16.2, Storage v1.72.1. O disco C: chegou a menos de
10 MB livres. Mover o checkout para D: resolveu o build, não o disco do Docker.
Não se alterou WSL, serviços, memória global ou localização do Docker.

O harness final passou análise sintática e `prepare`: novo laboratório
`audit_radio_29e141263fa2`, 63 hashes conferidos, sem iniciar serviços ou fixtures.
Executar `start` somente em host local isolado com recursos suficientes. Seguir
[instruções](../../scripts/audit/README-radio-lab.md); integração só após `LAB_READY`.

## 5. PERMISSÕES E RLS — BLOCKED

Grants reais, RLS com fixtures não vazias, usuário A/editor, B/comum, viewer e
anônimo, Storage e autorização privilegiada estão preparados no harness, mas
**NOT_RUN** por ausência de stack pronta. As regressões unitárias passaram, com
mocks explicitamente limitados. Não são prova de isolamento real.

O catálogo de policies não prova comportamento; negativa por falta de GRANT não
prova filtragem RLS; service_role não prova RLS. O harness registra essas distinções.
Escopo editorial existente é global por papel, não tenant inventado por editor.
Não se concedeu permissão adicional para obter resultado verde. A matriz completa
de grants de funções e campos públicos/cache continua sem prova integrada.

## 6. IDEMPOTÊNCIA E CONCORRÊNCIA — BLOCKED

Os testes integrados são **NOT_RUN**. O harness fornece conexões HTTP independentes,
locks SQL e barreiras por `pg_stat_activity`, sem sleeps como prova de concorrência:
resposta perdida após headers; timeout após bloqueio observado; duas confirmações;
reuso de Idempotency-Key com payload diferente; dois processamentos; falhas SQL
após upload e após FFmpeg; acesso cruzado durante processamento; cleanup por IDs.

Não se afirma ausência de duplicação. O código atual não implementa contrato
persistido de Idempotency-Key e usa delete+insert para derivados. Esses pontos
podem produzir FAIL no harness e não foram mascarados. Sem reprodução real,
não foi introduzida uma nova máquina de estados ou alteração estrutural.

O endpoint registra o asset antes de fornecer a URL de upload; portanto a ordem
“upload antes do primeiro registro” é NOT_APPLICABLE nessa API. O caso existente
é upload concluído antes da confirmação, com estados intermediários e retomada.
Não há atomicidade presumida entre Postgres e Storage. R2 real, retirada/cache
de conteúdo publicado e múltiplas instâncias distribuídas: NOT_RUN.

## 7. PACOTE DE TRANSFERÊNCIA

Entrega exclusivamente local: bundle incremental, manifesto, logs sanitizados,
hashes e roteiro de reprodução. Verificação e importação offline constam do
manifesto externo. O pré-requisito é a main `1387e1bcecdc4147bb5dad41aa7d541ec97b1497`.
O clone de trabalho usa alternates locais; o bundle contém os objetos novos e
requer somente o histórico-base documentado, não o diretório de alternates.

Foram lidos `vercel.json`, o classificador/ignoreCommand, testes de contenção e
workflows. O diff técnico exato resulta **BUILD**, inclusive por `.gitignore`,
dependências e configuração. Nome `codex/`, draft ou ausência de marcador não
garantem proteção. O diff documental SP-0 resulta IGNORE, mas isso não certifica
o técnico. Eventos de PR/push/deployment_status e dispatch existentes podem ter
efeitos indiretos. Configuração remota real Vercel: NOT_INSPECTED.

Transferência remota: **NOT_RUN por limite explícito deste ciclo**. Sua futura
segurança exige canal/integração que comprovadamente não crie Preview real,
checkout do SHA exato e runner efêmero sem secrets. Nenhum push, PR, dispatch,
merge, deploy ou mudança de configuração foi realizado neste ciclo.

## 8. SP-0 DOCUMENTAL — PASS no escopo documental

PR #434 continua em `820a2e75223fff45933caae6e27196123d13f45b`, confirmado por
leitura remota. Os cinco documentos foram relidos: ADR, ERD, plano mínimo,
inventário de reuso e threat model. Mantêm N:N fonte/revisão, localizadores,
cobertura temporal/multiunidade, dimensões de estado independentes, recorte
sintético futuro, protocolos/dossiês canônicos e casos adversariais.

`git diff --check 1387e1bc 820a2e75` passou; o diff contém somente cinco Markdown.
Nenhuma nova alteração ou publicação documental foi necessária neste ciclo.
Revisão Mermaid é textual; renderização automatizada NOT_RUN. O CI anterior
[34539941726](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/34539941726)
é evidência histórica daquele SHA documental, não do candidato técnico.
Nenhum SP-1, Dataset 001, kernel ou página Merenda foi implementado.

## 9. PRODUCTION — NOT_INSPECTED

Production não foi consultada, testada nem alterada. Não houve cópia de dados,
credenciais ou sessões. Sucesso local/documental não certifica rádio em ambiente
real, entrega integral da V1 ou resolução do PR #432/Issue #95.

## Encerramento operacional

O trabalho independente foi executado e empacotado. Para concluir o bloqueio,
é necessário um laboratório local/efêmero com Docker responsivo, memória e disco
suficientes, executar o harness no SHA recebido e corrigir somente FAIL reproduzido.
Não é necessário reconstruir a auditoria ou iniciar arquitetura/SP-1.
