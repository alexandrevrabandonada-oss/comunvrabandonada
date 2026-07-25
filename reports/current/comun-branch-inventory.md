# Inventário de branches do COMUN

Atualizado em 25 de julho de 2026.

| Branch | PR | Base | Estado |
|---|---:|---|---|
| `main` | — | — | produção canônica em `4a9e2d4f` |
| `codex/tijolo-42-1-pauta-canonica` | #32 | `41d218fa` | mesclada por merge commit |
| `codex/tijolo-42-1-relatorios` | #33 | `a989d517` | mesclada por merge commit |
| `codex/tijolo-42-1-public-id` | #34 | `9b067d83` | mesclada por merge commit |
| `codex/tijolo-43-calcadas-ciclo-operacional` | #35 | `4a9e2d4f` | draft; patch T43.1 de rede Docker local validado 18/18 duas vezes, aguardando FAST/rehearsal Ubuntu |

## Estado vigente

- PR #31: mesclada no SHA `41d218fa670a24eef8d2a1ce3e3a35a9c5172a47`;
- PR #32: mesclada no SHA `a989d517cd56d1051176eeb16675b019936e3244`;
- PR #33: mesclada no SHA `9b067d8302eb42e443afb6580b347d8a2cc941ec`;
- PR #34: mesclada no SHA `4a9e2d4f341e755b3a1aa969c26344f4f4334bae`;
- CI e deployment Vercel da `main`: aprovados;
- produção: `COMUN_NUCLEO_VIVO_PRODUCTION_GREEN`;
- Tijolo 43: `COMUN_CALCADAS_FAST_PATCH_REQUIRED`;
- gate humano: 0/3;
- piloto público: fechado.

A branch do Tijolo 43 foi criada somente após o smoke pós-merge verde. A PR
#35 permanece draft e única linha ativa. Há migration local pendente de
promoção; o PRE do rehearsal CI foi confirmado, mas o runner falhou no
transporte Docker do Ubuntu antes do POST. O patch T43.1 troca loopback entre
containers por rede interna/alias e ainda aguarda FAST e rehearsal remotos.
Não houve escrita remota.
