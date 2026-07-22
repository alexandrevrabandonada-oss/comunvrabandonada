# Autorização de backup completo — PR #23

## Estado canônico atual

**PENDING_INCOMPLETE — BACKUP NOT AUTHORIZED**

Este arquivo é somente um modelo sanitizado. Não inserir senhas, chaves, URLs de conexão, caminhos privados, dados pessoais, object keys ou conteúdo do backup.

## Evidência atual

- PR: `#23`
- Branch: `codex/sprint-40-1-mobile-preview`
- Versão candidata: `e71ad7d7cafb58ecaad89d6be3ca72932ff30221`
- Supabase CLI verificada durante a preparação: `2.109.1`
- Nenhum dump foi criado nesta preparação.
- Nenhum acesso ou escrita no Supabase remoto foi realizado.

## Gates fechados

- finalidade técnica definida: validar restauração completa e reconciliação forward-only em ambiente isolado;
- proibição de armazenar backup ou segredo no Git registrada;
- campos mínimos de autorização definidos.

## Gates pendentes

- todos os campos nominais e operacionais abaixo;
- aprovação explícita do responsável;
- confirmação do cofre e da chave separada;
- janela aprovada.

## Decisão

**NO_GO_REMOTE_INTEGRATION**

## Registro de autorização — preencher fora de qualquer terminal gravado

| Campo | Valor sanitizado | Estado |
| --- | --- | --- |
| Responsável pelo backup | `[PENDENTE — nome e função]` | PENDENTE |
| Finalidade | Restore isolado e gate pré-janela da PR #23 | DEFINIDA |
| Formato | `[PENDENTE — lógico/gerenciado e versões]` | PENDENTE |
| Localização do cofre | `[PENDENTE — identificador não sensível]` | PENDENTE |
| Algoritmo de criptografia | `[PENDENTE]` | PENDENTE |
| Responsável pela chave | `[PENDENTE — nome e função]` | PENDENTE |
| Retenção | `[PENDENTE — prazo]` | PENDENTE |
| Procedimento de descarte | `[PENDENTE]` | PENDENTE |
| Pessoas autorizadas | `[PENDENTE — nomes e funções]` | PENDENTE |
| Data e janela | `[PENDENTE — fuso America/Sao_Paulo]` | PENDENTE |
| Ambiente isolado de restore | `[PENDENTE — identificador não sensível]` | PENDENTE |
| Responsável pelo go/no-go | `[PENDENTE — nome e função]` | PENDENTE |

## Aprovação

- Decisão: `[PENDENTE: APPROVED | REJECTED]`
- Responsável: `[PENDENTE]`
- Data/hora: `[PENDENTE]`
- Observações sanitizadas: `[PENDENTE]`

Enquanto qualquer campo obrigatório permanecer pendente, é proibido criar dump, inventário de dados, checksum de artefato real ou iniciar o restore.
