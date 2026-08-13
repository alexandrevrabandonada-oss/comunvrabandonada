# COMUN 48.3-B1 — Rodas Vivas

**Estado:** Production green em 13/08/2026.

**Baseline:** `a8d2c95e64cdf98a2d8751034ddec7ee25391c22`

## Resultado funcional

B1 reutiliza a raiz canônica já existente: Pauta → Roda → Rodada → Contribuição → Síntese. Não cria thread, feed, comentário, tabela, API ou migration.

- a Pauta Viva passa a apresentar todas as Rodas públicas em ordem de estado, sem ranking;
- `/comun/pautas/[slug]/rodas/[circleId]` oferece uma leitura focal, mobile-first e acessível;
- somente a rodada `open` apontada exatamente por `current_round_id` pode receber participação;
- somente contribuições `visible` ou `incorporated` e síntese `published` entram no DTO público;
- duas sínteses publicadas para a mesma rodada produzem estado indisponível e diagnóstico sanitizado;
- submissões reutilizam a server action existente, fazem um único insert `pending` em `comun_circle_contributions` e nunca criam membership, contribuição geral ou ação;
- `registered_members` usa exclusivamente membership ativa da Pauta; `invited_group` e `internal` falham fechados;
- `community-experience.ts` não participa da projeção nem do estado social B1.

## Privacidade e moderação

O DTO público seleciona explicitamente apenas texto público, tipo, rótulo de autoria autorizado e data. Não seleciona contato privado, identidade autenticada, nota de moderação, papel, membership, protocolo interno ou configuração. Uma contribuição é guardada primeiro como `pending`; moderação protege somente sua publicação.

## Dados e operações

- `migrationCount=0`;
- nenhum grant novo para `anon` ou `authenticated`;
- nenhum acesso direto do cliente às tabelas sociais;
- nenhum dual-write;
- nenhuma publicação automática;
- Production rollout foi read-only e sem fixture (`businessWrites=0`).

## Validações e rollout

- PR funcional [#307](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/307), exact-head `acfbe06ab3d8d40b5bf3186707db2c09d32d30fc`, merge `e6af0d64877f1fe268a4a5f5d89510dcf7d3a2db`;
- CI completa no exact-head: 33 checks verdes e nenhum gate pendente ou bloqueante;
- preflight remoto metadata-only: run `31740964422`, com RLS/FORCE RLS, grants, constraints, guard de rodada atual e plano de migrations vazio;
- Supabase descartável: run `31740964399`, com um insert `pending`, nenhum dual-write e rollback integral;
- flags-off: run `31742234273`, A1 preservado, B1 oculto e `businessWrites=0`;
- wave 1: run `31742466100`, somente `COMUN_RODAS_VIVAS_ENABLED=enabled`, rota focal/empty state verdes e `businessWrites=0`.

## Acessibilidade e contraste

O fluxo possui headings, `fieldset`/`legend`, labels, navegação por teclado e confirmação anunciada com foco pós-submit. Como B1 tocou o componente A1 responsável pelo débito 4,45:1, os rótulos em papel foram elevados de `text-comun-asphalt/60` para `/70`; a prova renderizada mobile e os gates de navegador ficaram verdes.

## Débitos explícitos

`COMUN_48_3_B1_COMMUNITY_PAUTA_M2M_DEFERRED_NO_PRODUCT_NEED`

A relação N:N Comunidade↔Pauta não é necessária para Rodas, que pertencem canonicamente à Pauta. B1 não aumenta o schema.

Estado terminal:
`COMUN_48_3_B1_RODAS_VIVAS_CANONICAL_EXPERIENCE_GREEN_MODERATED_PUBLIC`.
