# Runbook da janela remota — PR #23

## Estado canônico atual

**DRAFT_NOT_APPROVED**

Este runbook não autoriza execução. Comandos que recebem conexão, projeto ou cofre usam placeholders e somente podem ser materializados no canal seguro da janela aprovada. Nenhum segredo deve ser salvo neste arquivo ou no histórico do shell.

## Evidência atual

- Branch candidata: `codex/sprint-40-1-mobile-preview`
- SHA preparada: `e71ad7d7cafb58ecaad89d6be3ca72932ff30221`
- `main` congelada nesta preparação: `a599d124a84c5542ec3a56052276024b9bd4854a`
- Pacote forward-only: presente e reproduzido localmente.
- Backup completo restaurado: não comprovado.
- Revisões independentes: 0/2.
- Autorização nominal da janela: pendente.

## Gates fechados

- pacote modular com preflight e postflight;
- runner fail-closed e proteção contra alvo não autorizado;
- hardening, RLS, DB lint e idempotência locais;
- rollback conceitual documentado.

## Gates pendentes

- autorização completa do backup;
- restore isolado verificado;
- regressão production-like no restore reconciliado;
- duas revisões independentes;
- responsáveis, contatos e horários nominais;
- aprovação do rollback e da janela.

## Decisão

**NO_GO_REMOTE_INTEGRATION**

## Papéis obrigatórios

| Papel | Responsável | Contato operacional | Estado |
| --- | --- | --- | --- |
| Dono da janela/go-no-go | `[PENDENTE]` | `[FORA DO GIT]` | PENDENTE |
| Operador de banco | `[PENDENTE]` | `[FORA DO GIT]` | PENDENTE |
| Responsável pelo backup/chave | `[PENDENTE]` | `[FORA DO GIT]` | PENDENTE |
| Validador de aplicação | `[PENDENTE]` | `[FORA DO GIT]` | PENDENTE |
| Operador Vercel/domínio | `[PENDENTE]` | `[FORA DO GIT]` | PENDENTE |
| Observador e registrador | `[PENDENTE]` | `[FORA DO GIT]` | PENDENTE |

## Parâmetros da janela

- Data e fuso: `[PENDENTE — America/Sao_Paulo]`
- Início: `[PENDENTE]`
- Tempo máximo: `[PENDENTE]`
- RTO máximo aprovado: `[PENDENTE]`
- RPO aprovado: `[PENDENTE]`
- Deployment Vercel de rollback: `[PENDENTE]`
- Identificador sanitizado do backup: `[PENDENTE]`
- Ambiente isolado de restore: `[PENDENTE]`

## T-30 — congelamento e autorização

1. Confirmar autorização nominal do backup e da janela.
2. Congelar operação editorial e registrar o aceite das pessoas responsáveis.
3. Confirmar os SHAs sem alterar branches:

```powershell
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/codex/sprint-40-1-mobile-preview
git rev-parse origin/main
git status --short
```

4. Exigir worktree limpo, SHA candidata aprovada e `main` igual ao snapshot da janela.
5. Registrar deployment atual e deployment de rollback sem alterar alias.
6. Preparar o cofre e a chave separada; não imprimir valores.
7. Criar backup de roles, schema e dados usando a CLI já verificada e parâmetros fornecidos por canal seguro. A forma final dos comandos deve ser confirmada com `npx supabase db dump --help` durante a janela.
8. Cifrar imediatamente, calcular checksum do artefato cifrado e remover qualquer temporário não cifrado.
9. Parar se a autorização, criptografia, checksum, retenção ou custódia falhar.

## T-25 — restore isolado

1. Provisionar alvo isolado vazio e compatível com a versão PostgreSQL/extensões da origem.
2. Restaurar roles aplicáveis, schema e dados conforme o formato aprovado.
3. Não conectar a aplicação pública ao alvo.
4. Validar somente contagens agregadas, extensões, constraints e checksums.
5. Registrar início, fim e RTO sem expor conteúdo.
6. Emitir `COMUN_REMOTE_BACKUP_RESTORE_VERIFIED` somente após igualdade das contagens e validação do restore.
7. Fail-fast: qualquer diferença não explicada encerra a janela antes da reconciliação.

## T-20 — reconciliação do restore

No ambiente isolado local, confirmar que o container é exclusivamente o alvo restaurado e executar o runner pelo caminho local, sem colocar credenciais em argumentos ou no histórico:

```powershell
node scripts/run-pr23-reconciliation.mjs --container='<RESTORE_DB_CONTAINER>' --force-reconcile
node scripts/run-pr23-reconciliation.mjs --container='<RESTORE_DB_CONTAINER>'
```

Critérios obrigatórios:

- preflight aprovado;
- módulos forward-only aplicados na ordem do runner;
- postflight aprovado;
- hash final registrado de forma sanitizada;
- grants e RLS aprovados;
- segunda execução retorna estado já reconciliado ou mantém idempotência comprovada;
- nenhuma das 19 migrations antigas é aplicada diretamente;
- nenhum `migration repair` é usado.

## T-15 — regressão production-like no restore

Com a aplicação apontada somente para o restore isolado e fixtures sintéticas:

```powershell
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx supabase db lint --local --schema public --level error --fail-on error
npm run audit:rls-matrix
npm run test:e2e:comun-integral-experience
npm run test:e2e:editorial-operation-authenticated
npm run test:e2e:territorial-art
npm run test:e2e:community-radio
npm run test:e2e:comun-sidewalk-real-map
npm run test:e2e:comun-miniapp-experience
npm run test:e2e:comun-mobile-app-shell
npm run smoke:no-leak-http
npm run cleanup:comun-sidewalk-uploads
```

Antes da execução, confirmar que cada comando usa o alvo isolado e não o projeto remoto de produção. Ao final, remover fixtures e comprovar a limpeza. Emitir `COMUN_PR23_RESTORED_PRODUCTION_LIKE_OK` somente se toda a matriz funcional especificada no gate estiver coberta e aprovada.

## T-10 — revisões e go/no-go

1. Anexar evidências sanitizadas de backup, restore, hash, RTO e regressão.
2. Obter as duas revisões independentes, sem assinatura por procuração.
3. Confirmar rollback de banco, Vercel e domínio.
4. Confirmar responsáveis e contatos no canal operacional privado.
5. Decisão permitida:
   - `READY_FOR_CONTROLLED_REMOTE_MIGRATION`; ou
   - `NO_GO_REMOTE_INTEGRATION`.
6. Sem unanimidade ou com qualquer pendência, encerrar em NO-GO.

## T-0 — janela remota futura

Esta seção permanece **BLOQUEADA**. Mesmo que o gate passe para READY, a aplicação no Supabase remoto exige uma autorização explícita posterior. Não executar SQL remoto a partir deste runbook na fase atual.

## Checkpoints fail-fast

- autorização incompleta;
- backup não cifrado ou sem checksum;
- restore incompleto;
- diferença agregada não explicada;
- preflight ou postflight falhou;
- grant público indevido;
- RLS ou DB lint falhou;
- regressão funcional falhou;
- fixture não removida;
- revisão ausente ou `CHANGES_REQUIRED`;
- RTO excedido;
- alteração inesperada da `main`, domínio ou deployment.

Qualquer item acima encerra a janela. Não improvisar correção diretamente em produção.

## Rollback de banco

1. Parar writes e impedir novas sessões operacionais.
2. Não tentar desfazer parcialmente o pacote com SQL ad hoc.
3. Usar o mecanismo de restauração aprovado e testado no gate de backup.
4. Restaurar no alvo definido pelo plano nominal e validar contagens agregadas.
5. Reexecutar RLS, DB lint e smoke mínimo antes de reabrir operação.
6. Registrar RTO real e incidente sanitizado.

## Rollback Vercel

1. Interromper promoção/alias do deployment candidato.
2. Reatribuir o alias somente ao deployment de rollback previamente registrado.
3. Validar Home, autenticação, rotas públicas e no-leak.
4. Não criar novo deployment durante o rollback salvo decisão nominal do dono da janela.

## Rollback de domínio

1. Reanexar apex e `www` ao projeto anterior somente conforme o snapshot pré-janela.
2. Validar DNS, SSL e redirects.
3. Não alterar nameservers ou criar novo domínio.
4. Manter o projeto candidato sem domínio até análise do incidente.

## Smoke e monitoramento

- verificar Home, Explorar, Participar, Territórios, Comunidades, Pautas, Minha área e Caixa;
- verificar Acervo, Arte, Rádio e operação editorial;
- verificar Mapa das Calçadas, captura, moderação, prioridade, encaminhamento, resultado e memória;
- acompanhar erros de aplicação, banco, Auth e Storage;
- confirmar ausência de PII e segredos em respostas e logs;
- observar filas, retries, dead-letter e cleanup;
- registrar horários e decisões sem copiar conteúdo privado.

## Encerramento e descarte

1. Remover fixtures sintéticas e comprovar zero resíduos.
2. Encerrar sessões temporárias e revogar acessos transitórios.
3. Descartar temporários não cifrados imediatamente.
4. Manter ou descartar o backup cifrado conforme retenção aprovada.
5. Registrar decisão final, RTO/RPO observados e responsáveis.
6. Gate humano do produto permanece separado e continua 0/3.
