> Checkpoint ativo: #549 draft, dependente do #546. Provas abaixo pertencem aos
> SHAs indicados. A correção entre abas ao final substitui a premissa de fechamento
> do 0256a6cf; resultados finais do novo SHA ficam na descrição atualizada do #549.

# SOC-D08 — continuidade privada da Feirinha

Estado: CANDIDATO EM PR, não integrado, não Production verificada e não validação humana.
Branch: codex/comun-soc-d08-feirinha-20261014.
Base funcional: #546 d39656f4732f4c873e2236186f7b5e6713f1c211.
Main observada: 8b0ba0d2c90295a6579e8e8808a9e765583e86c9 (#548 integrado).
Diff de revisão próprio: base funcional acima até o candidato; não transportar aprovações.

## Reconciliação

#546: 39 SUCCESS, 45 SKIPPED, cinco FAILURE. Logs dos runs 38623372507,
38623372182, 38623372106, 38623372345 e 38623372024 recusam exatamente
REMOTE_MIGRATION_PLAN_NOT_EMPTY:20261006134804_comun_learning_r0.sql.
Estacionado; #547 fechado como substituído, sem duplicar sua correção PWA.
#545 observado em 0eb41ec40622b86a8a75ef95a4a37e470d0ea958, sem integração nesta rodada;
checks em reconciliação. #523 e #542 preservados como frentes bloqueadas.

## Implementação e decisão

- Mensagem potencialmente sensível: salvar e recuperar são escolhas explícitas.
- Envelope v2 allowlisted: mensagem, requestId e contexto técnico item/organização/login.
- Contato e consentimento nunca persistidos; retomada exige valores atuais.
- Sem recuperação anônima automática; seleção para cópia manual, com aviso de memória volátil.
- Escopo opaco derivado no servidor de user retornado por auth.getUser e login.
  Sem timestamp válido de login não há persistência; formulário ainda permite envio autenticado.
- SSR/cliente começam vazios. Storage é sincronizado como fonte externa, sem suppressHydrationWarning.
- Getter, read, write e remove recusados não quebram o formulário; avisos não prometem salvamento/apagamento.
- Logout real tenta limpar todos os envelopes v1/v2. Troca de conta/login bloqueia recuperação mesmo se remove falhar.
- v1 nunca é interpretado nem restaurado. Expirados, inválidos e incompatíveis falham fechado.
- Servidor deriva ator da sessão, recusa conta inativa e revalida item/organização publicados.
- RequestId e limites RPC preservados. Replay ativo é mostrado como registro existente;
  replay encerrado não é anunciado como nova conexão. Resultado incerto não promete ausência de gravação.
- Componente de acompanhamento extraído sem alterar comportamento, reutilizado pela página real e pelo ensaio.

Retenção: validade de 30 minutos desde salvar; sessionStorage por aba/login.
Descarte oportunista ao ler/usar, concluir, sair ou pedir descarte. Acesso bloqueado
ou navegador suspenso não permitem garantir remoção física; nunca apresentar essa limitação como apagamento provado.

## Provas concluídas e limites

- PASS local: 64 focais em sete arquivos, incluindo PWA/escopo/identidade, sem skipped.
- PASS local: suíte completa com dois workers, 258 arquivos / 1523 testes, zero skipped/failures, antes dos cinco novos contratos de isolamento e do último ajuste visual. O CI deve validar o head final, sem transferir este resultado.
- FAIL preservado: primeira suíte completa concorrente com builds, timeouts em dois testes fora do diff;
  execução posterior limitou somente concorrência, sem aumentar timeout/remover casos.
- PASS: build do produto e build da fixture webpack/TypeScript.
- PENDING: lint final, formatação 3.9.6/3.9.10, prova renderizada, Preview e CI do SHA final.
- FAIL de preparação preservados: fixture dev não pronta em 120s; alias do transporte ausente no primeiro build;
  foi corrigida a injeção da fixture, não o Auth do produto. Sem aumento de timeout.
- NOT_RUN: aparelhos reais, Safari/Firefox, leitor de tela humano, ensaio de compreensão e operação real.
- Banco/Auth real descartável: PENDING no workflow dedicado, nenhuma prova transferida de SHA histórico.
- Chamadas diretas dos cartões: PLANEJADO somente depois de provar o formulário.

## Domínios de prova

O app de fixture fica exclusivamente em tests/solidarity-continuity/fixture-app,
recusa credenciais externas e é servido em 127.0.0.1:3148. Reutiliza páginas,
formulário, getCommunitySession, loginCommunity, logoutCommunity e actions reais.
O transporte Auth/RPC é controlado: não certifica Auth/Postgres/RLS reais.
Navegador captura todo pageerror, sem filtros; Sair usa button e server action reais,
nunca mensagem direta ao service worker como substituto.

O segundo job reutiliza o cenário SQL A5 canônico em stack local própria, depois
cria duas identidades reais do Auth descartável, autentica, verifica getUser,
recusa bridge service-only pelo cliente autenticado, faz logout e remove usuários próprios.
Não recebe secrets Production; URL e destino loopback são verificados. Keys locais
ficam somente em memória do job, nunca no artifact. Nenhum envio de e-mail real.
SignOut não altera a validade criptográfica de access JWT já emitido até expirar.

## Integração

Dependente do #546; PR draft contra a branch desse pacote para revisão delimitada.
Gates de main que não executarem por base/escopo são NOT_RUN, não PASS. Só retargetar
para main após resolver a dependência e reexecutar os gates aplicáveis no SHA exato.
Não fazer merge com pendências, não aplicar a migration da Escola para destravar este candidato.
Nenhum schema, Auth/Source, backup, dado Production, flag ou indexação foi alterado.

Finding adicional reproduzido: logoutCommunity redirecionava para Entrar mesmo
quando signOut retornava error. Regressão real executada e falhou antes da correção
(1 FAIL, 17 casos não selecionados). Correção focal: erro/exception retorna a Conta
com saída não confirmada; sucesso mantém a saída existente. Sem alterar scope ou
configuração do Auth. Ensaio de navegador inclui Sair, falha e segunda tentativa real.

## Reconciliação remota intermediária

- Run 38642070660 (b6487fa1): Auth/Postgres real descartável PASS; navegador 26 PASS / 8 FAIL.
- Run 38642511839 (83769411): navegador 25 PASS / 11 FAIL, sem skipped. Preservado.
- Falhas funcionais: getter recusado ficava como discard_failed e habilitava salvar; corrigido com regressão de store.
- Fragilidade de teste: alert genérico encontrava também o anunciador Next; seletores agora delimitam o feedback real, sem filtrar pageerror.
- Três encerramentos inesperados do Chromium completo no último ensaio; logs crashpad preservados fora do Git. Novo ensaio usa o headless shell padrão da mesma versão Playwright/Chromium fixada, sem timeout ampliado, retry automático ou casos removidos. Resultado ainda PENDING.
- P1G run 38642511899: FAIL anterior à query de catálogo por root.crt ausente. Correção limitada à etapa SELECT: CA versionada, verify-full e default_transaction_read_only=on; sem mudar destino/expectativas. Contrato read-only recebe regressão.

## Formulário comprovado antes dos cards

SHA `d1688c6eefacc440a9c76b6eabd81220d41e1f59`, run 38659830598: ambos os jobs PASS.
Navegador Linux: 36/36 PASS; unit completo/typecheck/build da fixture PASS nessa run.
Windows: os mesmos 36/36 PASS. Nenhum pageerror filtrado, caso removido, timeout
aumentado ou retry para mascarar falhas. Chromium headless shell padrão eliminou
os encerramentos observados no executável completo; não inferir que isso certifica
o outro executável. Auth/Postgres usa seu domínio real separado e artifact sanitizado.

Depois dessa prova foram adicionados os links dos cards públicos, sem catálogo,
UI administrativa ou tabela nova. Necessidade sem organização não recebe CTA.
Flags existentes e projeção pública continuam autoridades; servidor revalida
novamente na escrita. Contexto allowlisted mantém modo legacy e retorno público,
sem transportar dados privados. Formatação das duas páginas antigas amplia o diff
textual; mudança semântica restrita aos links/contexto. Novos casos ainda exigem
prova do candidato final.

P1G: run 38659830499 passou a consulta P6A após TLS, mas o helper read-only de ledger
na etapa seguinte também não recebia CA. Mesma configuração TLS estrita aplicada
somente à segunda etapa read-only; gate de plano vazio preservado. Não dispensar
a migration pendente da Escola caso o preflight passe a reportá-la.

Novos casos locais de cards: a primeira execução encontrou duas falhas de seletor
(botão anônimo chama Entrar antes de enviar, não Enviar interesse/Oferecer ajuda).
Preservado o resultado; corrigido somente o seletor, sem alterar o produto ou ampliar
timeout. Quatro cenários de cards (oferta/necessidade, mobile/desktop) passaram depois.
Acrescentadas asserções Axe/overflow e ativação por teclado para a rodada final.
Artifacts do domínio UI são exclusivamente sintéticos; screenshots públicas e JSON
de resultados ficam em test-results, fora do Git. Não contêm transporte Auth real.

## Checkpoint de fechamento local

Candidato funcional `71c4d80305b7841d1005437e0e6f228ff573aa25`, tree
`908e7f150bad5ca0eb28e09b2c1e15fe7d9edc6a`: 40/40 cenários Chromium
Windows PASS, incluindo cards, teclado, Axe, celular, login, retorno, troca de
conta e Sair real. `pageerror` sem filtros. Comando:
`node node_modules/@playwright/test/cli.js test -c playwright.solidarity-continuity.config.ts`.
47 focais em quatro arquivos, TypeScript e ESLint focal PASS. Seis contratos P1G PASS.
A formatação final identificou assinatura da página ainda sem Prettier após ajuste
de tipos; corrigida, mantendo o teste e o gate. Commit posterior só fecha formatação
e este registro; comparar diff e não presumir equivalência de resultados remotos.

P1G run 38660853963: TLS e captura do ledger passaram; recusa final demonstrada:
`REMOTE_MIGRATION_PLAN_NOT_EMPTY:20261006134804_comun_learning_r0.sql`.
Logo, a causa remanescente é schema da Escola, não regressão da Feirinha. Nenhum
gate dispensado. #546 permanece com cinco failures históricos dessa dependência;
#549 também não é integrável. Main revalidada continua `8b0ba0d2c90295a6579e8e8808a9e765583e86c9`.

Run final funcional 38660853989, Preview exato e demais checks: verificar conclusão
na descrição atualizada do #549; não transformar execução pendente em PASS.
Relatório é registro das provas nos respectivos SHAs, não certificação Production.
Aparelhos reais, Safari/Firefox, leitor de tela humano, compreensão e operação
Production continuam NOT_RUN. Descoberta contextual continua PLANEJADA, sem nova
entrega concorrente. Sem merge, schema write, Auth/Source, flags ou indexação.

## Finding material adicional — identidade entre abas

Reprodução antes da correção: navegador mobile mostrou a mensagem A depois do
login B em outra aba (1 FAIL); duas regressões de action esperavam error mas
receberam success (2 FAIL, 19 não selecionados/SKIPPED, não contados como PASS).
O head 0256a6cf tinha 40 cenários e seus demais ensaios verdes, mas não cobria isso.

Correção focal: contexto opaco do formulário comparado no servidor com a sessão
validada, incluindo época do login quando disponível. Não é parâmetro de ator.
Mismatch encerra antes da RPC e o cliente limpa/esconde campos, sem gravação.
BroadcastChannel envia só hashes opacos/tipo e sinaliza invalidação; payload é
allowlisted, não contém texto/contato/consentimento e não é autoridade de Auth.
Canal indisponível é tratado sem pageerror; blur/visibilidade mascaram o formulário
e router.refresh reutiliza a leitura server-side existente. Novo request nonce
servidor precisa chegar para reabrir; sem resposta continua fechado com alternativa
manual. Mensagem no mesmo login permanece em memória; contato e consentimento
precisam ser informados novamente. Sem polling ou sistema de identidade paralelo.

Quatro cenários de duas abas passaram após a primeira correção (mesmo login e
troca A/B, mobile/desktop). Acrescentados controle de canal recusado e recusa real
da action sem escrita, além de fallback blur/focus por eventos sintéticos. Esse
fallback não substitui ensaio de troca física de janelas nem prova Safari/Firefox.
57 focais (quatro arquivos) PASS após a correção; TypeScript/build de fixture PASS.
A suite renderizada ampliada tem 48 casos; exigir sua conclusão no novo candidato.

Conclusão local da correção entre abas: 48/48 cenários PASS, zero skipped/flaky
no JSON local; 57 focais PASS, TypeScript/ESLint e build da fixture PASS. Comandos
seguem os já registrados, sem timeout aumentado nem filtros de pageerror. O novo
SHA precisa de suas próprias provas remotas e Preview; a descrição do #549 contém
as runs finais. O fechamento remoto de 0256a6cf (1.537 unitários, 40 browsers,
Auth/Postgres e ensaios amplos PASS, exceto schema Escola) permanece histórico,
não certificado para esta mudança adicional.

Complemento do mesmo finding: Sair na Conta de outra aba também foi reproduzido
como FAIL (o textarea antigo continuava no DOM). O onClick existente agora envia
somente o marcador logout-requested no canal efêmero. Não afirma sucesso do Auth.
O formulário receptor limpa memória, tenta limpar seus envelopes e permanece
oculto até Reabrir este item; signOut continua na action real, com erro/retentativa
explícitos já cobertos. Aviso de outra aba diz saída solicitada, não saída concluída.
Se o canal for negado, o fallback de foco e a recusa server-side permanecem; não
prometemos transporte universal nem apagamento físico com storage recusado.
O teste novo usa Sair real em outra aba e verifica a action e o armazenamento
da aba original; não usa mensagem direta ao service worker.

Fechamento local do complemento Sair entre abas: 50/50 casos de navegador PASS,
zero skipped/flaky no JSON. Mantidos casos anteriores, pageerror integral e
timeouts originais. Unitários focais, ESLint e build da fixture PASS; exigir
CI/Preview do novo head do #549. Permanecem NOT_RUN aparelhos reais, Safari/Firefox,
leitor de tela humano, troca física de janelas e ensaio de compreensão.

## Fechamento remoto — SHA congelado para revisão e diagnóstico

Candidato remoto: `da6495f651c554346313aaf5dbad62738ecb1ac4`; tree
`bc345bee2baea048d4e316fefe5a8903ad3bb541`. #549 permanece draft, base #546.
Main preservada `8b0ba0d2c90295a6579e8e8808a9e765583e86c9` (ancestral comum
do candidato e #546; zero behind, dez commits próprios da dependência).

| Domínio                                      | Resultado       | Evidência no SHA remoto                                                                                                                          |
| -------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unitários                                    | PASS            | 1.540 testes / 260 arquivos, job 116190335668                                                                                                    |
| Tipos/build/lint                             | PASS            | Job UI executou typecheck/build fixture; build produto webpack e ESLint locais; Full Surface 38663191391 e Security 38663191378 passaram         |
| Navegador local                              | PASS            | 50/50 Chromium Windows, zero skipped/flaky; transporte controlado declarado                                                                      |
| Navegador Linux                              | FAIL/BLOCKED    | Run 38663191350, attempts 1 e 2: cada qual 49 PASS / 1 FAIL por processo Chromium encerrado, em casos diferentes                                 |
| Auth/Postgres real descartável               | PASS            | Mesmo SHA, job 116189006824, attempt 1; não repetido no rerun dirigido                                                                           |
| Full Surface                                 | PASS            | Quatro jobs da run 38663191391, inclusive admin autenticado/acessibilidade                                                                       |
| Security/resilience                          | PASS local-only | pr-lane da run 38663191378; não certifica recuperação ou Production                                                                              |
| Preview                                      | PASS            | Vercel dpl_67VfmjRx2qczpyRyeNbHnHHZqXDo READY, source=git, target=null, SHA exato; GitHub Deployment 7081070341 Preview/success/HTTPS vercel.app |
| COST-02                                      | SKIPPED         | COMUN CI main-only; não contar Preview manualmente conferido como execução do gate                                                               |
| P1G/schema                                   | FAIL/BLOCKED    | Run 38663191329: REMOTE_MIGRATION_PLAN_NOT_EMPTY:20261006134804_comun_learning_r0.sql                                                            |
| Integração/Production                        | NOT_RUN         | Sem merge, migration, Auth/Source, flags/indexação ou business writes nesta rodada                                                               |
| Ensaio humano/aparelhos reais/Safari/Firefox | NOT_RUN         | Inclui troca física de janelas e leitor de tela humano                                                                                           |

Inventário final GitHub: 9 SUCCESS, 42 SKIPPED, 2 FAILURE, zero pending.
Não chamar PR de verde. A ausência de pageerror reportado não prova causa nativa:
logs mostram Target page/context/browser closed; não há causa raiz comprovada
(OOM, GPU, produto ou bug upstream). Nenhuma whitelist, filtro ou timeout ampliado.

### Incidente Linux preservado

- Attempt 1: último caso desktop, Sair em outra aba; Chromium fechou antes do clique.
- Única reexecução dirigida autorizada/consumida: somente job UI, mesmo SHA, sem
  alteração de código; Auth/Postgres PASS não foi repetido.
- Attempt 2: caso mobile legacy/teclado; Chromium fechou antes de preencher campo.
- Não executar terceira tentativa equivalente. Os dois artifacts e logs foram
  preservados fora do Git em E:/COMUN-SOC-D08-QA-20261014/.
- UI attempt 1 artifact 11940390208, SHA-256 ZIP
  `12b386570f504985ca957be18637c49f03e40240c9118ac8a6d9191d327e4081`.
- UI attempt 2 artifact 11939384970, SHA-256 ZIP
  `0a070142870b23e04f14d6d56331e92588483eec8ea3d948e71d513b6f57eaee`.
- Auth/Postgres artifact 11939976321, SHA-256 ZIP
  `8d8a16913c9c507a7a53053f1c7a226dd449dd506b5eda4c54e74d8abcc359aa`.
- Hashes dos ZIPs baixados conferem exatamente com os digests da API GitHub.

### Próxima ação técnica delimitada

Preparar captura nativa passiva em Linux Ubuntu 24.04 / Node 22.18.0, no mesmo
SHA e browser pinado: DEBUG=pw:browser para registrar exit code/signal e
estatísticas sanitizadas de memória/cgroup. Não mudar produto, timeouts ou
asserções para explicar encerramento do processo sem evidência. O cenário
completo reproduziu o encerramento duas vezes; os casos individuais abaixo são
os menores casos observados, não um minimal reproducer isolado já comprovado.

```sh
# Clone descartável, nenhum .env/secret Production. Checkout fixado no SHA acima.
npm ci --ignore-scripts
npx playwright install --with-deps chromium
node tests/solidarity-continuity/run-fixture.mjs build
DEBUG=pw:browser npx playwright test -c playwright.solidarity-continuity.config.ts --project=mobile --grep 'legacy form keeps readable contrast'
# Segundo caso observado: --project=desktop --grep 'Sair in another tab'
```

Esses comandos são preparação de diagnóstico com observabilidade adicional, não
terceiro rerun executado nem prova de correção. Não usar credenciais hospedadas.
A integração ainda exige resolver #546/Escola e revalidar os gates de main no
SHA exato; próximo incremento de produto permanece somente PLANEJADO.

Este fechamento documental é commit local somente, para preservar o SHA remoto
reproduzido e evitar CI/Preview equivalentes adicionais. A descrição pública do
#549 recebe o mesmo resultado. Não fazer push desse commit como tentativa de
obter verde; retomar pelo diagnóstico nativo delimitado acima.

### Retomada instrumentada — 2026-10-14

A retomada acrescenta somente diagnóstico ao job sintético: `DEBUG=pw:browser`,
saída nativa preservada e contadores numéricos de memória/cgroup antes, durante e
depois. Não altera cenários, assertions, retries, timeouts ou versão do navegador.
O processo recusa variáveis externas de Supabase e propaga falhas/sinais.

PASS local: 3 testes Node do diagnóstico e 5 contratos de isolamento.
A nova execução remota ainda está PENDING; as duas falhas anteriores permanecem
preservadas. A causa do fechamento nativo continua não demonstrada. O commit
documental anterior agora acompanha uma mudança material de observabilidade,
não um rerun equivalente. Escola/#546 continuam bloqueios independentes.

### Resultado do diagnóstico nativo — head adc9815a

SHA remoto: `adc9815a633ca360f37f163a5450b9c07330609e`; tree
`15dfba5544a5b0e8fe7f62a49ca7ce11d518328c`.
Run [38664949029](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/38664949029):
Auth/Postgres real PASS (job 116194633450); UI FAIL (job 116194633669),
49 PASS, 1 FAIL, 0 skipped/flaky. A suíte unitária, typecheck e build da fixture
passaram nesse SHA.

Finding demonstrado: processo principal chromium_headless_shell revision 1228
encerrou com `exitCode=null, signal=SIGTRAP` no cenário desktop de envio/replay/
acompanhamento/revisão/retirada de oferta. Na execução instrumentada anterior
`7ab40f4a`/38664907381, o mesmo sinal ocorreu no login do cenário de troca de
identidade entre abas. Isso prova queda nativa, mas não demonstra causa raiz,
nem um reproducer mínimo isolado. Não atribuir a GPU, OOM ou produto.

Memória disponível amostrada: mínimo 14802960384 bytes; antes 15458070528,
depois 15364608000, total 16766414848. Cgroup indisponível nesta captura:
a ausência desses contadores não prova zero OOM. Sem stack nativo/core dump,
a instrução que gerou SIGTRAP continua BLOCKED/UNPROVEN. Nenhum retry adicional,
upgrade aleatório, mudança de timeout, skip ou filtro de pageerror foi usado.

Artefatos privados locais em `E:/COMUN-SOC-D08-QA-20261014/` (ZIPs conferidos
contra digest GitHub):

- UI artifact 11940757000, SHA-256
  `5533bb876975a3d04dcbb58868082aa9a1ecb85c43fce682c87b9e85f5b3df23`.
- Auth/Postgres artifact 11940323512, SHA-256
  `82ea3fb44e90e6c2d2f3aa347ebc5ce07bb8749207d577e1a0df8e67a2621bec`.

Preview direto PASS: Vercel `dpl_34rFg9LAPRiZ6WBgwc4kUdaGmRLh`, READY,
source Git, target null, SHA exato, aliasError null. GitHub Deployment
7081327279: Preview/success, URL
https://comunvrabandonada-71v0936qz-alexandrevrabandonada-oss-projects.vercel.app.
COST-02 SKIPPED continua distinto dessa conferência. P1G 38664949013 FAIL pela
mesma migration Escola pendente, sem bypass.

Próxima ação técnica delimitada: capturar stack/core nativo em Linux descartável
com a mesma revisão e preservar um caso mínimo antes de propor mudança do browser
ou produto. Não fazer outro rerun equivalente. Integração continua bloqueada;
Production e Escola não foram alteradas. Este resultado documental fica local
para não criar uma nova execução sem mudança material.

### Mitigação verificada da queda nativa — 2026-10-14

Head remoto `5de169eb1c3b90f006a6b077a34879da691fc905`, tree
`525a29b31a344c68b0f3d08a7f2ed4b155174d14`.

Diagnóstico preservado:

- `819ac86c`, run 38665670508, UI 48 PASS/2 FAIL; dois cores SIGTRAP
  resultaram em backtraces sem argumentos/locals. Artefato 11940579438 SHA256
  `2072c67ad71dede6b662fff9de5e7f9c540d8169fa814eed68f5d75e73fa2ed5`.
- `2fb57c26`, run 38666266967: controle HTML estático sem produto/Auth/rede
  completou 100 contextos em Linux, mas suíte real teve 48 PASS/2 FAIL e
  dois stacks SIGTRAP. Artefato 11942390422 SHA256
  `460cba4da3fe17c603b05e7b680e49edf0d2e5d7be1077c8cbe003be9ea3f6b6`.
- Frames Chromium sem nomes no binário capturado; a causa interna permanece
  UNPROVEN. Raw cores ficaram somente no runner descartável, nunca no artifact.

Correção da ferramenta: `@playwright/test`, `playwright`, `playwright-core`
fixados em 1.64.1 (release oficial), Chromium 156.0.8078.4 revision 1248.
Removida somente dependência opcional transitiva fsevents do Playwright.
Nenhuma alteração no código da aplicação, cenários, assertions, retries,
timeouts, pageerror, políticas ou migrações. Árvores de `app`, `components`,
`lib` e `supabase` idênticas ao candidato funcional da6495f6 por hash Git.
O ambiente local com node_modules compartilhado não foi modificado; validação
da nova ferramenta é a instalação limpa do runner, não resultados locais antigos.

Run [38666751320](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/38666751320),
mesmo SHA, duas execuções UI consecutivas PASS:

- attempt 1 job 116200340664: 50 PASS, zero skipped/unexpected/flaky; 100
  contextos estáticos PASS; saída de ambos os processos browser 0/signal null.
- attempt 2 job 116201528160, única confirmação dirigida: 50 PASS, zero
  skipped/unexpected/flaky; controle estático 100 PASS; saídas 0/signal null.
- Auth/Postgres real PASS no SHA, reaproveitado na confirmação UI.
- Unitários, typecheck, build da fixture e 3 testes Node do diagnóstico PASS.

ZIPs fora do Git, conferidos contra digest GitHub:

- UI attempt 1, 11942860130:
  `92a8d58cf4b8a5b1d78ea44ee7273ac771fd942d234160c1bdf45a14b56c6ce1`.
- UI attempt 2, 11942286418:
  `ad90ba04e00e4bb712aa814a4dff65ccf024ed22cf42aef3b277c498d1033675`.
- Auth/Postgres, 11942071086:
  `b7be994e2f4943b9f4d800729e16cb4125ddd621454848d2d4d79f19b5dca55e`.

Mitigação PASS nesta amostra; não alegar causa raiz Chromium resolvida nem
universalidade. Histórico FAIL preservado. Sem upgrade de runtime do produto.

Preview exato PASS: `dpl_GExTVbbpApibxZHRQEewu4T4g8pZ`, READY/source Git,
target null, aliasError null, metadata SHA exato. GitHub Deployment 7081611910
Preview/success:
https://comunvrabandonada-5p6jz7odu-alexandrevrabandonada-oss-projects.vercel.app.
COST-02 SKIPPED, não PASS.

Finding independente Full Surface admin, run 38666751415 attempt 1:
Supabase recusou start por `55432 address already in use`, antes de reset e
testes. Log preservado em 5de169eb-admin-failure.txt fora do Git. Uma única
reexecução dirigida foi solicitada; resultado ainda PENDING nesta atualização.
Security Resilience também PENDING. Não transportar PASS do SHA anterior.

P1G 38666751346 continua FAIL pela pendência
`20261006134804_comun_learning_r0.sql`. Escola/#546 continuam BLOCKED, PR #549
draft, sem integração. Nenhum merge, schema write, Production, flags ou
indexação alterados. Próxima ação: fechar os jobs pendentes e resolver a
dependência Escola por sua frente autorizada, sem dispensar preflight.

Referência: https://github.com/microsoft/playwright/releases/tag/v1.64.1. Não
se afirma que a release documenta correção upstream específica deste SIGTRAP.
