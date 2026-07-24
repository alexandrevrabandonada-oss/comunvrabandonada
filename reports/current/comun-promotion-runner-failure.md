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

## Fechamento da correção

O primeiro preflight do patch, run `30061056715`, falhou sem escrita e revelou
um segundo defeito: a projeção compacta não inclui triggers de `auth`, enquanto
a validação procurava `on_auth_user_created` nela. A verificação foi movida
para uma consulta escalar read-only específica a `pg_catalog`.

No HEAD técnico `12fbb437324086f92d8beefc586d335b5652f8ed`, FAST e FULL
passaram no run `30061223511`, o Vercel Preview passou e o preflight remoto
read-only `30062302321` terminou com:

- fingerprint pré inalterado;
- 9 achados bloqueantes;
- 1 observação de plataforma;
- ledger ausente;
- `COMUN_CANONICAL_RELEASE_REMOTE_READY`.

Todos os jobs mutáveis ou não relacionados foram ignorados. A label continua
ausente e nenhuma migration remota foi executada.

## Segunda tentativa controlada

O run `30099519716`, no HEAD
`2956056a255d4e76eba4af86c1e33007a788c2d3`, criou o checkpoint sanitizado
`8599019682` e aplicou a transação forward-only. A etapa pós-transação falhou
com `SOLO_CANONICAL_POST_FINGERPRINT_MISMATCH`; portanto, preview pós-migration,
merge e deployment foram ignorados.

A captura read-only `30099668279` comprovou:

- fingerprint remoto:
  `a8dc235b2f0a1fa2554a7dd0db9c46372867fc21a5f610b47d008e1c15c46197`;
- zero achados bloqueantes;
- uma observação de plataforma;
- ledger presente;
- somente 2 grants de diferença em relação à projeção: `INSERT` e `DELETE`
  para `service_role`, ambos ausentes no remoto.

A causa é um erro do projetor, não uma deficiência do hardening: a migration
revoga o acesso público ao ledger e nunca concede esses dois privilégios. O
estado aplicado é intencionalmente mais restritivo. A correção local atualiza
o fingerprint canônico e aceita explicitamente a tupla histórica já gravada
no ledger, sem alterar a migration aplicada, conceder privilégios ou repetir
SQL remoto.

Decisão da tentativa: `SOLO_PROMOTION_FAILED`. A label foi removida, a PR
permanece aberta, a `main` não avançou e não houve deploy.
