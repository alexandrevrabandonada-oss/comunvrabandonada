# COMUN 48.1B-F2-M1 — ausência semântica de texto

Data: 2026-08-09

## Checkpoint documental

- PR diagnóstica: `#237`;
- escopo confirmado: somente dois relatórios documentais;
- head protegido: `72dae1ef9de294d14aa4f5e0de989416684f7a97`;
- merge commit: `b7c8d5fa1f3c2e258c28ccc961179aaa4a51447e`;
- branch diagnóstica remota: removida;
- branch M1: `codex/48-1b-f2-m1-semantic-text-absence`, criada de
  `origin/main` após o merge.

## Preflight remoto read-only

O preflight consultou somente `pg_catalog` e `pg_policies`. Nenhum relato foi
lido.

- `private.comun_relata_reports.original_text`: `text NOT NULL`;
- constraint exata: `comun_relata_reports_original_text_check`;
- predicado: `char_length(original_text) >= 8 AND <= 600`;
- assinatura da RPC:
  `public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text)`;
- grants: `PUBLIC=false`, `anon=false`, `authenticated=false`,
  `service_role=true`;
- função: `SECURITY DEFINER`, com
  `search_path=pg_catalog, private, public`;
- RLS de `private.comun_relata_reports`: habilitado e forçado, sem policies;
- coluna equivalente a estado semântico: ausente.

Resultado: baseline remoto aderente; nenhum schema drift.

## Contrato M1

A única migration M1:

1. remove `NOT NULL` de `original_text`;
2. substitui somente a constraint confirmada por
   `comun_relata_reports_original_text_semantics_check`;
3. preserva a assinatura de `comun_relata_create`;
4. preserva byte a byte o algoritmo de hash para texto não nulo;
5. usa `COMUN_NO_SEMANTIC_TEXT_V1` somente dentro do hash do caminho sem
   texto;
6. grava `NULL` literalmente, sem placeholder, coalesce ou backfill;
7. aceita `NULL` somente com contrato photo-only explícito, categoria `other`,
   privacidade `sensitive|high_risk`, revisão humana e ausência de publicação ou
   forwarding automático;
8. reafirma `REVOKE ALL` para `PUBLIC`, `anon` e `authenticated`, concedendo
   `EXECUTE` somente a `service_role`.

A API e a UI permanecem textuais. A flag de runtime photo-only não pertence a
M1.

## Auditoria downstream de `original_text`

| Consumidor | Classe | Justificativa |
| --- | --- | --- |
| `/api/comun/relata`, Calçadas, Ônibus e adapters de criação | A | São escritores; continuam enviando texto canônico não nulo em M1. |
| classificador de privacidade | A | Passou a aceitar `RelataCaptureInput.text: string | null`; ausência com attachment é no mínimo `sensitive`. |
| roteador textual `routeRelata` | A | Mantém `RelataInput.text: string`; não foi enfraquecido. |
| fila administrativa de Calçadas | B | Só lê rows ligadas a intake de Calçadas, que ainda nasce com texto canônico; será adaptada em C1 antes de permitir intake progressivo nulo. |
| preparação STMU/Ônibus | B | Só alcança cases com intake `public_transport`, que continuam com texto canônico; photo-only genérico é `other` e não cria intake/forwarding. |
| scripts de ensaio que filtram por texto | A | `NULL` apenas não satisfaz o filtro; não há `.trim()`, regex ou conversão para string. |
| snapshot público, forwarding e coletivos | A | A RPC M1 não cria nenhum deles e a decisão server-side bloqueia automação. |

Nenhum consumidor classe C foi encontrado para o estado representável por M1.

## Verificação

- unitários direcionados: 11/11;
- unitários completos: 538/538;
- typecheck: verde;
- lint direcionado: verde;
- hardening: verde;
- privilege lint: verde;
- build: verde;
- dry-run remoto reconciliado: exatamente
  `20260809045302_comun_relata_semantic_text_absence.sql`, sem
  `--include-all`, repair, reset ou seed;
- vetor de hash textual legado:
  `5f62615dcc23595872bedba02133279a58eb6ed60a73ef0ef94dba2736c5cca7`.

O Docker local estava aberto, porém o daemon não respondia. Supabase Preview
Branching retornou `402 entitlement_required`. Por isso o ensaio SQL
descartável foi incorporado ao job dedicado
`COMUN F2 M1 / semantic text absence E2E`, sem credenciais remotas; o merge
fica bloqueado até esse job executar verde no PR.

Resultado do plano: `COMUN_F2_M1_REMOTE_PLAN_EXACT_ONE`.

## Estado

M1 em validação. Photo-only permanece desligado no runtime.
