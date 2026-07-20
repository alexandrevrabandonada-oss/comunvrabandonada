# Checkpoint — Sprint 36.1

- Data: 19/07/2026
- Branch: `codex/comun-comunidades-persistentes-local`
- Base/HEAD inicial: `16a96dfb8ffb869ba4260ed5ac885ca429497049`
- Status inicial: limpo
- Processo: worktree isolado; local-first; sem remotos

## Inventário

| Necessidade | Estrutura existente | Reutilizar | Adaptar | Criar |
|---|---|---:|---:|---:|
| Comunidade | `comun_communities` | sim | não | não |
| Perfil/autenticação | `comun_member_profiles`, Supabase Auth local | sim | não | não |
| Membership de pauta | `comun_pauta_memberships` | como referência | não | não |
| Vínculo comunitário | inexistente | não | não | sim, mínimo |
| Preferências | somente localStorage na Sprint 36 | não | migrar fluxo | colunas no vínculo |
| Papéis/capacidades | autorização operacional global e papéis de pauta | matriz conceitual | escopo comunitário | atribuição separada |
| Home/Minha área | `getPersonalCenter` | sim | integrar vínculo | não |
| Inbox | `comun_member_inbox` | sim | ampliar tipos | não |
| Busca | `unifiedPublicSearch` | sim | incluir comunidades | não |
| Rodas/tarefas/resultados | domínios de pauta existentes | sim | relacionar | não |
| Grupos | fixture somente | não | não | estrutura mínima |
| Auditoria | logs administrativos específicos | padrão | não | log privado comunitário |

Migration aditiva criada pelo CLI: `20260719202300_comun_persistent_communities.sql`. Nenhuma segunda fonte de verdade para pautas, rodas, tarefas, resultados ou inbox.

## Declarações obrigatórias

Piloto **não aberto**; integração principal, push e deploy **não executados**; Supabase remoto **inalterado**; R2 real, serviços externos e dados reais **não utilizados**; custo externo **R$ 0**.
