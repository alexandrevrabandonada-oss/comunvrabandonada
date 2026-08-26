# COMUN 48.6-A3 — Rollout de schema

## Rollout Production concluído

Estado terminal: `COMUN_48_6_A3_FOLLOWUP_ESCALATION_GREEN_SCHEMA_ACTIVE_NO_AUTO_SEND`.

- `main` inicial do rollout: `5d124bc666389722a57fb24d06329268b46ac91c`; após a correção exclusiva do verificador, o merge SHA e `origin/main` são `759916f54faf287920437a10236f66ec1c8ef951`.
- Preflight read-only `32914592460` confirmou migration A3 ausente, colunas ausentes, transação read-only e plano remoto contendo exatamente `20260825120000_comun_followup_escalation_continuity.sql`.
- Promotion `32914674951` aplicou a migration uma única vez. Seu postflight inicial parou apenas porque o runner consultava a assinatura RPC com a ordem de parâmetros incorreta; o artefato sanitizado confirmou `migrationCount=1`, schema/constraints/index/RPCs/grants/RLS verdes e zero writes.
- O verificador foi corrigido na PR #400, com commit `87f3a359e70126287ba33ba2628e6037d6b98fba`, sem alterar a migration. A PR foi mergeada em `759916f54faf287920437a10236f66ec1c8ef951`.
- Postflight read-only corrigido `32915248906` confirmou: `responseRpc=true`, todos os invariantes de schema e segurança verdadeiros, `businessWrites=0`, `envWrites=0`, `externalOfficialSends=0` e `publicProjection=false`.
- Não houve segunda aplicação da migration, migration repair, alteração de env, envio oficial, fixture ou mudança de dados de negócio. A migration permanece aplicada exatamente uma vez.

Registro histórico pré-rollout.
Main de planejamento: `dd0366bf7e2eb43c63afd2631a7a30f015685deb`.
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
