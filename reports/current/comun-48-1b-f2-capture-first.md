# COMUN 48.1B-F2 — Capture First

Data: 2026-08-09

## Baseline

- `repository_main_sha`: `533a129e3cd979f7001a95b4881c4696d2a3c9ed`
- branch: `codex/48-1b-f2-capture-first`
- estado de partida: `COMUN_48_1B_F1_MOTOROLA_PASS_DOMAIN_GREEN`
- arquivos não rastreados preexistentes: preservados, sem alteração

## Diagnóstico do contrato foto-only

O contrato canônico atualmente promovido não representa ausência de texto.
Três barreiras independentes exigem conteúdo textual de 8 a 600 caracteres:

1. `private.comun_relata_reports.original_text` é `NOT NULL`;
2. a tabela possui `CHECK (char_length(original_text) between 8 and 600)`;
3. `public.comun_relata_create(...)` rejeita `p_original_text` fora da mesma
   faixa com `COMUN_RELATA_INVALID_PROOF`.

A rota server-side `/api/comun/relata` também rejeita texto menor que oito
caracteres e sempre passa esse texto à RPC. Não existe outra RPC ou entidade
canônica que crie primeiro um Relata baseado somente em anexo. O anexo P3 é
autorizado apenas depois que o Relata e seu protocolo já existem.

Portanto, permitir foto-only sem migration exigiria persistir uma frase
artificial como `original_text`. Isso faria uma fala gerada pelo sistema parecer
conteúdo informado pela pessoa e violaria expressamente o contrato F2.

## Classificação

`COMUN_F2_BLOCKED_EXISTING_SCHEMA_REQUIRES_FALSE_DATA`

Não foi criada migration automaticamente. Também não foram alterados runtime,
UI, classificação, Calçadas, Ônibus, Storage, flags ou Production.

## Plano remoto

O dry-run reconciliado e read-only retornou plano vazio:

- migrations planejadas: `[]`;
- `--include-all`: ausente;
- `migration repair`: ausente;
- migration externa de Calçadas restaurada com SHA-256
  `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`.

Resultado: `COMUN_F2_REMOTE_MIGRATION_PLAN_EMPTY`.

## Limite e próximo passo

Para retomar o F2 será necessário um contrato explícito, forward-only e
auditável para distinguir texto informado pela pessoa de ausência semântica.
Uma solução futura deverá preservar compatibilidade com relatos existentes,
idempotência, receipt, Carteira, RLS/grants e os fluxos P3/P4/P5, sem usar um
marcador técnico como resumo, classificação ou fala da pessoa.

O Share Target permanece adiado:
`COMUN_F2_SHARE_TARGET_DEFERRED_FILE_LIFECYCLE_REQUIRED`.

O terminal `COMUN_48_1B_F2_CAPTURE_FIRST_DOMAIN_GREEN` não foi emitido e o
48.1B-P6A não foi iniciado.
