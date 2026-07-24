# Inventário de branches do COMUN

Atualizado em 24 de julho de 2026.

| Branch | PR | Base | Estado |
|---|---:|---|---|
| `main` | — | — | produção canônica em `b2f6733d` |
| `codex/tijolo-41-baseline-canonico` | #30 | `main` | única linha ativa; correção do runner em validação |

Não foi criada branch ou PR adicional. A PR #30 continua aberta, não draft,
mesclável e sem merge. O HEAD inicial do lote de destravamento foi
`10ef55ef82d530954aade4dcffa68e2569ac6090`. O HEAD técnico aprovado por FAST,
FULL e Vercel é
`9ea9cc8b2cfaee6303fcd1ee8abe15e65c609107`.

A promoção `30057245879` falhou antes da migration; o remoto permaneceu no
fingerprint pré e sem ledger. O mesmo branch recebe agora a correção do
transporte `psql` e o preflight read-only. Não houve nova branch, nova PR,
merge, migration remota ou reaplicação da label.

O HEAD técnico corrigido
`12fbb437324086f92d8beefc586d335b5652f8ed` passou FAST e FULL no run
`30061223511`, Vercel Preview e preflight remoto read-only no run
`30062302321`. A branch permanece a única linha ativa.
