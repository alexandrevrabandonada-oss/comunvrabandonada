# Decisão sobre `handle_new_user()` — PR #23

Data: 21 de julho de 2026
Decisão: **C. PRESERVE_REMOTE_ONLY_TEMPORARILY**
Revisão obrigatória até: 21 de agosto de 2026

## Evidência

No snapshot `REMOTE_ACTUAL`, `public.handle_new_user()` é `SECURITY DEFINER`, pertence a `postgres`, fixa `search_path=public` e tenta criar `public.profiles` com `username` e `display_name` derivados de `auth.users.raw_user_meta_data` ou do e-mail. A função possuía `EXECUTE` para `PUBLIC`, `anon`, `authenticated`, `postgres` e `service_role`.

Nenhum trigger associado foi encontrado em `pg_trigger`. A busca no repositório também não encontrou chamada canônica. Portanto, a função não participa do onboarding atual comprovado, mas sua origem e eventual consumidor externo continuam desconhecidos.

## Tratamento forward-only

- preservar função e tabela legada; nenhum `DROP`;
- revogar `EXECUTE` de `PUBLIC`, `anon` e `authenticated`;
- manter `service_role` durante a janela de observação;
- não importar a função para instalações limpas;
- não usar `raw_user_meta_data` para autorização;
- registrar qualquer chamada observada antes da data de retirada.

## Critério de retirada

`RETIRE_SAFELY` somente depois de confirmar, durante a janela, ausência de trigger, chamada de aplicação, webhook, Edge Function ou automação externa. A retirada futura deve remover a função em lote próprio e não integra esta reconciliação.
