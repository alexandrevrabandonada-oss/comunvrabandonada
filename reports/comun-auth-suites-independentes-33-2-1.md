# Suítes Auth independentes — Sprint 33.2.1

Data: 17/07/2026. Ambiente local; sem push, deploy, acesso remoto ou custo externo.

## Resultado comprovado

1. Diagnóstico mínimo `operations_admin`: 10 rodadas consecutivas com criação, identity, perfil, papel, login, refresh, rota protegida, `storageState`, contexto novo, Axe simples, logout e cleanup — `COMUN_AUTH_STORAGE_STATE_LOCAL_OK`.
2. E2E: 42/42, com `COMUN_TEST_FIXTURES_CLEAN`.
3. Axe isolado: 15/15, zero serious/critical e cleanup.
4. Visual isolado: 15/15, viewports explícitos e cleanup.
5. Axe isolado repetido após o visual: 15/15, zero serious/critical e cleanup.

Cada suíte recebeu `runId`, e-mails próprios e novo diretório `.local/comun-auth/<runId>`. O manifesto não contém tokens; os arquivos e personas são removidos no teardown. A execução respeitou o limite normal local de 30 e só iniciou uma rodada após o orçamento observável de logins password da janela de cinco minutos estar disponível.

## Bloqueios para os próximos gates

- `supabase/seed.sql` está não rastreado e é referenciado por `supabase/config.toml`; um `supabase db reset --local` aplicaria trabalho paralelo de seed. Não foi executado para preservar o isolamento.
- `npm run typecheck` falha em `lib/media-storage/index.test.ts` e `lib/media-storage/index.ts`, arquivos paralelos fora do escopo Auth.
- O Vector local reinicia por falta de alcance ao Docker host; classificado como observabilidade opcional, sem impacto nos gates acima.

Portanto, Reset 1/2, `next start`, performance e decisão técnica final permanecem pendentes. A decisão atual continua **NO-GO local** até que os trabalhos paralelos sejam separados ou autorizados para revisão.
