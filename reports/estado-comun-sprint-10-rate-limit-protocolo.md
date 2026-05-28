# Estado COMUN Sprint 10 - rate limit do acompanhamento por protocolo

Data: 2026-05-27

## Objetivo

Adicionar limitacao de taxa e observabilidade minima para `/comun/acompanhar` e `/comun/acompanhar/[protocol]`, reduzindo risco de brute force sem exigir login publico.

## Migration criada

- [supabase/migrations/202605270002_protocol_follow_rate_limit.sql](</C:/Projetos/COMUM VR ABANDONADA/supabase/migrations/202605270002_protocol_follow_rate_limit.sql>)

Status remoto:

- aplicada no Supabase remoto com `npx supabase db push --linked --password ... --yes`;
- a senha foi usada apenas como variavel de processo e nao foi gravada em arquivo versionado;
- tabela criada: `comun_public_lookup_events`.

## Tabela criada

`comun_public_lookup_events`

Campos principais:

- `lookup_type`
- `protocol_hash`
- `normalized_protocol`
- `result_type`
- `ip_hash`
- `user_agent_hash`
- `route`
- `metadata`
- `created_at`

RLS:

- habilitado;
- politica publica de leitura bloqueada;
- escrita/leitura operacional feita server-side com service role.

Indices:

- `created_at desc`;
- `ip_hash, route, created_at desc`;
- `protocol_hash, ip_hash, created_at desc`;
- `result_type, ip_hash, created_at desc`.

## Politica de dados armazenados

Eventos registram somente dados operacionais de consulta:

- resultado da consulta;
- rota;
- protocolo normalizado e hash do protocolo;
- hash de IP;
- hash de user-agent;
- metadata sanitizada.

Nao sao armazenados:

- `raw_text`;
- `private_contact`;
- `internal_notes`;
- IP bruto;
- user-agent bruto;
- senha, token ou service role;
- dados de admin.

`COMUN_LOOKUP_HASH_SALT` foi adicionado a `.env.example`, docs e Vercel. Em producao, o salt foi configurado como variavel sensivel.

## Estrategia de rate limit

Helper criado:

- [lib/rate-limit.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/rate-limit.ts>)

Limites em janela de 10 minutos:

- por `ip_hash + route`: maximo de 20 consultas;
- por `protocol_hash + ip_hash`: maximo de 5 consultas ao mesmo protocolo;
- por `invalid_format + ip_hash`: maximo de 10 protocolos invalidos.

Quando excede:

- registra `rate_limited`;
- nao retorna detalhes adicionais;
- mostra mensagem publica: `Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.`

## Rota publica impactada

- [app/comun/acompanhar/[protocol]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/acompanhar/[protocol]/page.tsx>)
- [lib/reports.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/reports.ts>)

Fluxo:

1. normaliza protocolo;
2. valida formato;
3. aplica limite server-side;
4. busca apenas superficie publica segura;
5. registra resultado em `comun_public_lookup_events`.

## Rota admin criada

- [app/comun/admin/observabilidade/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/observabilidade/page.tsx>)

Acesso:

- exige `requireComunAdmin({ roles: ["admin"] })`;
- `/comun/admin/observabilidade` redireciona nao autenticado para login.

Mostra:

- total de consultas nas ultimas 24h;
- invalidos;
- nao encontrados;
- encontrados;
- rate limited;
- ultimos eventos sem IP bruto e sem user-agent bruto;
- protocolo mascarado na tabela.

`AdminShell` agora inclui link para `Observabilidade`.

## Status de nao vazamento

Mantido:

- `raw_text` nao aparece publicamente;
- `private_contact` nao aparece publicamente;
- `internal_notes` nao aparece publicamente;
- `id` interno e dados de admin nao sao retornados na consulta publica.

O smoke novo valida que a pagina de protocolo invalido, inexistente e valido nao exibe campos ou marcadores sensiveis.

## Smokes locais

Rodados contra `http://localhost:4021`:

- `npm run lint`: passou
- `npm run typecheck`: passou
- `npm run build`: passou
- `npm run verify`: passou
- `npm run smoke:comun`: passou
- `npm run smoke:admin-auth`: passou
- `npm run smoke:no-leak-http`: passou
- `npm run smoke:public-ui`: passou
- `npm run smoke:protocol-follow`: passou
- `npm run smoke:protocol-rate-limit`: passou

Checagem adicional:

- `/comun/admin/observabilidade` sem sessao retornou redirect para `/comun/admin/login?redirectTo=%2Fcomun%2Fadmin%2Fobservabilidade`.

## Deploy

Deploy feito: sim

Comando:

```bash
npx vercel deploy --prod --yes
```

URL publica:

- [https://comunvrabandonada.vercel.app](https://comunvrabandonada.vercel.app)

Build Vercel:

- passou;
- rota `/comun/admin/observabilidade` incluida no build;
- alias de producao atualizado.

## Smokes em producao

Rodados com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`:

- `npm run smoke:protocol-follow`: passou
- `npm run smoke:protocol-rate-limit`: passou
- `npm run smoke:no-leak-http`: passou
- `npm run smoke:public-ui`: passou

## Arquivos alterados/criados

- `.env.example`
- `app/comun/acompanhar/[protocol]/page.tsx`
- `app/comun/admin/observabilidade/page.tsx`
- `components/admin-shell.tsx`
- `docs/deploy-checklist.md`
- `docs/env.md`
- `docs/vercel.md`
- `lib/rate-limit.ts`
- `lib/reports.ts`
- `lib/types.ts`
- `package.json`
- `scripts/smoke-comun-protocol-rate-limit.mjs`
- `supabase/migrations/202605270002_protocol_follow_rate_limit.sql`

## Riscos restantes

1. O rate limit usa banco Postgres e atende bem ao MVP, mas pode ser substituido por camada dedicada de edge/rate limit se o volume crescer.
2. `normalized_protocol` fica armazenado para operacao interna; na tela admin ele e mascarado. Se a politica de privacidade exigir minimizacao extrema, pode-se remover esse campo e operar apenas com hash.
3. Eventos de smoke de protocolo invalido/inexistente podem ficar no log operacional, mas sem IP bruto e sem dados do relato.

## Proximo tijolo recomendado

Criar uma tela admin de limpeza/retencao operacional para eventos publicos e auditoria, definindo janela de retencao, exportacao interna e remocao segura de logs antigos.
