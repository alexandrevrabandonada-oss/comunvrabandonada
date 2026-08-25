# COMUN 48.6-A1 — Encaminhamento assistido multidomínio

## Estado desta execução

- Parent/main auditado: `fbaecb4d65dbc28c938bbde2bea3213c3afb670f`.
- Branch: `codex/48-6-a1-multidomain-forwarding`.
- Implementação: projeção de experiência e adapter civic sobre o ledger de encaminhamento existente.
- Migration única: `20260825090000_comun_multidomain_assisted_forwarding.sql`.
- Migration SHA-256: `bef9f9d4bc38e07dcb16a07c6adff45f1bfb89f7ec4e3a0b46f7a1042f8c4bfd`.
- Production migration: pendente de rollout controlado após merge; nenhum write Production nesta etapa.

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
