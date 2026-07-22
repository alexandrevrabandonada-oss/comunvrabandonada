# Plano de alinhamento de histórico — PR #23

Status: **HISTORY_ALIGNMENT_ELIGIBLE — condicionado a revisão humana e backup completo**. Nenhum comando abaixo foi executado.

O postflight, os dois ensaios independentes e o hash final idêntico comprovam equivalência dos objetos COMUN representados. As tabelas legadas remotas e `handle_new_user()` são drift preservado e documentado, não objetos dessas 19 versões.

| Versão | Objetos representados | Assertion/evidência | Comando hipotético | Rollback do alinhamento |
|---|---|---|---|---|
| 20260715025948 | acesso de campo | objetos/policies no postflight + hash | `supabase migration repair 20260715025948 --status applied` | marcar `reverted` somente se nenhum DDL posterior depender |
| 20260715032613 | módulos, rodas, perfis | tabelas e FKs superset | `supabase migration repair 20260715032613 --status applied` | idem |
| 20260715151922 | guards relacionais | funções/triggers no hash | `supabase migration repair 20260715151922 --status applied` | idem |
| 20260715155802 | perfil comunitário | colunas/checks/FKs no postflight | `supabase migration repair 20260715155802 --status applied` | idem |
| 20260715170058 | arte territorial | tabelas/RLS/grants no hash | `supabase migration repair 20260715170058 --status applied` | idem |
| 20260715174723 | storage de arte | uploads/custódia/direitos | `supabase migration repair 20260715174723 --status applied` | idem |
| 20260715185344 | rádio | programas/episódios/direitos | `supabase migration repair 20260715185344 --status applied` | idem |
| 20260715192935 | inbox central | FK pauta + tipos completos | `supabase migration repair 20260715192935 --status applied` | idem |
| 20260716000000 | vertical calçadas | registros/prioridades/memória | `supabase migration repair 20260716000000 --status applied` | idem |
| 20260716120000 | FKs calçadas | constraints catalogadas | `supabase migration repair 20260716120000 --status applied` | idem |
| 20260717013709 | operação editorial | itens/assignments/events | `supabase migration repair 20260717013709 --status applied` | idem |
| 20260717022301 | personas operacionais | papel/check/índice | `supabase migration repair 20260717022301 --status applied` | idem |
| 20260718031145 | paginação operacional | função/índices | `supabase migration repair 20260718031145 --status applied` | idem |
| 20260719180751 | primeira participação | vínculo membro/registro | `supabase migration repair 20260719180751 --status applied` | idem |
| 20260719202300 | comunidades persistentes | memberships/grupos/inbox | `supabase migration repair 20260719202300 --status applied` | idem |
| 20260720161117 | mapa real | geometria/projeções/policies | `supabase migration repair 20260720161117 --status applied` | idem |
| 20260720185530 | encaminhamentos | forwarding/eventos/tipos inbox | `supabase migration repair 20260720185530 --status applied` | idem |
| 20260721155914 | captura rápida | sessão anônima/foto/metadados | `supabase migration repair 20260721155914 --status applied` | idem |
| 20260721164415 | upload privado | tickets/policy própria | `supabase migration repair 20260721164415 --status applied` | idem |

Os comandos são documentação operacional, não autorização. A execução continua proibida até snapshot completo restaurável, duas revisões nominais e janela aprovada. O rollback real de schema é restore/PITR; `repair --status reverted` altera apenas o ledger e nunca desfaz DDL.
