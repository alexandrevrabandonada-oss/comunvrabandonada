# Escola existente — prova Auth canônica descartável

Fonte preservada: PR #503, `a8dbe550583526eae631deafa3c574fbcfb18993`.
O PR #520 permanece separado, no checkpoint `4e17fae7`, com seus gates verdes.

Esta alteração acrescenta somente o job `canonical-auth` ao workflow existente
da Escola e um harness de prova. Não altera migration, manifest, API, runtime,
catálogo, flag de produto ou modelos de progresso. Não integra nem ativa a Escola.

## Prova executável

O runner Ubuntu 24.04 usa Node 22.18.0, Supabase CLI 2.117.0 e a configuração
PostgreSQL 17 já adotada pelo projeto. `supabase db reset --local --yes` aplica
a cadeia completa do checkout, incluindo a migration candidata da Escola.
Não substitui Auth/Pautas por tabelas mínimas nem redefine `auth.uid()`.

O projeto Docker recebe identidade exclusiva da run/attempt. Antes das escritas,
o harness verifica confirmação descartável, portas/endpoints exatos, ausência
de credenciais remotas, nomes dos containers, estado running, mapeamento de
portas e lineage das imagens Supabase. Localhost, isoladamente, não autoriza
uma escrita. O workflow não recebe secrets Production e não dispara promoção.

Contas sintéticas são criadas no Auth local; login e getUser reais geram cookies
SSR. A aplicação Next local executa a API existente com a flag habilitada
exclusivamente no processo descartável. O teste cobre:

- anônimo, origem externa, input inválido e respostas private/no-store;
- identidade enviada pelo cliente incapaz de substituir a sessão;
- A/B com progresso não vazio, SELECT RLS own-only e negação de UPDATE/RPC direto;
- duas requisições independentes bloqueadas na mesma row, observadas por
  pg_stat_activity antes de liberar o lock: uma confirmação e um stale 409;
- replay após resposta perdida, leitura de recuperação e ausência de avanço duplo;
- escopo da prática/Pauta, vínculo suspenso, materiais guardados e perfil suspenso;
- quatro funções SECURITY INVOKER, somente service_role EXECUTE;
- limpeza na ordem de dependências, somente UUIDs devolvidos pelo Auth desta run.

O checker canônico zero-findings permanece obrigatório e independente. O
artifact sanitizado contém SHA/tree realmente executados, hash da migration,
identidade da run, checks concluídos e limpeza. Não contém contas, cookies,
tokens, connection string ou reflexão privada.

## Evidências e limites

Os testes locais de boundary e dez testes existentes de domínio/API
passaram durante a preparação. A integração real ainda é **NOT_RUN** enquanto
não houver conclusão verde do job e artifact no SHA candidato. Nenhum mock
ou teste estático pode substituir esse resultado.

A engine Docker desta máquina permaneceu bloqueada pelo Inference manager;
não repetimos os diagnósticos equivalentes. A CI descartável oferece o executor
independente. Falhas desse job devem ser classificadas pelo comando efetivamente
executado; não se presume erro funcional a partir de uma falha de infraestrutura.

Revisão editorial, ensaio humano, integração/merge, release de schema e ativação
continuam pendentes. Bookmark é um toggle existente: não é alegado idempotente.
O replay de progresso usa revisão otimista/stale e leitura de recuperação; não
foi introduzido outro protocolo de idempotência ou sistema de tarefas/formação.

Reprodução: em runner Linux descartável, executar os passos `canonical-auth`
de `.github/workflows/comun-learning.yml`. Destinos hospedados e execução com
credenciais Production são recusados. Não executar este harness sobre um banco
compartilhado nem substituir os guards para obter verde.

## Primeiro diagnóstico remoto

Run `37644190621`, SHA `0f3bde1027db5da37ed6926a30fc3b0ed31eef51`:
start/reset canônicos e criação/login Auth reais passaram; o POST anônimo
retornou 403 porque o harness usava Origin 127.0.0.1, enquanto NextURL normaliza
loopback para localhost. O teste agora usa a URL canônica localhost também no
header Origin. Um teste contra o NextRequest real prova essa normalização.
A checagem de origem da aplicação continua byte a byte inalterada.

Esse attempt é FAIL, não prova RLS/concorrência; os gates posteriores são
NOT_RUN. O Solo local também encontrou 16 workflows já existentes ausentes
do inventário explícito. Foram cadastrados individualmente, preservando a
rejeição de qualquer workflow desconhecido. Não foi criada permissão genérica.

Após a correção do harness: quatro testes boundary, `npm run solo:test`
(113/113) e `npm run test:unit` (1.340/240 arquivos) passaram. O comando unit
oficial exclui as suítes Playwright; estas seguem nos respectivos runners de
navegador, sem contar descoberta acidental por outro runner como falha do produto.

Run `37645448876`, SHA `351c37deb9eda663908a53efcb43556fc2990255`:
o harness chegou à prática após sessão real, RLS A/B, negação de writes/RPC
diretos e duas requisições independentes sincronizadas. Depois falhou com
SQLSTATE 23514 ao tentar `membership.status='suspended'`: o contrato canônico
de vínculo aceita `paused`, diferentemente do status de perfil. Corrigido
somente o fixture, com regressão contra a definição da tabela na migration.
O attempt permanece FAIL; os gates posteriores não são certificados. Nenhum
runtime ou schema foi alterado para acomodar o teste.

## Prova HTTP fechada e próxima lacuna

Run `37646923297` passou para o head `9c345fce`. O checkout realmente testado
é o merge sintético GitHub `18ee3d9a2a7236d7af1069d74d3f5bf8079007e9`, tree
`ecd032116f4c9cb2d28a6bc5e3cc9e97a1399574`, pais main `74cc0ed1` e `9c345fce`.
Escola, Auth, cliente Supabase, migrations e harness são byte a byte iguais ao
head; outros domínios do merge não são declarados equivalentes. Checker:
zero findings, fingerprint `b5fcd36efcbd6aaba177ce75bcce6e38286c870deacea27948339d23966f4144`.
Artifact `11494628587`, SHA-256
`9d79e80c952356ebe9a8fe294006d82b911cc1b2db3e21287a55a40317ede814`.

A prova seguinte acrescenta navegador real com as mesmas contas Auth: Hoje →
Continuar → etapa persistida → reload, A/B em 390/1366px. Sem interceptação
de API ou storageState/traces de sessão. Browser plugin não disponível;
fallback usa Playwright pinado do projeto e Chromium completo. Capturas
mostram somente o catálogo/etapa das fixtures sintéticas; não contêm reflexão,
email, token ou IDs Auth. Essa etapa permanece NOT_RUN até o novo artifact.

Run `37648640253`/head `0c4dae36`: interrompida após mais de nove minutos
na etapa do navegador, sem marcador que localizasse a parada. CANCELLED,
nunca PASS. Acrescentados marcadores sanitizados de etapa, limites de screenshot
e navegação, DOMContentLoaded seguido de API/heading real e timeout total
de oito minutos para o passo. Nenhuma asserção de sessão/progresso foi removida.
Os failures globais de dpkg lock e reset local 502 foram rerodados somente
nos jobs falhos, sem alterar código; resultados pertencem ao SHA dessas runs.

Run `37650884928`/head `923c699a`: FAIL pelo timeout de oito minutos.
Marcadores provaram Today e retomada autenticados em 390px/A; a última etapa
foi `reload-navigation`. Nenhuma prova de reload, desktop ou limpeza desse
attempt é inferida. A próxima tentativa usa build compilado + next start,
mantendo os endpoints/cookies/asserções reais. Deadline externo de navegação
e encerramento falha fechado, além dos timeouts internos do Playwright.
Não se atribui esse comportamento ao código de produto sem reprodução isolada.

## Prova fechada e continuidade em Minha participação — 07/10/2026

Run `37653193110` passou no head `3e465262fb60b935c7ff770da0503db58165fda8`,
tree `a013e01835b527f9854abd1c74efc4ebde0f031a`. Checkout realmente testado:
merge `f86eddc08193f8170b20ca914b0d2b79f0237929`, tree
`dc4ea0014278137e200ddb63569b11695d8b6e2e`, pais main74cc0ed1 + head3e465262.
Escola/Auth/schema/harness equivalentes; não o repositório inteiro.
Artifact `11497483017`, JSON SHA-256
`321c468103bf8c0d63d66c374e438253cb0201a6ec6321445e4169ce0d84026e`:
oito grupos passaram, inclusive Hoje → Continuar → etapa persistida → reload,
A/B em 390/1366px. Limpeza concluída; zero canonical findings com o mesmo
fingerprint. Next compilado resolveu o executor, sem provar causa raiz do dev.
Local no mesmo head: 1.340 unitários/240 arquivos, Solo113 e oito focais PASS.
Preview Git exato READY, deployment GitHub6915390833 success, COST-02 checkpoint-fresh.

O elo seguinte muda somente a entrada da Escola em Minha participação:
resumo server-only da sessão validada e snapshot owner existente, usando o
seletor canônico nextMission. Atividade iniciada tem título/etapa e link direto;
prática por registrar e prática em revisão ficam distintas. Vazio não afirma
formação iniciada. Falha de consulta oferece recarga sem tratar indisponibilidade
como vazio. Sem JavaScript, o resumo continua no HTML autenticado.

Não há novo modelo, RPC, migration, permissão, inscrição, tarefa, vínculo,
notificação ou gravação ao navegar. IDs pessoais, reflexão, notas e vínculos
Pauta não entram no resumo ou URLs. cache do React é somente por request, sem
armazenamento privado compartilhado entre pessoas. Flag continua off; não há
feature activation nem Production write.

A prova de 3e465262 não certifica essa alteração nova. O harness passa a exigir
também Minha participação → resumo real A/B → Retomar → etapa correta antes
da jornada/reload existente, no build compilado. A nova prova permanece PENDING
até artifact do SHA/tree novo. Checks gerais e revisão humana são gates separados.
