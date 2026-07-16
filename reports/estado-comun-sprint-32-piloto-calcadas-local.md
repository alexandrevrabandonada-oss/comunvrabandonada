# Sprint 32 — piloto local de Calçadas

Data: 15/07/2026

## Escopo

Validação local-first do piloto `Mapa Popular das Calçadas` em ambiente totalmente local: Next.js, Supabase local e testes smoke sem deploy remoto ou custo.

## Entregas e avanços

- Ambiente local configurado com `supabase` local e `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
- Script de smoke específico adicionado: `scripts/smoke-comun-sidewalk-pilot.mjs`.
- Wrapper de ambiente local validou `ALLOW_LOCAL_TESTS=true`, `COMUN_BASE_URL` em `localhost` e bloqueio de destinos remotos.
- Ajuste no smoke: correção do helper `one()` e desestruturação de retornos Supabase para evitar falha em `pauta.id`.
- Identificado e corrigido bug de schema: o smoke agora usa `comun_official_protocols` em vez de `comun_pauta_protocols`.
- Servidor Next local iniciado corretamente via `node scripts/comun-local-env.mjs run npm run dev -- -p 3000`.

## Estado atual

- Supabase local está disponível em `http://127.0.0.1:55431`.
- `npx supabase status -o env` retorna as variáveis de ambiente locais corretamente.
- `scripts/comun-local-env.mjs` gera o ambiente local e demonstra que o processo não aponta para serviços remotos.
- O smoke de criação de pauta foi ajustado para o fluxo correto e o teste agora está pronto para reexecução.

## Evidências

- `npm run local:env:check` valida a configuração local.
- `next dev -p 3000` executa o app localmente com `localhost:3000` ativo.
- Último estado do smoke mostrou `PGRST205` devido a uso de tabela incorreta, corrido agora para `comun_official_protocols`.

## Restrições preservadas

- Não houve push ou deploy remoto.
- Não houve alteração de Supabase remoto.
- Não houve uso de R2 remoto.
- Custo do trabalho local: R$ 0.

## Próximos passos

- Reexecutar `node scripts/comun-local-env.mjs run npm run smoke:sidewalk-pilot`.
- Confirmar que a página pública `/comun/pautas/:slug` retorna `200` após a criação da pauta.
- Validar cleanup e remoção de fixtures geradas pelo smoke.
- Se passar, documentar conclusão do piloto local em `reports/comun-diagnostico-piloto-calcadas.md`.
