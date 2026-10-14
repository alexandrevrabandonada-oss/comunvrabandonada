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
