# COMUN — Tijolo 48.0B — persistência durável local do Relata

Atualizado em 3 de agosto de 2026.

## Estado da candidata

`COMUN_RELATA_48_0B_LOCAL_CANDIDATE_GREEN_REMOTE_DB_UNCHANGED`

A persistência está comprovada somente contra Supabase descartável local. A
flag continua desligada em Production, a migration não foi promovida e nenhum
canal externo foi acionado. PR, merge e Production serão preenchidos no
fechamento da integração.

## Base e branch

- base/main: `97c102d2a2464e511cd443ee29cac119d7e7c360`;
- branch: `codex/tijolo-48-0b-relata-durable-local`;
- candidata funcional após hardening RLS:
  `f96f92efd99a28525a172ca7d497ab03d615316c`;
- PR #151, inicialmente draft enquanto os checks remotos são coletados;
- migration forward-only:
  `20260803161310_comun_relata_durable_local.sql`;
- SHA-256: `cb216666f64602c02e756d8e2d66017e5a721c7b9ad7810f793cad6a276606b7`;
- manifesto: `supabase/local-releases/20260803161310-comun-relata-durable-local.json`;
- `requiresPromotion=false`; `remotePromotionAllowed=false`;
- Supabase remoto: não consultado, não migrado e não alterado.

## Modelo e fronteiras

| Superfície | Objetos | Conteúdo |
| --- | --- | --- |
| privada | `private.comun_relata_reports` | original, triagem, hashes de recibo/ator/idempotência, retenção |
| operacional | `public.comun_relata_cases`, `consents`, `status_events` | protocolo COMUN, decisão, estado, consentimento e histórico |
| futura privada | `private.comun_relata_private_locations` | contrato bloqueado; zero linhas |
| futura pública | `public.comun_relata_public_snapshots` | contrato bloqueado; zero publicação |

Funções server-only allowlisted: `comun_relata_create`,
`comun_relata_get_receipt` e `comun_relata_withdraw`. Todas são
`security definer` com `search_path=pg_catalog`, validam argumentos e não
retornam original, segredo, hash ou coordenada.

RLS está habilitada e forçada nas seis tabelas. `PUBLIC`, `anon` e
`authenticated` não possuem CRUD direto nem EXECUTE nas RPCs. Somente a API
server-only local usa `service_role`; qualquer futura tela administrativa deve
continuar mediada pelo servidor. Eventos são append-only e protocolos não
podem mudar de `comun` para oficial.

## Protocolo, idempotência e estado

- protocolo atômico `COMUN-RELATA-` + 16 hex maiúsculos, não sequencial;
- `kind=comun`, `is_official=false`, `official_protocol=null` por constraint;
- segredo do recibo e chave de idempotência persistidos apenas como SHA-256;
- lock transacional e payload hash preservam repetição sequencial e concorrente;
- a RPC aceita somente respostas de triagem allowlisted e constrói a projeção
  operacional no banco, impedindo JSON arbitrário na superfície administrativa;
- conflito de payload retorna erro sanitizado, sem criar caso duplicado;
- estados alcançáveis: `draft`, `triage`, `awaiting_person`, `routed`,
  `stored_private`, `withdrawn`;
- estados de envio, protocolo oficial, resolução e publicação continuam futuros
  e inalcançáveis;
- retirada explícita, idempotente e registrada no histórico.

## API e interface local

- flags exigidas em conjunto: `COMUN_RELATA_PREVIEW=enabled` e
  `COMUN_RELATA_LOCAL_PERSISTENCE=enabled`;
- URL Supabase aceita somente `http` loopback com porta explícita;
- a chave service role local permanece exclusivamente no runtime Node;
- flags desligadas ou destino remoto retornam `404` antes de criar cliente;
- recibo em cookie HttpOnly, SameSite Strict e Secure em HTTPS;
- nenhum segredo em URL, Local Storage, Session Storage, analytics ou logs;
- confirmação única: “Guardar este relato no COMUN”;
- recibo durável, refresh, timeline e retirada disponíveis;
- aviso inequívoco: “Nenhum órgão público recebeu esta manifestação.”;
- sem conta, mapa, contato, localização exata, anexo ou request externo;
- rota com `noindex,nofollow` e sem link na navegação pública.

## Gates locais

- Vitest: 7 arquivos, 21 testes verdes;
- E2E: 15/15 em 320×568, 390×844, landscape 844×390, 768×1024 e
  PWA standalone 430×932;
- Axe: verde nos cinco projetos;
- DB rehearsal: `COMUN_RELATA_LOCAL_PERSISTENCE_GREEN`;
- papéis: `PUBLIC`, `anon`, `authenticated`, admin, não-admin e
  `service_role` exclusivamente server-side;
- idempotência: sequencial, concorrente e conflito de payload verdes;
- isolamento: ausência/segredo errado indistinguíveis e duas pessoas isoladas;
- retention dry-run: zero delete, zero dado pessoal emitido, remoto não contatado;
- contrato de release/checksum: verde;
- typecheck: verde;
- lint e build: verdes; build local com flags desligadas confirmou
  `/comun/relata=404` e `/comun=200`;
- regressão unitária integral: 88 arquivos, 444 testes verdes;
- App Shell V2: 35/35; PWA: 30/30; performance: 9/9;
- rede focal Chromium: 2/2, `exit code=0`, `signal=null`, classificação
  `green`;
- segurança: 6/6; auditoria RLS integral:
  `COMUN_RLS_COMPLETE_GREEN`, 190 tabelas, 2.280 linhas de matriz, zero
  finding, zero `security definer` inseguro e zero `security definer` exposto;
- grants das três RPCs Relata: `anon=0`, `authenticated=0`,
  `service_role=3`; surfaces: 4 testes de auditor + 26 Vitest verdes;
- no-leak HTTP e UI pública em Production: verdes; smoke de rotas públicas
  locais: verde;
- DB lint: nenhum finding Relata; permanece o finding preexistente de
  `comun_sync_public_search_projection` pela ausência de
  `comun_search_candidates`, pertencente ao blocker 47.9B/provider.

## Limites e próximos gates

- política definitiva de retenção: decisão pendente de produto/privacidade;
- catálogo é `source_verified`, não `operationally_checked`;
- divergências oficiais de CAU/WhatsApp e Light/call center permanecem abertas;
- nenhuma integração automática pode usar o catálogo;
- checks da PR, Preview, merge e smoke Production pós-merge ainda pendentes;
- próximo tijolo: `48.0C — localização privada, anexos protegidos e formação de casos`.
