# Tijolo 45.3E — contrato escopado seguro das Calçadas

## Estado

- Contrato: `sidewalk-operational-safer-pre-v1`
- Hash do contrato: `1ae7b7c8bc000acc5369276809f2f4d58ca919d925399d9750e840c9e3aecc74`
- Migration canônica: `supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql`
- SHA-256 da migration: `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`
- Manifesto canônico preservado: `supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json`
- SHA-256 do manifesto canônico: `ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335`
- Referência diagnóstica: run `30237943854`
- Risco de grants: `safer_than_pre`

## Contrato escopado

O PRE aceito é exato: `public.comun_admin_audit_log` não possui grants para
`anon` nem `authenticated`; `postgres` e `service_role` mantêm a matriz
esperada. Qualquer grant público, perda do CRUD de `service_role`, drift em
outro objeto escopado ou ledger incompatível é bloqueante.

| Evidência             | Fingerprint                                                        |
| --------------------- | ------------------------------------------------------------------ |
| Scoped PRE compatível | `441f96efad5bb7fa0d47a0ae59734c24eccddca62f5388a4d8cff9c6250ff41d` |
| Scoped POST esperado  | `4ed4d61242adc4035a6c8c94c8bb72e93b310e6fa22d56929c4e4431b75a8d9d` |
| PRE global canônico   | `a6599aa24658c4339c7518d484364699d07ca4fa9cb1db68bb6fed4c20b94a10` |
| POST global canônico  | `614908b735616fc64d4d36bc05e050ee53a0fb2b1f4e099febe1f327923350c4` |

## Separação de responsabilidades

1. `preflight`: somente leitura, exige o PRE escopado, ledger ausente e a
   contribuição pública pausada.
2. `migrate`: requer autorização exclusiva, aplica somente a migration,
   confirma POST e ledger e mantém a flag desligada.
3. `activate`: não executa migration; exige POST e ledger já válidos e uma
   autorização diferente antes de habilitar a flag e fazer smoke.

## Impacto e interrupção

A migration segue sendo transacional e não destrutiva pelo contrato. A janela
esperada é curta, limitada ao lock das alterações de tabela, índice e grants
da release. Se a aplicação falhar, a transação falha sem ativar a flag. Se o
estado ficar parcial, não se repete a migration: um novo diagnóstico
read-only e uma decisão humana são obrigatórios.

## Verificações futuras após migrate

- fingerprint scoped POST exato;
- ledger exato com PRE/POST escopados;
- zero findings bloqueantes;
- matriz de grants sem grants públicos;
- contribuição pública ainda pausada;
- ativação pública em checkpoint separado.

## Autorização futura — modelo, não autorização

`AUTORIZO_MIGRATION_CALCADAS_<PROJECT_REF>_<MAIN_SHA>_1ae7b7c8bc000acc5369276809f2f4d58ca919d925399d9750e840c9e3aecc74_MANTER_FLAG_DESABILITADA`

O `project ref` e o SHA de main serão preenchidos somente depois do
preflight read-only da main integrada. A presença deste texto não autoriza o
modo `migrate`.

Ativação pública continua sendo outro checkpoint e outra autorização:

`AUTORIZO_ATIVAR_CALCADAS_<PROJECT_REF>_<MAIN_SHA>_<LEDGER_HASH>`

Nenhuma escrita remota foi realizada para gerar este pacote.
