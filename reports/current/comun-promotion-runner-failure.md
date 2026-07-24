# Falha do runner de promoção da PR #30

Atualizado em 24 de julho de 2026.

## Execução

- run: `30057245879`;
- job: `89371478759`;
- step: `Apply transactional forward-only package`;
- HEAD: `9ea9cc8b2cfaee6303fcd1ee8abe15e65c609107`;
- código de saída: `1`;
- marcador publicado: `SOLO_FORWARD_ONLY_FAILED`.

## CONFIRMED_ROOT_CAUSE

O runner chamava `psql` sem `--tuples-only --no-align --quiet` para uma consulta
que retorna JSON e aplicava `JSON.parse(result.stdout.trim())` diretamente.

A reprodução com PostgreSQL 17 confirmou que o transporte antigo produz:

```text
 jsonb_build_object
--------------------
 {"ok": true}
(1 row)
```

Essa saída tabular não é um documento JSON. O mesmo comando com os flags
canônicos produz somente:

```text
{"ok": true}
```

Portanto, a captura catalogal falhava no parsing antes de iniciar a migration.
A captura read-only pós-falha `30057335078` confirmou fingerprint pré
inalterado, 9 bloqueantes e ledger ausente.

## CONTRIBUTING_DEFECT

O workflow capturava toda a saída do processo e publicava somente marcadores
que começassem por `SOLO_`. A exceção de parsing nativa não tinha marcador
canônico; por isso a causa inferior foi reduzida a `SOLO_FORWARD_ONLY_FAILED`.

O mesmo transporte tabular era usado nas consultas escalares do ledger e
aceitaria cabeçalhos, contador de linhas ou resultados duplicados sem um
contrato próprio.

## UNCONFIRMED_HYPOTHESIS

Não há evidência de falha de conexão, Docker, buffer, timeout, checksum,
fingerprint, SQL ou permissão. Esses caminhos passam a ter marcadores próprios,
mas não foram a causa observada no run `30057245879`.

## Trecho sanitizado do log

```text
Create sanitized pre-promotion checkpoint
SOLO_CHECKPOINT_VERCEL_METADATA_WARNING
COMUN_SANITIZED_CHECKPOINT_OK
Artifact ID 8583227864
Apply transactional forward-only package
output="$(node scripts/solo/apply-forward-only.mjs 2>&1)"
status=$?
marker="$(printf ... | grep ... || true)"
test -n "$marker" || marker=SOLO_FORWARD_ONLY_FAILED
Promoção solo interrompida na transação forward-only
SOLO_FORWARD_ONLY_FAILED
Process completed with exit code 1
COMUN_PREMERGE_FAILURE_NO_ROLLBACK
```

Nenhuma URL, usuário, senha, token, connection string ou conteúdo de secret foi
registrado.
