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
