# COMUN — 48.1A · diagnóstico de permissão do projeto Supabase

Data: 2026-08-05

## Inventário seguro

| item | resultado |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | ausente no processo |
| `SUPABASE_PROJECT_ID` | ausente no processo |
| `SUPABASE_PROJECT_REF` | ausente no processo |
| `SUPABASE_DB_URL` | ausente no processo |
| `SUPABASE_SERVICE_ROLE_KEY` | ausente no processo |
| Supabase CLI | 2.111.0 |
| vínculo local | ausente (`supabase/config.toml` existe, sem project-ref local) |
| conta CLI | autenticada por perfil local; segredo não lido |

## Leitura de escopo

`supabase projects list` conseguiu listar o projeto esperado e o estado
`ACTIVE_HEALTHY`, sem registrar host, token ou credencial no artifact. O MCP
`list_projects` não listou esse projeto e `get_project` retornou
`You do not have permission to perform this action`.

Classificação separada:

- CLI Management API: autenticada, projeto no escopo;
- MCP: `authenticated_but_permission_insufficient` para o projeto-alvo;
- banco read-only: não testado, pois exigiria senha/DB URL não disponíveis e
  não autorizados para este diagnóstico;
- `project_scope_missing`: não aplicável à CLI; permanece aplicável ao
  conector MCP.

Não houve tentativa de obter chave, alterar papel, aceitar convite, vincular o
projeto, executar SQL, consultar linhas, aplicar migration ou alterar
configuração.

## Gate humano mínimo

Nenhuma intervenção foi solicitada. Se o preflight de banco ainda for
necessário, o menor passo é conceder ao conector/identidade usada pelo MCP
acesso read-only ao projeto, ou reautenticar o MCP com a mesma conta que a CLI
já usa. O usuário não deve colar PAT, senha, MFA, cookie ou service role no
chat.

Estado: `COMUN_48_1A_REMOTE_PREFLIGHT_BLOCKED_PROJECT_PERMISSION`.
