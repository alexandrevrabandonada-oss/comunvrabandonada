# Checkpoint de reset final — Sprint 33.2.1

Data: 17/07/2026. Worktree: `C:\Projetos\comun-auth-closeout-local`. Branch: `codex/comun-auth-closeout-local`. Commit no checkpoint: `a70b371` antes da correção de recovery.

## Estado observado

| Item | Estado |
|---|---|
| Banco | saudável (`supabase_db_COMUM_VR_ABANDONADA`) |
| Kong | saudável (`supabase_kong_COMUM_VR_ABANDONADA`) |
| Auth | saudável (`supabase_auth_COMUM_VR_ABANDONADA`) |
| Storage | saudável (`supabase_storage_COMUM_VR_ABANDONADA`) |
| PostgREST | em execução (`supabase_rest_COMUM_VR_ABANDONADA`) |
| Vector | reiniciando; opcional para os gates locais |
| Migrations versionadas | 52 |
| Migrations aplicadas | 52 |
| Portas locais | aplicação 3000; API 55431; DB 55432; Studio 55433; Inbucket 55434 |
| Processos Next | `next dev` e processo filho ativos, pertencentes ao runner local anterior |

## Incidente anterior

O `supabase db reset --local` aplicou migrations e o seed vazio, mas retornou 502 ao consultar `GET /storage/v1/bucket`. O log de Kong registrou `connect() failed (111: Connection refused)` para o upstream do Storage. Após o restart, DB, Kong, Auth, Storage e PostgREST ficaram saudáveis.

Classificação preliminar: **B — migrations concluídas; readiness temporariamente indisponível durante o restart do Storage**. Essa classificação ainda exige reprodução controlada e o contrato de recovery; não autoriza a continuação automática de um reset incompleto.

## Segurança e escopo

- Nenhum serviço remoto foi consultado.
- Nenhum volume foi removido.
- Nenhum restart amplo de Docker, banco ou Auth foi executado.
- Não houve push, deploy, R2 real ou dados reais.
