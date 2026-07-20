# Sprint 28.3.1 — fechamento da autenticação comunitária local

Data: 2026-07-15

Status: **aprovada em localhost**.

## Entrega

- Cadastro estrito, confirmação de senha, honeypot, aceite de termos/privacidade e perfil privado por padrão.
- Login comunitário separado do admin, onboarding obrigatório, conta, privacidade, logout e desativação com pausa de vínculos.
- Recuperação com resposta anti-enumeração e redefinição protegida pela sessão do link do Supabase Auth.
- Sessão opcional/obrigatória, membership e papel por pauta, além do admin global separado.
- Contribuições autenticadas recebem `author_member_id` exclusivamente da sessão no servidor.
- Contas suspensas, desativadas ou arquivadas não entram nem executam ações comunitárias.

## Evidências locais

- `supabase db reset`: aprovado, incluindo `20260715155802_comun_community_auth_profiles.sql`.
- `test:fixtures:prepare` e `test:fixtures:cleanup`: aprovados para cinco personas.
- `smoke:community-auth:local`: aprovado para login, facilitator, participant, sem vínculo e suspensão.
- `test:fixtures:assert-clean`: aprovado; zero pautas e zero usuários fixture restantes.
- `npm run lint`, `npm run typecheck` e `npm run build`: aprovados; Next.js 16.2.10 gerou as rotas novas.

## Limites

- Somente Docker/Supabase/Next locais.
- Nenhum push, deploy Vercel, Supabase remoto, R2 real, OAuth, SMS ou serviço de e-mail externo.
- Custo externo: R$ 0.

## Regressão do scheduler

Gate anterior preservado. Não houve alteração de cron, secrets, endpoint, fila ou scheduler nesta sprint; nenhuma falha local relacionada foi observada.
