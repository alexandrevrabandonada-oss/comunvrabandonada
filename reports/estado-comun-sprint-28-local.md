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
- `supabase db reset --local`: bloqueado porque Docker Desktop não expôs o engine local nesta sessão; nenhuma ação remota foi tentada.

## Restrições respeitadas

- Vercel deploy: não executado.
- Git push: não executado.
- Supabase remoto: não alterado.
- R2 real: não utilizado.
- Custo de deploy: R$ 0.
