# Estado atual do projeto COMUN — PR #23

Data de referência: 21 de julho de 2026

## Decisão vigente

**NO_GO_REMOTE_INTEGRATION**

A implementação local e o pacote de reconciliação estão preparados e publicados na branch de validação. A PR está aberta, sem conflito e com preview aprovado, mas ainda não está autorizada para integração remota ou merge.

## Identificação do checkpoint

- Repositório: `alexandrevrabandonada-oss/comunvrabandonada`
- PR canônica: [#23](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/23)
- Branch: `codex/sprint-40-1-mobile-preview`
- HEAD da branch antes da documentação deste gate: `e71ad7d7cafb58ecaad89d6be3ca72932ff30221`
- HEAD da `main`: `a599d124a84c5542ec3a56052276024b9bd4854a`
- Estado da PR: aberta e `MERGEABLE`
- Preview Vercel: concluído com sucesso
- Worktree no início deste relatório: limpo e sincronizado com a origem

## O que foi feito

### 1. Reconciliação de schema da PR #23

- O estado local e o snapshot remoto sanitizado foram comparados.
- Foi produzido um pacote SQL forward-only, dividido em módulos ordenados.
- A execução foi protegida por preflight e postflight explícitos.
- O pacote não usa `migration repair` para esconder divergências.
- A origem e o tratamento de `comun_member_profiles` e `handle_new_user()` foram documentados separadamente.
- O histórico remoto divergente foi preservado como evidência, sem ser tratado como equivalência automática.

### 2. Ensaios reproduzíveis

- Dois ensaios locais independentes partiram do mesmo snapshot remoto sanitizado.
- Os dois produziram o mesmo hash bruto:
  `227c39c855a626ebbe96428701848aded067acd687d2876403fcab4f80e0bbd1`.
- Resultado estrutural observado nos ensaios:
  - 175 tabelas;
  - 45 políticas;
  - 428 índices;
  - 9 funções.
- O postflight foi aprovado com `PR23_POSTFLIGHT_ASSERTIONS_OK`.
- A segunda aplicação confirmou idempotência com `PR23_RECONCILIATION_ALREADY_RECONCILED`.

### 3. Hardening de banco e segurança

- Foi adicionada migration específica de hardening do schema reconciliado.
- Grants auxiliares herdados foram restringidos.
- Funções sensíveis tiveram privilégios explícitos revisados.
- `handle_new_user()` permaneceu preservada temporariamente, mas sem execução pública para `anon` e `authenticated`.
- O acesso operacional continua reservado ao uso server-side apropriado.
- Nenhuma chave de serviço foi colocada no cliente ou nos relatórios.

### 4. Cleanup de uploads das calçadas

- A seleção de uploads expirados e órfãos foi isolada em módulo testável.
- Foram adicionados testes unitários para os critérios de cleanup.
- O comando foi validado em modo dry-run.
- Resultado: `COMUN_SIDEWALK_UPLOAD_CLEAN_DRY_RUN`.
- Nenhum registro ou objeto foi removido durante a validação.

### 5. Documentação consolidada

Foram atualizados ou criados relatórios sobre:

- fechamento da reconciliação;
- baselines e matriz de drift;
- ensaio de backup e restauração;
- readiness da migração remota;
- preflight remoto;
- reconciliação dos projetos Vercel;
- origem de `member_profiles`;
- decisão sobre `handle_new_user()`;
- cleanup remoto das calçadas.

Os relatórios canônicos agora começam separando estado atual, evidência, gates fechados, gates pendentes e decisão. As falhas históricas superadas foram mantidas como histórico, sem parecerem a decisão técnica vigente.

### 6. Publicação controlada no GitHub

Foram publicados cinco commits na branch existente:

1. `dd61805` — `fix(db): adiciona hardening do schema reconciliado`
2. `4fadaf1` — `feat(db): adiciona pacote forward-only da pr 23`
3. `bf015fd` — `test(db): comprova reconciliacao reproduzivel`
4. `dbcbf7f` — `chore(storage): endurece cleanup de uploads`
5. `d6df2d1` — `docs: consolida estado da reconciliacao remota`

O SHA remoto da branch foi confirmado como idêntico ao HEAD local. O checkpoint também foi registrado em comentário na PR #23.

## Evidências de qualidade

| Gate | Resultado atual |
| --- | --- |
| Typecheck | Aprovado |
| Lint | Aprovado |
| Testes unitários | 256/256 aprovados |
| Matriz RLS | `RLS_MATRIX_OK` |
| DB lint local | Sem erros |
| No-leak HTTP | Aprovado |
| Cleanup | Dry-run aprovado, zero mutações |
| Postflight de reconciliação | Aprovado |
| Idempotência | Aprovada |
| Preview Vercel da PR | Aprovado |
| Conflito Git | Ausente; PR marcada como `MERGEABLE` |

## Estado dos ambientes

### Local

- Pacote de reconciliação reproduzível: pronto.
- Hardening: pronto e versionado.
- Cleanup: pronto e testado em dry-run.
- Validações rápidas: aprovadas.
- Nenhum dado real foi incluído no Git.

### GitHub e preview

- Branch remota atualizada e sincronizada.
- PR #23 continua sendo a linha canônica ativa.
- Preview automático da Vercel concluído com sucesso.
- Nenhum merge foi realizado.
- A `main` permanece inalterada.

### Supabase remoto

- Nenhuma migration foi aplicada neste fechamento.
- Nenhum Auth remoto foi alterado.
- Nenhuma política, tabela, função, bucket ou objeto remoto foi modificado.
- A janela de migração remota ainda não foi autorizada.

### Produção e domínio

- Nenhum deploy manual foi executado.
- Nenhum domínio foi movido.
- O projeto Vercel canônico e o projeto antigo continuam exigindo reconciliação operacional antes da troca do domínio.
- O piloto público permanece fechado.

## Gates fechados

- pacote forward-only produzido;
- preflight e postflight definidos;
- dois ensaios locais reproduzíveis;
- idempotência comprovada;
- hardening de schema incluído;
- cleanup validado sem mutação;
- suíte local rápida aprovada;
- branch publicada sem force;
- SHA remoto verificado;
- preview Vercel aprovado;
- `main` preservada.

## Gates ainda pendentes

1. Restaurar um backup completo em ambiente isolado e validar sua utilizabilidade.
2. Executar a regressão integral production-like após a restauração.
3. Obter duas revisões nominais independentes do pacote e do plano de rollback.
4. Autorizar explicitamente a janela controlada de migração remota.
5. Aplicar as migrations no Supabase remoto somente durante essa janela.
6. Validar schema, RLS, Storage e Auth após a aplicação.
7. Validar o preview completo com contribuição exclusivamente demonstrativa.
8. Reconciliar os projetos Vercel antes de qualquer movimentação de domínio.
9. Autorizar separadamente o merge da PR #23.
10. Executar gate humano real com três participantes; estado atual: **0/3**.

## Gate final pré-janela — 21 de julho de 2026

- Autorização de backup: **PENDING_INCOMPLETE**.
- Backup completo: **NÃO CRIADO**.
- Restore isolado: **NÃO EXECUTADO**.
- RTO: **NÃO MEDIDO**.
- Contagens agregadas do restore: **NÃO DISPONÍVEIS**.
- Reconciliação sobre restore completo: **NÃO EXECUTADA**.
- Regressão integral production-like sobre restore: **NÃO EXECUTADA**.
- Revisão independente 1: **PENDENTE**.
- Revisão independente 2: **PENDENTE**.
- Runbook: **DRAFT_NOT_APPROVED**.
- Rollback: definido conceitualmente, ainda não comprovado em restore completo.

O processo foi interrompido corretamente antes do backup porque responsável, cofre, criptografia, custódia da chave, retenção, descarte, pessoas autorizadas e janela ainda não têm aprovação nominal. Nenhum desses campos foi inferido ou preenchido automaticamente.

## Riscos atuais

- Um preview aprovado não comprova compatibilidade com o banco remoto ainda não migrado.
- A restauração completa do backup ainda não foi demonstrada.
- A divergência histórica do banco exige aplicação ordenada e observação cuidadosa.
- A movimentação prematura do domínio pode apontar produção para o projeto Vercel incorreto.
- A ausência das duas revisões independentes impede tratar o pacote como aprovado para produção.
- O gate humano não pode ser inferido a partir de testes automatizados.

## Próxima decisão segura

Manter **NO_GO_REMOTE_INTEGRATION** até que backup, regressão production-like, duas revisões e autorização explícita estejam comprovados. Depois disso, a decisão poderá ser reavaliada para `READY_FOR_CONTROLLED_REMOTE_MIGRATION`.

## Declarações finais

- PR #23 continua aberta e é a linha ativa.
- Nenhuma nova sprint foi aberta.
- Nenhuma nova branch ou PR foi criada.
- Nenhum merge foi realizado.
- Nenhuma migration remota foi aplicada.
- Nenhum Supabase remoto foi alterado.
- Nenhum domínio foi movido.
- Nenhum deploy manual foi executado.
- Nenhum protocolo real foi criado.
- Gate humano permanece **0/3**.
- Piloto público permanece **fechado**.
