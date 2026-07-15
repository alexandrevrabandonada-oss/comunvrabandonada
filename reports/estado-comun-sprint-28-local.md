# Estado COMUN — Sprint 28 local

Data: 2026-07-15

## Escopo entregue

- Catálogo fechado de módulos, templates idempotentes e compositor administrativo.
- Superfície pública modular com fallback legado.
- Schema para rodas, rodadas, contribuições, sínteses, vínculos de decisão, identidade mínima, vínculos de pauta e atualizações.
- RLS e privilégios explícitos de `service_role` em todas as tabelas novas.

## Checagem local

- `npm run smoke:pauta-miniapp`: aprovado com guardas de localhost.
- `npm run test:unit`: aprovado (90 testes).
- `npm run lint`, `npm run typecheck` e `npm run build`: aprovados com valores locais de teste, sem apontar a serviços remotos.
- Sprint 28.1: Docker Desktop recuperado; `supabase db reset --local` passou duas vezes, incluindo os guards relacionais finais.
- Sprint 28.1: `RLS_MATRIX_OK`, gate SQL de constraints/privacidade e smokes HTTP core/no-leak passaram contra localhost em modo produção.
- Sprint 28.3.1: autenticação comunitária, onboarding, privacidade, recuperação, desativação e autorização por persona aprovados em Supabase local; fixtures limpas ao final.

## Restrições respeitadas

- Vercel deploy: não executado.
- Git push: não executado.
- Supabase remoto: não alterado.
- R2 real: não utilizado.
- Custo de deploy: R$ 0.
