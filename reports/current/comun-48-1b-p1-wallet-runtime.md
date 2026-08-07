# COMUN 48.1B-P1 — runtime da Carteira

- flag canônica: `COMUN_PARTICIPATION_WALLET_ENABLED`;
- alias local preservado: `COMUN_PARTICIPATION_WALLET_LOCAL`;
- produção exige `VERCEL_ENV=production`, URL Supabase HTTPS allowlisted e service role server-side;
- local exige loopback, `ALLOW_LOCAL_TESTS=true` e chave sintética;
- cookie HttpOnly, SameSite=Lax e Secure em produção;
- cliente Supabase da Carteira é dedicado e nunca é criado no navegador;
- vínculo Conta–Carteira e desvinculação são ações explícitas;
- tokens, recovery code, IDs internos e chaves não aparecem na lista da Carteira.

Estado técnico: `GREEN_FLAG_STAGED_OFF`.
