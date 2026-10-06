# Escola COMUN R0

Primeira jornada: quatro trilhas, 24 missões, dois desafios por missão, nove aplicações práticas e quatro kits de ferramentas. As páginas ficam em `/comun/escola`, com destinos Hoje, Trilhas, Prática, Materiais e Meu progresso. O ingresso aparece em Minha participação quando a funcionalidade está habilitada.

## Jornada

A pessoa pode experimentar uma missão sem conta. Nesse modo, o percurso só existe enquanto a tela está aberta; a interface informa que não foi salvo. Para retomar e enviar práticas, utiliza a conta comunitária existente.

Uma missão possui introdução, desafio, conceito com explicação alternativa, segundo desafio, aplicação e conclusão do conteúdo. Respostas erradas oferecem feedback e nova tentativa. Não há ranking, pontos ou punição por perder sequência.

“Hoje” prioriza uma prática que ainda precisa de envio ou revisão, depois uma missão iniciada e então o próximo conteúdo. Uma prática já enviada para revisão não impede estudar a missão seguinte. As trilhas podem ser abertas diretamente pelo modo “Preciso disso agora”.

## Prática e revisão

Concluir o estudo de uma missão prática gera `practice_pending`, e nunca valida a aplicação automaticamente. O envio referencia uma pauta em que a pessoa tem participação ativa e, opcionalmente, uma tarefa existente dessa mesma pauta. O relato curto de aplicação fica privado e disponível à revisão autorizada; não cria outra tarefa nem altera o estado da tarefa canônica.

A fila `/comun/admin/escola` exige administrador ou editor ativo. O revisor precisa conferir o registro na pauta; pode validar ou solicitar revisão. A pessoa não pode validar a própria prática. Uma validação atualiza o progresso para `completed`; solicitação de melhoria mantém a prática pendente. O conteúdo estudado permanece concluído em ambos os casos.

Esta versão vincula a aplicação a Pauta/Tarefa. A vinculação tipada a Evidência, Ação, Roda e Resultado é evolução posterior. As atividades de investigação orientam inserir o registro no fluxo canônico da pauta antes de enviar a aplicação.

## Persistência e autorização

Seis estruturas: programas, unidades (trilhas/missões), recursos, matrículas, progresso e referências de práticas. Os kits guardados ficam na matrícula. O catálogo editorial v1 está em `lib/learning/catalog.json`, espelhado no seed SQL. Não existe editor de conteúdo nesta entrega; uma mudança editorial exige nova versão revisada, sem alterar silenciosamente o histórico concluído.

Toda tabela tem RLS e privilégios explícitos. O catálogo pode ser lido publicamente. Matrícula, progresso e prática só podem ser lidos pelo próprio participante através do Data API; não recebem privilégios de escrita no cliente. A API verifica a sessão ativa, vincula a identidade no servidor, exige mesma origem nas mutações e responde com `private, no-store`. A fila é uma leitura administrativa no servidor, protegida pela autorização existente.

As quatro funções transacionais são `SECURITY INVOKER`, executáveis apenas por `service_role`. Não usam claims editáveis. A função de progresso verifica a revisão esperada e o desafio no catálogo SQL. Conflitos retornam 409; a tela carrega a versão mais recente. Envio e revisão de prática usam a mesma ordem de locks e não permitem rebaixar uma prática validada por reenvio.

## Habilitação

`COMUN_LEARNING_R0_ENABLED=enabled` é necessária. Sem ela, as rotas da Escola e sua API ficam indisponíveis, e o ingresso não aparece. O código não aplica migração automaticamente. O manifesto começa como `local_candidate`, com promoção remota desabilitada.

Antes de habilitar em produção:

1. Promover `20261006134804_comun_learning_r0.sql` pelo fluxo de migrações existente, incluindo revisão de privilégios e compatibilidade do schema real.
2. Conferir os checksums do manifesto de release e a versão do programa.
3. Validar a jornada com duas contas comunitárias reais e uma conta editorial autorizada em preview: retomar, enviar prática, revisar e conferir privacidade.
4. Habilitar a flag e verificar as rotas publicadas.

As referências privadas usam exclusão restrita: o fluxo de apagamento de uma conta precisa limpar explicitamente práticas, progresso e matrícula antes de remover a identidade. Esse ensaio no fluxo real de retenção faz parte do gate de publicação.

Desabilitar a flag interrompe a superfície e suas mutações sem apagar progresso.

## Verificação

Testes versionados: `vitest run lib/learning/core.test.ts app/api/comun/escola/route.test.ts`. Cobrem próxima missão, estudo/prática separados, sessão ativa, bloqueio de origem externa, identidade imposta pela sessão, campos inválidos, conflitos e mensagens sem detalhes internos.

O ensaio da migração utiliza PostgreSQL embarcado (PGlite) em memória, com fixtures mínimas dos objetos canônicos. Exercita SQL real, permissões/RLS, respostas, retomada, conflitos, vínculos, validação, reenvio e mochila. Isso não substitui o ensaio no Supabase real.

O ensaio de navegador utiliza Chromium com a interface real e uma API de teste ligada à mesma base isolada. Inclui uso visitante, jornada autenticada simulada, retomada após reload, tarefa, revisão, progresso, mochila, 320/390/1366 px, ampliação de texto e axe nas seis superfícies da Escola. Sessão real, permissões editoriais em produção e validação humana do material continuam como gates de publicação.

## Próximas entregas

Primeira turma e encontros reais; editor editorial; referências tipadas aos demais objetos; revisão espaçada; tutor; competências com evidências; formação de formadores e offline. Nenhum destes aparece como funcionalidade pronta nesta versão.

## Contrato repetível e CI

O workflow `COMUN Escola contract` executa os dez testes de API/domínio e a
migração em PostgreSQL 17 descartável, sem segredos de produção. Ele testa
o catálogo do SQL contra o JSON da aplicação, gravações como `service_role`,
RLS entre duas contas, respostas inválidas, revisão otimista, vínculo suspenso,
tarefa arquivada, revisão/reenvio e limpeza explícita anterior à exclusão Auth.
Todo DDL e fixtures são desfeitos com `ROLLBACK`, inclusive em falha.

Reprodução com uma instância PostgreSQL vazia e descartável:

```bash
COMUN_LEARNING_DISPOSABLE_DATABASE=true \
COMUN_LEARNING_TEST_DATABASE_URL=postgres://postgres:senha@127.0.0.1:5432/escola_test \
node scripts/learning/test-database.mjs
```

O runner rejeita hosts remotos e qualquer banco que não seja `escola_test`.
As dependências de pauta e Auth são fixtures mínimas: este ensaio valida a
migração da Escola, mas não certifica o schema canônico completo, cookies SSR
ou contas Supabase reais. A política de retenção está em
`docs/comun-retention-exclusion.md`.

Na verificação de 6 de outubro, o job principal de tipos/lint/topologia passou.
O status Vercel inicial correspondia a um deploy ignorado, não a um Preview pronto. O gate COST-02 falhou com
`checkpoint-missing`: o próximo checkpoint inclui o marcador `[comun-preview]`
exigido pelo repositório. Os projetos Supabase acessíveis pelo conector não
contêm as tabelas canônicas do COMUN; a aplicação remota da migração continua
pendente até que o ambiente correspondente esteja disponível.

O workflow `COMUN Escola contract` do commit
`c702b7f89180de00a3192361220a23d46b407d4f` concluiu com sucesso no GitHub
Actions: dez testes de domínio/API e o contrato SQL em PostgreSQL 17 real.
Run: https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/37478587480.

### Integração com os gates globais — 6 de outubro de 2026

A migração `20261006134804_comun_learning_r0.sql` pertence explicitamente
à lane `learning-r0`. Ela adiciona seis tabelas e funções próprias, com
referências a Auth/Pautas, sem alterar tabelas desses domínios. Os gates
históricos a classificam como `not_applicable`; a própria lane a classifica
como `candidate`. Arquivos desconhecidos e candidatos misturados a outras
lanes continuam bloqueados. O contrato SQL da Escola permanece obrigatório.

O delta de inventário foi conferido contra a base do PR: 232 páginas anteriores,
nenhuma removida e sete adicionadas: `/comun/escola`, `/comun/escola/trilhas`,
`/comun/escola/missao/[slug]`, `/comun/escola/pratica`, `/comun/escola/materiais`,
`/comun/escola/progresso` e `/comun/admin/escola`. O contrato de coerência exige
agora essas sete rotas, além de manter contagem exata de 239, ausência de
findings, redirects, pilotos e ensaio humano obrigatório.

Na matriz de superfícies, a fila de revisão pertence à administração
cívica/editorial (Onda 3), e não à administração sistêmica (Onda 4): 86 e 12
páginas, respectivamente. A matriz RLS classifica programas, unidades e
recursos como `public_read_safe`, e inscrições, progresso e práticas como
`owner_read`, de acordo com os grants e policies existentes na migração.
Nenhuma permissão SQL foi ampliada. Migração remota, flag e escopo
`local_candidate` permanecem inalterados.
