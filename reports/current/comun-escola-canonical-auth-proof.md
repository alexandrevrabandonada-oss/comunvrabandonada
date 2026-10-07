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
