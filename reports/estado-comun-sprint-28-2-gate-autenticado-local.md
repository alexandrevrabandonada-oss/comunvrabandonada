# Gate autenticado local — Sprint 28.2

## Concluído

- Factory local determinística com cinco personas `@comun.test`.
- Seed idempotente de admin local e memberships/miniapp por suíte.
- Preparação, cleanup e assert-clean passaram no Supabase local.
- Smoke público local determinístico implementado.

## Bloqueio concreto

O produto não possui login de usuário comum: a única entrada de sessão é `/comun/admin/login`, que rejeita pessoas sem `comun_admin_users`. Além disso, `/comun/minha-participacao` redireciona para esse login administrativo. Logo, não é possível executar honestamente E2E de participante, facilitador ou membro sem vínculo sem criar uma nova funcionalidade de autenticação, fora do escopo desta sprint.

## Declarações

- Vercel deploy: NÃO EXECUTADO.
- Git push: NÃO EXECUTADO.
- Supabase remoto: NÃO ALTERADO.
- R2 real: NÃO UTILIZADO.
- Smoke remoto: NÃO EXECUTADO.
- Custo externo: R$ 0.
