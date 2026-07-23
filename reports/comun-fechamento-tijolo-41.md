# Fechamento do Tijolo 41 — baseline canônico confiável

## Hardening preparado

A PR #30 carrega a release `20260723220112-canonical-security-hardening`: 12
achados antes e zero esperados depois da promoção. O remoto continua no
fingerprint pré-migration `f8834c3a673d66cc35b71a25fa878cc123c8741281273ba7e75a03d051a79793`.

Atualizado em 23 de julho de 2026.

## Estado do trabalho

- repositório: `alexandrevrabandonada-oss/comunvrabandonada`;
- branch: `codex/tijolo-41-baseline-canonico`;
- HEAD: `cb1c2a5e0f84ffdc38eff721cd17f90eaeee98c7`;
- PR: [#30 — Tijolo 41](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/30);
- PR aberta, não draft e mesclável;
- base: `main`;
- produção pública: saudável;
- gate humano: 0/3;
- piloto público: fechado.

## Baseline remoto

O baseline foi dividido em dois escopos:

1. `APP_CANONICAL_SECURITY_BASELINE`: bloqueante, contém os contratos mantidos
   pelo COMUN.
2. `PLATFORM_INFORMATIONAL_SNAPSHOT`: informativo, contém apenas contagens
   agregadas de objetos internos gerenciados pelo Supabase.

- fingerprint anterior:
  `1616eca2d978e17fb18c4568f12e4c4e43ae05dbe3b1e097b1c9b9c89b296574`;
- fingerprint atual:
  `f8834c3a673d66cc35b71a25fa878cc123c8741281273ba7e75a03d051a79793`;
- tamanho anterior: 1.510.816 bytes;
- tamanho atual: 1.244.048 bytes;
- limite do arquivo versionado: 5 MiB;
- migrations remotas registradas: 41.

O fingerprint cobre RLS, force-RLS, owners, relações, views, funções, policies,
triggers, grants, default privileges, constraints, índices, buckets e
migrations. A captura não contém linhas de aplicação, dados pessoais,
filenames, object keys, coordenadas ou segredos.

## Auditoria de segurança

Resultado: `COMUN_BASELINE_SECURITY_FINDINGS`.

Foram encontrados 12 achados:

- quatro grants perigosos na view `public.comun_public_reports`;
- cinco riscos em default privileges;
- uma view pública sem `security_invoker=true`;
- duas funções `SECURITY DEFINER` com `search_path=public`.

Também foi confirmado:

- nenhuma tabela pública exposta com RLS desabilitada;
- nenhum `CREATE` no schema `public` para papéis públicos;
- nenhum bucket privado marcado como público;
- nenhuma exposição pública das duas funções privilegiadas;
- nenhuma policy de Storage expondo localizadores privados.

As correções exigem uma migration forward-only futura. Nenhuma migration ou
alteração remota foi executada neste fechamento.

## Nightly e operação

Captura:

- execução `30043886656`;
- Artifact sanitizado com retenção de sete dias;
- fingerprint calculado;
- nenhuma escrita no banco.

Modo normal:

- execução `30044370056`, tentativa final 2;
- `COMUN_PRODUCTION_HEALTHY`;
- `COMUN_REMOTE_SCHEMA_BASELINE_OK`;
- `COMUN_SIDEWALK_CLEANUP_REMOTE_DRY_RUN_OK`;
- cleanup: 0 examinados, 0 elegíveis e 0 removidos;
- archive worker não acionado;
- nenhuma issue de incidente aberta.

## Validação

- `npm ci`: concluído;
- `npm run solo:test`: 12/12;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado;
- `npm run test:unit`: 256/256;
- testes específicos do baseline: 8/8;
- `npm run build`: aprovado;
- fixtures: `COMUN_TEST_FIXTURES_CLEAN`;
- FAST CI: aprovado;
- FULL CI: aprovado na repetição;
- Vercel Preview: aprovado.

A primeira tentativa FULL encontrou HTTP 502 transitório durante o reinício do
Supabase local no runner. A repetição passou sem alteração de código.

O `npm ci` informou quatro vulnerabilidades high em dependências. Nenhuma
atualização automática foi aplicada fora do escopo.

## Documentos canônicos

- [Estado atual](current/estado-atual-comun.md)
- [Baseline remoto](current/comun-remote-schema-baseline.md)
- [Achados de segurança](current/comun-security-baseline-findings.md)
- [Baseline de produção](current/comun-production-baseline.md)
- [Auditoria das migrations](current/comun-migration-history-audit.md)
- [Inventário de branches](current/comun-branch-inventory.md)
- [Cleanup das calçadas](current/comun-sidewalk-cleanup.md)
- [PMTiles em produção](current/comun-pmtiles-production.md)

## Decisão

`COMUN_CANONICAL_BASELINE_SECURITY_REVIEW_REQUIRED`

A PR #30 deve permanecer aberta até decisão sobre a migration forward-only de
segurança. O produto continua operacional e a produção permanece saudável, mas
o baseline não deve ser declarado seguro enquanto os 12 achados persistirem.

Declarações:

- Supabase remoto: não alterado;
- Auth: não alterado;
- Storage: não alterado;
- domínio: não alterado;
- deploy manual: não executado;
- dados reais: não modificados;
- merge: não executado.
