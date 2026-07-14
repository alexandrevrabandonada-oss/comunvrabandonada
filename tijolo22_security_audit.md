# Tijolo 22 - Security audit

## Ambiente

- Ambiente usado: local.
- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.
- Envio externo executado: nao.

## Banco

Tabela `comun_admin_profiles`:

- RLS habilitado;
- `anon` sem acesso;
- `authenticated` sem acesso;
- `service_role` com acesso.

Colunas internas adicionadas:

- `comun_pauta_dossier_reviews.reviewer_user_id`;
- `comun_pauta_dossiers.factual_reviewer_assigned_user_id`;
- `comun_pauta_dossiers.editorial_reviewer_assigned_user_id`;
- `comun_admin_notifications.assigned_to_user_id`.

## Controles

- Revisao aprovada exige perfil admin ativo.
- Permissao factual/editorial e validada por papel.
- Publicacao exige `publisher` ou `admin`.
- Publicacao exige revisores reais distintos.
- Revisoes antigas sem identidade aparecem como legado/nao vinculado e nao satisfazem publicacao nova.
- Responsaveis novos devem vir de perfis ativos.

## Nao vazamento

O smoke confirmou que a rota publica nao contem:

- segredo de teste;
- e-mails de perfis admin;
- `reviewer_user_id`;
- `assigned_to_user_id`;
- `comun_admin_profiles`.

## Conclusao

Sem vazamento publico detectado no escopo do Tijolo 22.
