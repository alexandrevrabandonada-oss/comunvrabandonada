# Automação integral da PR #23

## Estado canônico atual

**NO_GO_REMOTE_INTEGRATION**

A automação foi versionada em modo fail-closed. CI e gates locais podem ser executados sem credenciais remotas. Workflows de backup, migração, domínio, merge e rollback são exclusivamente manuais e dependem de Environments protegidos que ainda não existem no repositório.

## Evidência atual

- Repositório: `alexandrevrabandonada-oss/comunvrabandonada`
- PR: `#23`
- Branch única: `codex/sprint-40-1-mobile-preview`
- HEAD inicial deste lote: `5cbda0bdecb7751d4500f10f3cf5a4ad41338ea1`
- Environments encontrados: `Preview` e `Production`.
- Required reviewers nos environments encontrados: zero.
- Branch protection da `main`: ausente.
- Environments PR23 necessários: ausentes.
- Nenhum workflow remoto foi executado neste lote.
- Nenhuma credencial foi lida ou alterada.

## Gates fechados

- workflows remotos sem trigger `pull_request` ou `push`;
- CI rápido limitado à PR #23, branch canônica e dispatch;
- full local gate reproduzível por dispatch ou `workflow_call`;
- verificador de duas revisões independentes;
- verificador de Environment protegido e branch canônica exclusiva;
- contrato de nomes de secrets com falha por ausência;
- readiness sanitizado e não versionado automaticamente;
- auditoria de secrets, dumps e artifacts de backup;
- actionlint aprovado;
- testes de fixtures aprovados;
- typecheck e lint aprovados.

## Gates pendentes

- criar e proteger os quatro Environments;
- cadastrar secrets por Environment;
- proteger `main` e exigir checks;
- obter duas aprovações humanas independentes para o SHA atual;
- executar CI e full local gate no GitHub;
- revisar operacionalmente o executor de backup/restore;
- comprovar restore completo e RTO;
- executar regressão restored production-like;
- aprovar a migração remota;
- aprovar domínio e merge separadamente;
- manter gate humano do produto em fluxo separado, atualmente 0/3.

## Decisão

**NO_GO_REMOTE_INTEGRATION**

## Workflows

| Workflow | Trigger | Escrita remota | Environment | Estado |
| --- | --- | --- | --- | --- |
| `pr23-ci.yml` | PR #23, push canônico, dispatch | Não | nenhum | pronto |
| `pr23-full-local-gate.yml` | dispatch/call | Não | nenhum | pronto |
| `pr23-readiness.yml` | dispatch/call | Não | nenhum | pronto |
| `pr23-backup-restore.yml` | dispatch | cofre privado; leitura do banco | `pr23-backup-gate` | bloqueado por Environment ausente |
| `pr23-controlled-migration.yml` | dispatch | banco/cleanup dry-run | `pr23-remote-migration` | bloqueado por Environment ausente |
| `pr23-history-alignment.yml` | dispatch | proibida neste lote | `pr23-remote-migration` | desabilitado por padrão e fail-closed |
| `pr23-domain-transfer.yml` | dispatch | Vercel/domínio | `pr23-domain-transfer` | bloqueado por Environment ausente |
| `pr23-final-merge.yml` | dispatch | merge e observação | `pr23-final-merge` | bloqueado por Environment ausente |
| `pr23-rollback.yml` | dispatch | conforme modo | `pr23-remote-migration` | bloqueado por Environment ausente; executor final ainda requer revisão |

## Scripts

- `lib.mjs`: constantes, fixtures, API GitHub, contratos e relatórios sanitizados.
- `verify-independent-reviews.mjs`: exige dois humanos distintos, APPROVED no SHA atual, sem bot, autor ou CHANGES_REQUESTED posterior.
- `verify-environment-protection.mjs`: exige required reviewers e branch policy exclusivamente canônica.
- `check-contract.mjs`: mostra somente nomes ausentes.
- `compute-readiness.mjs`: calcula decisões fail-closed.
- `audit-repository.mjs`: bloqueia arquivos sensíveis, dumps, chaves materializadas e backup como artifact.
- `transfer-domain.mjs`: transfere apex e `www`, com tentativa de rollback em falha.
- `gate-scripts.node-test.mjs`: cobre revisões, environments, SHA, secret contract e triggers remotos.

## Permissões

- CI e full local: `contents: read`.
- Readiness: leitura de contents, PR, actions e deployments.
- Backup/migração/domínio: leitura mínima de contents/PR/actions.
- Merge: `contents: write` e `pull-requests: write`, somente após Environment final.
- Nenhum workflow usa `permissions: write-all`.

## Environments necessários

1. `pr23-backup-gate`
2. `pr23-remote-migration`
3. `pr23-domain-transfer`
4. `pr23-final-merge`

Cada um deve ter ao menos um required reviewer e deployment branch policy customizada contendo somente `codex/sprint-40-1-mobile-preview`. A criação/configuração não foi automatizada para não reduzir o gate humano a código autoaprovado.

## Contrato de secrets — somente nomes

### Supabase

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_URL`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`

### Cofre privado de backup

- `PR23_BACKUP_BUCKET`
- `PR23_BACKUP_ENDPOINT`
- `PR23_BACKUP_ACCESS_KEY_ID`
- `PR23_BACKUP_SECRET_ACCESS_KEY`
- `PR23_BACKUP_ENCRYPTION_RECIPIENT`
- `PR23_BACKUP_DECRYPTION_KEY`

### Vercel

- `VERCEL_TOKEN`
- `VERCEL_TEAM_ID`
- `VERCEL_CANONICAL_PROJECT_ID`
- `VERCEL_LEGACY_PROJECT_ID`

Nenhum valor foi consultado, impresso ou versionado.

## Fail-closed comprovado localmente

- duas aprovações distintas no SHA atual: aceita;
- revisor duplicado: rejeitado;
- autor do último commit: rejeitado;
- bot: rejeitado;
- aprovação de SHA antigo: rejeitada;
- CHANGES_REQUESTED posterior: rejeitado;
- Environment sem reviewers: rejeitado;
- policy não exclusiva: rejeitada;
- secret ausente: erro contém somente o nome;
- workflows remotos em PR: ausentes;
- backup como GitHub Artifact: ausente;
- readiness incompleto: `NO_GO_REMOTE_INTEGRATION`.

## Backup e artifacts

O backup temporário é criado com permissões restritas, cifrado imediatamente e o claro é removido. O arquivo cifrado segue para cofre privado dedicado, nunca para GitHub Artifact. Somente summary sanitizado, checksum, contagens agregadas e RTO podem sair do job.

O executor permanece inacessível enquanto `pr23-backup-gate` não existir com proteção comprovada, CI/full gate e reviews não estiverem verdes e o contrato de secrets estiver incompleto.

## History alignment

O workflow existe separado, exige frase explícita e Environment, mas termina fail-closed. Ele não aplica migration repair e não será habilitado neste lote.

## Ações humanas irredutíveis

1. criar/proteger os Environments;
2. cadastrar secrets nos escopos corretos;
3. configurar branch protection e checks obrigatórios;
4. obter duas aprovações independentes;
5. aprovar Environment de backup;
6. aprovar Environment de migração/produção;
7. aprovar domínio;
8. aprovar merge final;
9. executar gate humano do produto, ainda 0/3.

## Declarações

- Nenhum workflow remoto foi disparado.
- Nenhum Supabase remoto foi acessado ou alterado.
- Nenhum backup foi criado.
- Nenhum secret foi lido.
- Nenhum domínio foi movido.
- Nenhum merge foi realizado.
- Nenhum migration repair foi executado.
- Nenhuma revisão humana foi simulada.
