# COMUN 48.6-A1 — Encaminhamento assistido multidomínio

## Closeout Production

- PR funcional: [#394](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/394), head validado `40d162ffdd82f6e987db44bb2329edf542997593`, merge `5643e788016fad902802e34b103d363f3a20542`.
- Correção operacional do runner: [#395](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/395), merge `22101e35941b7944da328f181e3c3f582f6a5e03`.
- `origin/main` final: `22101e35941b7944da328f181e3c3f582f6a5e03`.
- A promoção inicial `32904955708` parou no checkout, antes de qualquer conexão ao banco; não houve write. O runner foi corrigido para checkout de `main` e asserção fail-closed do SHA.
- Rollout GREEN: [run 32905325898](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32905325898), executado no SHA exato de `main`.
- Plano remoto: exatamente `20260825090000_comun_multidomain_assisted_forwarding.sql`; exceção externa de Calçadas restaurada com checksum; nenhum `include-all`, repair, reset ou seed.
- Postflight remoto: migration presente; checks de source/reference, funções e grants verdes; cliente sem EXECUTE; `transactionReadOnly=true`; `businessWrites=0`; `envWrites=0`; `publicProjection=false`; `externalOfficialSends=0`.
- Smokes read-only Production: `/comun/denuncias`, `/comun/relatar` e `/comun/minha-participacao` retornaram HTTP 200.
- Estado terminal: `COMUN_48_6_A1_MULTIDOMAIN_ASSISTED_FORWARDING_GREEN_NO_AUTO_SEND_SCHEMA_ACTIVE`.
- `ProductionSchemaWrites=1_migration_only`, `ProductionBusinessWrites=0`, `ProductionEnvWrites=0`, `externalOfficialSends=0`; A3/A4/A5 preservados; A2 não iniciado.

## Estado desta execução

- Parent/main auditado: `fbaecb4d65dbc28c938bbde2bea3213c3afb670f`.
- Branch: `codex/48-6-a1-multidomain-forwarding`.
- Implementação: projeção de experiência e adapter civic sobre o ledger de encaminhamento existente.
- Migration única: `20260825090000_comun_multidomain_assisted_forwarding.sql`.
- Migration SHA-256: `bef9f9d4bc38e07dcb16a07c6adff45f1bfb89f7ec4e3a0b46f7a1042f8c4bfd`.
- Production migration: aplicada uma única vez no run `32905325898`; nenhum write de negócio, env write ou envio oficial.

## Arquitetura reutilizada

O A1 preserva `comun_reports`/Relata, Carteira de Participação, os endpoints
de forwarding existentes, os packages/attempts privados, os catálogos
institucionais canônicos e os canais especializados de Saúde, Educação,
proteção infantil, Calçadas e ônibus. Não foi criada nova fila, wallet,
protocolo, case model ou forwarding engine.

O resolver em memória `lib/comun-forwarding-experience.ts` projeta a
experiência como `essential_assisted`, `sensitive_assisted`, `specialized`,
`emergency`, `civic_assisted` ou `human_review`. A classificação só muda a
experiência; não autoriza envio externo.

## Contrato de segurança

- `automationAllowed=false` em todos os caminhos.
- Preparar, abrir, copiar, ligar ou abrir portal não significa enviado.
- Somente a declaração contratual existente pode produzir `person_declared_sent`.
- Protocolo COMUN e protocolo oficial continuam explicitamente distintos.
- Saúde, Educação e proteção infantil não copiam conteúdo sensível; proteção
  infantil permanece channel-only.
- Risco imediato, incêndio ativo, fumaça ativa, alagamento perigoso e árvore
  caindo continuam em caminho emergencial/human review, fora do forwarding civic.
- Packages, attempts, respostas e dados institucionais permanecem privados;
  não há projeção para mapa, Search, pauta, coleção ou publicação.

## Escopo da migration

A migration apenas:

1. estende os checks existentes de `source_domain`/referência para
   `civic_service`, sem criar ledger novo;
2. cria duas funções privadas de contexto/preparo, com `security definer`,
   advisory lock por case, confirmação explícita do preview e grants somente
   para `service_role`;
3. estende o registro de resposta do ledger existente para `civic_service`.

Não há backfill, seed, fixture, upload, publicação, auto-send ou nova tabela
de forwarding. O workflow de produção quarentena somente a exceção externa
de Calçadas durante o dry-run e restaura o arquivo por trap/checksum.

## Verificações locais

- 223 arquivos de teste unitário, 1.262 testes: GREEN.
- `npm run typecheck`: GREEN.
- `npm run lint`: GREEN.
- `npm run build`: GREEN.
- `git diff --check`: GREEN.
- Experience coherence: GREEN.
- Core journeys: GREEN, 18 jornadas.
- Surfaces audit/test: GREEN, 227 superfícies, zero rotas desconhecidas.
- Civic Graph: GREEN.
- A1 focal: GREEN.

## Rollout controlado

Workflow: `.github/workflows/comun-48-6-a1-production.yml`.

Modos:

- `preflight`: transação read-only, checksum, exceção externa e plano exato;
- `promote`: preflight, única migration A1, postflight read-only;
- `postflight`: apenas verificação read-only do schema já promovido.

O workflow não usa `--include-all`, migration repair, reset, seed, credenciais
de service role no processo ou qualquer write de negócio. O terminal de
Production só pode ser declarado após o postflight remoto GREEN.

## Saneamento de lanes históricas

Os logs do primeiro head mostraram false positives em P6C-C e nos preflights
48.4-A2/A4/A5/A7: eles assumiam que qualquer migration nova pertencia à sua
lane, ou exigiam zero migrations desde um baseline histórico. A regra foi
corrigida com o manifesto explícito `scripts/ci/classify-migration-lane.mjs`:
`20260825090000_comun_multidomain_assisted_forwarding.sql` é `culture-a1` e
fica N/A para essas lanes. A2/A4/A5/A7 agora classificam a mudança antes de
validar o plano; P6C-C e A0 cultural reutilizam a mesma classificação.

O comportamento permanece fail-closed: ownership desconhecido ou mistura de
lanes bloqueia, e somente uma migration comprovadamente fora do domínio é
marcada N/A. Não houve relaxamento de check, remoção de required status ou
skip manual.

## Terminal esperado

`COMUN_48_6_A1_MULTIDOMAIN_ASSISTED_FORWARDING_GREEN_NO_AUTO_SEND_SCHEMA_ACTIVE`

Após o rollout controlado:

```text
singleDoor=ACTIVE
singleRelataEngine=PRESERVED
essentialForwarding=ACTIVE
sensitiveForwarding=ACTIVE
childProtectionChannelOnly=PRESERVED
civicAssistedForwarding=ACTIVE
preparedIsNotSent=true
openedIsNotSent=true
automaticOfficialSend=false
publicGeneralMap=false
publicCollectiveGrouping=false
ProductionSchemaWrites=1_migration_only
ProductionBusinessWrites=0
ProductionEnvWrites=0
externalOfficialSends=0
A3=ON/preserved
A4=ON/preserved
A5=preserved
```

A2 não é iniciado neste tijolo.
