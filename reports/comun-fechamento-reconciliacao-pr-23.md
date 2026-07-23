# Fechamento do pacote de reconciliação — PR #23

## Estado canônico atual

O pacote forward-only está validado localmente e pronto para integrar a PR #23. O Supabase remoto permanece inalterado.

## Evidência atual

Hardening, preflight, módulos 01–10, postflight, runner fail-closed, dois ensaios independentes com hash idêntico, idempotência, RLS, DB lint, unitários, no-leak e cleanup dry-run estão aprovados.

## Gates fechados

- schema reconciliado em ambiente isolado;
- grants do upload endurecidos;
- drift de `handle_new_user()` controlado;
- pacote sem DDL destrutivo, dumps, dados ou segredos.

## Gates pendentes

- backup completo restaurado;
- regressão integral production-like;
- duas revisões nominais;
- aplicação remota autorizada.

## Decisão

**NO_GO_REMOTE_INTEGRATION**

Data: 21 de julho de 2026
Branch: `codex/sprint-40-1-mobile-preview`
Decisão: **NO_GO_REMOTE_INTEGRATION**

## Resultado alcançado

Foi produzido um pacote forward-only que transforma o snapshot `REMOTE_ACTUAL` no superset `LOCAL_EXPECTED_HARDENED` sem executar as 19 migrations históricas, sem apagar tabelas ou linhas e sem alterar o Supabase remoto.

- migration limpa `20260722003105_pr23_schema_security_hardening.sql` criada pelo Supabase CLI;
- grants `anon`/`PUBLIC` indevidos removidos de `comun_sidewalk_uploads`;
- FKs de `comun_member_profiles` e `comun_member_inbox` consolidadas como superset;
- `handle_new_user()` preservada temporariamente, sem trigger associado e sem execução pública;
- diff bruto filtrado: 867 statements preservados; 35 operações destrutivas sobre objetos legados recusadas;
- módulos `01` a `10`, runner fail-closed e bloqueio remoto por padrão;
- Ensaio 1 e Ensaio 2 aprovados a partir de ambientes inteiramente recriados;
- reexecução reconhecida como `PR23_RECONCILIATION_ALREADY_RECONCILED`.

## Evidência reproduzível

| Gate | Resultado |
|---|---|
| Reset limpo com hardening | aprovado |
| Postflight | aprovado nos dois ensaios |
| Hash bruto final | `227c39c855a626ebbe96428701848aded067acd687d2876403fcab4f80e0bbd1` nos dois ensaios |
| Estrutura | 175 tabelas, 45 policies, 428 índices, 9 funções nos dois ensaios |
| Typecheck | aprovado |
| Lint | aprovado |
| Unitários | 256/256 |
| RLS | `RLS_MATRIX_OK` |
| DB lint do alvo limpo | sem erros |
| No-leak local `/comun/calcadas` | aprovado |
| Cleanup | dry-run aprovado; ambiente incorreto, referência ativa e idade mínima cobertos por unitários |

As 175 tabelas incluem sete tabelas sociais legadas preservadas do remoto. O alvo COMUN canônico permanece equivalente; a diferença residual é intencional e documentada, sem `DROP`.

## Gates ainda fechados

- backup completo cifrado e restore com dados/Auth/Storage: não executado por ausência de cofre, chave, retenção e autorização operacional específica para material com PII;
- testes integrais production-like de todos os domínios sobre o snapshot reconciliado: não executados neste lote;
- duas revisões humanas nominais do pacote: pendentes;
- aplicação remota, alinhamento do ledger, domínio e merge: proibidos neste lote.

Por isso, os marcadores `COMUN_REMOTE_BACKUP_RESTORE_VERIFIED`, `COMUN_REMOTE_SCHEMA_RECONCILIATION_REHEARSAL_OK` e `COMUN_PR23_HISTORY_ALIGNMENT_ELIGIBLE` **não são emitidos como gates finais combinados**. A equivalência de schema e os dois ensaios estão comprovados, mas readiness remoto continua bloqueado.

## Declarações

- nenhuma migration remota;
- nenhum migration repair;
- nenhum domínio movido;
- nenhum merge;
- nenhum deploy manual;
- PR #23 permanece única linha ativa;
- gate humano 0/3;
- piloto público fechado.
