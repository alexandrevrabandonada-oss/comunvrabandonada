# COMUN 48.6-A3 — Rollout de schema

Status desta branch: candidato pré-rollout.  
Main confirmado: `dd0366bf7e2eb43c63afd2631a7a30f015685deb`.  
Migration única autorizada: `20260825120000_comun_followup_escalation_continuity.sql`.

## Limites

Nenhuma migration foi aplicada em Production nesta execução. Não houve
alteração de env, dados de negócio, denúncia real, protocolo, publicação,
Search, coleção ou envio externo.

## Preflight e pós-flight exigidos

O workflow `comun-48-6-a3-disposable.yml` roda somente em Supabase local,
rejeita `SUPABASE_DB_URL`, `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` e
`SUPABASE_SERVICE_ROLE_KEY`, aplica o conjunto completo em ambiente
descartável, verifica os contratos e executa `ROLLBACK`.

Promotion Production permanece separada: preflight read-only, plano contendo
somente a migration A3, aplicação única, grants/RLS, runtime e smokes GET/HEAD.
Esta branch não executa esse promotion.

## Delta declarado

`ProductionSchemaWrites=0`  
`ProductionBusinessWrites=0`  
`ProductionEnvWrites=0`  
`externalOfficialSends=0`  
`fixtures=0`  
`publications=0`
