# Auditoria de dependências — PR #30

Em 23 de julho de 2026, `npm audit --json` encontrou quatro high e
`npm audit --omit=dev --json` encontrou três high.

| Pacote | Origem | Ambiente | Situação |
|---|---|---|---|
| `brace-expansion <1.1.16` | transitiva | desenvolvimento | override compatível para `1.1.16` |
| `postcss <=8.5.11` | direta e transitiva via Next | produção/build | atualizado/override para `8.5.12` |
| `sharp <0.35.0` | transitiva via Next | produção | override para a versão direta já usada, `0.35.3` |
| `next` | direta | produção | atualizado de `16.2.10` para `16.2.11`; o alerta era composto pelas transitivas acima |

Não foi usado `npm audit fix --force`, downgrade ou atualização major.
Após regenerar o lockfile, os dois comandos reportaram zero vulnerabilidades.

