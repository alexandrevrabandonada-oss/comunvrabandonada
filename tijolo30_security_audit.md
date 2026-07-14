# Tijolo 30 - Auditoria de seguranca

Ambiente: local-first, Supabase local via Docker.

Deploy: nao houve.

Checks contra producao: nao houve.

## Garantias adicionadas

- Tabelas internas classificadas como `admin_only` ou `service_role_only` falham no auditor se `anon` ou `authenticated` tiverem `SELECT`.
- Tabelas internas falham no auditor se RLS estiver desligado.
- Tabelas internas falham no auditor se houver policy publica permissiva.
- Tabelas sem classificacao falham no auditor.
- Tabelas marcadas como `must_fix` falham no auditor.

## Tabelas endurecidas neste tijolo

- `comun_admin_audit_log`
- `comun_admin_users`
- `comun_pauta_contributions`
- `comun_public_lookup_events`
- `comun_report_attachments`

## Confirmacoes de smoke

- `anon` e `authenticated` nao acessam diretamente tabelas internas protegidas.
- `service_role` segue acessando `comun_official_protocols` server-side.
- `comun_reports` nao retorna `raw_text`, `private_contact` ou `internal_notes` para leitura publica.
- `comun_report_attachments` nao expoe paths de storage.
- Dossies publicos seguem acessiveis por pagina segura.

## Risco restante

`comun_pauta_synthesis_versions` esta classificada como `needs_review`. A tabela tem RLS ligado e nenhuma policy publica, mas ainda possui grants herdados. Recomenda-se um tijolo curto para decidir se ela deve virar `admin_only` ou `service_role_only` com revogacao explicita.
