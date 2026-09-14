# Evidências e reprodução M0/R1

SHA técnico testado: 4001985e25e1858a056fcd6289d93d1149748e1a. Main consultada por git ls-remote: 1387e1bcecdc4147bb5dad41aa7d541ec97b1497. Fonte reconciliada preservada: b1a36ddf105b16f0636ba3832d101916d864fe0c. Resultados anteriores não são atribuídos automaticamente a este SHA. Manifesto externo identifica o SHA final e prova que somente relatórios mudaram depois dos testes.

## 1. PRESERVAÇÃO — PASS

provenance.json registra pais, árvores, ancestral comum e SHA completo dos objetos solicitados. Os 50 arquivos alterados/não rastreados da árvore original mantêm os hashes do manifesto preservado em C:/Projetos/comun-audit-preserved-20260910. HEAD original aa4e3b4bf745ba497b853c61f267319e8bb9f2f7; nenhum reset/clean/stash. Clone e pacote anteriores mantidos; seis checksums conferidos. commit-differences.json separa trabalho preexistente, auditoria, diferenças 3d8dc82a→9c7eb605 (documentação/evidências) e novo ciclo. Provas originais permanecem nos locais originais; export-hashes.json vincula logs originais e cópias normalizadas.

## 2. RECONCILIAÇÃO — PASS local

Base remota revalidada por leitura. Este ciclo parte da reconciliação b1a36ddf, descendente dessa main, e aplica somente defeitos reproduzidos: ordem do classificador de build; semântica/HTML/payload/assets do auditor; exclusão pública da experiência explicitamente sintética cidade. Fixture preservada. Histórico de decisões do primeiro transporte está em ../comun-reconciled-audit-20260910.md. PR #432 e #434 não foram incorporados.

## 3. TESTES LOCAIS — PASS no SHA técnico

verified/results.json contém comandos, horários e exits: lint, 240 arquivos/1350 testes unitários, 28 testes CI, build, TypeScript, FFmpeg sintético em memória e 23 cenários Playwright. auditor-final-tests.log: 15 testes DOM/assets/renderização, zero skipped. auditor-original-reproduction.log: 10 comportamentos antigos reproduzidos em VM contra blob 9b3f2c467a91cedeba2da31bd647f2f8a16b9759; não são aprovação dos defeitos. O pacote externo e seu verify-package.py não foram encontrados: verificação externa BLOCKED. A reprodução própria não substitui nem falsifica esses arquivos.

Regressões: build-impact-red.log registra 2 falhas antes do ajuste; community-boundary-red.log registra 2 falhas antes da exclusão sintética. A primeira suíte de navegador em 56190a57 teve 22 PASS/1 FAIL, preservada em browser-first-failure.log: três 403 no endpoint local /api/comun/quality-metrics. Trace original permanece em tmp/closure-browser-results do ciclo anterior quando disponível; não é exportado. O hostname do servidor e baseURL foram alinhados em localhost, sem alterar guard de origem nem assertions; mesma suíte passou 23/23 em 4001985e25e1858a056fcd6289d93d1149748e1a, retries=0. Não foi demonstrada a causa interna da canonicalização.

A primeira inspeção estática não enxergava conteúdo Next transmitido/oculto antes de hidratação. Auditor agora renderiza JS com contexto limitado a GET/HEAD na mesma origem, sem WebSockets/service worker/escritas. Teste determinístico com dois servidores próprios comprova bloqueio de POST e origem externa. local-http-before-final é observação exploratória com alterações ainda não commitadas; SHA ali é base, não certificação da árvore limpa. local-http-final executou o SHA técnico: oito rotas 200/contrato presente; Observatório 404, robots/sitemap 404 e seis estados declarados pendentes. Exit 0 significa execução concluída, resultado do produto continua BLOCKED. Ausência de marcador não prova proveniência; estados declarados não são prova operacional e nenhum foi promovido.

Dependências: Node 22.19.0, npm 10.9.3, Next 16.3.4, TypeScript 5.9.3, Vitest 4.1.11, Playwright 1.61.1, tsx 4.23.13, FFmpeg/ffprobe 8.1.1. Dependências copiadas do checkout isolado anterior com mesmo lock; instalação limpa NOT_RUN. npm audit inicialmente falhou por certificado; uma repetição com NODE_OPTIONS=--use-system-ca manteve TLS e passou. Lock exato de main: 11 alertas (1 baixo,3 moderados,5 altos,2 críticos); candidato: zero na consulta. Lock não alterado neste ciclo. dependency-triage.json contém chains/dev-runtime/advisories; não afirma exploração nem certificação permanente. MapLibre: https://github.com/advisories/GHSA-jrc7-96c5-q579 trata atribuição de style/source não confiável, corrigida em 6.4.1.

## 4. AUTH/POSTGRES/STORAGE — BLOCKED

Docker version --format {{.Server.Version}} e docker ps -a --filter label=com.supabase.cli.project=audit_radio_0ec2cf06cf6a --format tiveram ETIMEDOUT aos 15s, sem resposta. Diagnóstico limitado; sem reinício global/limpeza de outros projetos. Relato anterior de OOM é histórico, não prova de falha atual de RLS. Preparação local PASS: node scripts/audit/radio-lab.mjs prepare criou audit_radio_9cfd0d5f9480 e validou 63 migrations fixadas por hash, seeds desativados. Não chegou a LAB_READY. Não houve escrita em Auth, banco ou Storage neste ciclo, nem fallback hospedado. Marcador e configuração local ficam em tmp, não no bundle.

## 5. PERMISSÕES E RLS — NOT_RUN por bloqueio de integração

Fixtures não vazias de Auth A/B/anônimo/papéis, grants, políticas, DTOs e autorização antes de service_role aguardam stack real. Nenhum teste em memória é evidência de RLS.

## 6. IDEMPOTÊNCIA E CONCORRÊNCIA — NOT_RUN

Harness preservado em scripts/audit/radio-lab-integration.mjs inclui barreiras reais Postgres, requisições independentes, falhas intermediárias e compensação. Não foi executado aqui. O contrato de mesma chave com conteúdo diferente pode revelar FAIL no runtime; não há garantia de idempotência. Casos de retirada editorial com worker antigo e dois publicadores disputando publicação ainda não estão automatizados nesse harness: preparar esses casos em laboratório após disponibilizar a stack, observar o fluxo existente e reproduzir defeito antes de corrigir. Não declarar cobertura integral R1 nem atomicidade entre Storage e Postgres.

## 7. PACOTE DE TRANSFERÊNCIA — verificar manifesto externo

Bundle local incremental exige o histórico da main-base. Verificação Git, importação offline e checagem física de todos os objetos novos constam do manifesto externo. Hashes não são autorreferentes: SHA256SUMS cobre bundle/manifesto/relatórios externos. Scan de padrões cobre blobs introduzidos em todos os commits; não é prova universal de ausência de segredos. Nenhum push/PR/workflow/Preview. Inspeção existente de gatilhos permanece em ../comun-reconciled-audit-20260910.md. Classificador agora é independente da ordem e mantém BUILD para runtime/hard-impact; isso não comprova configuração real do provedor nem transferência remota sem Preview.

## 8. SP-0 DOCUMENTAL — independente

PR #434, head 820a2e75223fff45933caae6e27196123d13f45b: revisão dos cinco documentos preservada no relatório anterior e no snapshot da issue #95. Não refeito, não misturado com rádio, sem runtime/SP-1. CI desse PR é histórico e não certifica este pacote. Nenhuma atualização remota neste ciclo.

## 9. PRODUCTION — NOT_INSPECTED

Sem consultas, dados, credenciais, deploy ou alteração de configuração. Não há conclusão sobre estado hospedado atual.

## Reprodução local

Em clone separado com core.autocrlf=false e histórico da base, confira SHA256SUMS e git bundle verify. Importe o bundle com git fetch CAMINHO_BUNDLE refs/heads/codex/m0-r1-convergence-20260910:refs/heads/codex/review-m0-r1; confira SHA/tree no manifesto. Não importe .env nem sessões. Instale dependências do lock em ambiente sem credenciais com npm ci --ignore-scripts; essa instalação não foi reexecutada aqui. Chromium já existente foi reutilizado; reprodução em máquina nova exige o navegador da versão Playwright registrada.

Copie browser-config.txt para tmp/closure-browser.config.ts e verify-m0.mjs.txt para tmp/verify-m0-final.mjs. Execute node tmp/verify-m0-final.mjs com Node/FFmpeg disponíveis; se tsx estiver em outro caminho, ajuste apenas o caminho do executável para a versão registrada. Comandos exatos também estão em verified/results.json. Execute node --test scripts/audit/launch-document-checks.node-test.mjs e node --experimental-vm-modules scripts/audit/reproduce-launch-auditor.mjs.

Depois do build, copie local-auditor.mjs.txt para tmp/local-auditor.mjs, assegure porta 3136 livre e execute node tmp/local-auditor.mjs. O runner cria seu próprio processo local com ambiente filtrado e encerra somente esse processo. O auditor exige COMUN_PUBLIC_BASE_URL explícita; não use destino hospedado. Resultados não equivalem a aprovação operacional.

Para integração, siga ../../../scripts/audit/README-radio-lab.md: prepare → start → somente após LAB_READY integração → stop restrito ao ID próprio. Manifesto fixa a cadeia de 63 migrations; não executar todas as migrations experimentais. CLI Supabase 2.117.0, Docker Linux e memória suficientes são pré-requisitos. Sem stack, preservar BLOCKED. Plano humano/editorial: ../M0-PILOTO-E-CONTEUDO-20260910.md.
