# Runtime de `handle_new_user`

Decisão: `PRESERVE_AND_HARDEN`.

- Trigger: `auth.on_auth_user_created`, após INSERT em `auth.users`.
- Função: `public.handle_new_user()`, trigger `SECURITY DEFINER`, owner
  `postgres`.
- Efeito: cria `public.profiles` com `id`, `username` e `display_name`.
- Metadata: participa apenas do conteúdo inicial do perfil; não concede papel,
  autorização ou permissão.
- Grants comprovados: `postgres` e `service_role`; sem execução por `PUBLIC`,
  `anon` ou `authenticated`.
- Antes: `search_path=public`.
- Esperado após promoção: `search_path=pg_catalog`, referências de aplicação
  preservadas com qualificação `public`.

Testes obrigatórios na promoção: usuário sintético, disparo do trigger,
perfil correspondente, contrato de nomes, ausência de autorização derivada de
metadata, colisão atômica e cleanup sem resíduos.

