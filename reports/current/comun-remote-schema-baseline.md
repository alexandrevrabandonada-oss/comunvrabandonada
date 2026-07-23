# Baseline canônico de segurança do schema remoto

> O JSON versionado representa o estado esperado após o hardening. Fingerprint
> pré: `f8834c3a673d66cc35b71a25fa878cc123c8741281273ba7e75a03d051a79793`.
> Pós esperado:
> `152641520c28ce61d0cd441ac03c16d97bad99f000f6067236d555731f1c4d58`.
> Nenhuma migration remota foi aplicada neste lote.

Captura read-only de 23 de julho de 2026.

## Escopo bloqueante

`APP_CANONICAL_SECURITY_BASELINE`

- fingerprint: `f8834c3a673d66cc35b71a25fa878cc123c8741281273ba7e75a03d051a79793`;
- algoritmo: `sha256-app-canonical-security-v2`;
- relações públicas: 176;
- colunas: 2.344;
- constraints: 1.006;
- índices: 428;
- policies de aplicação e Storage: 45;
- funções públicas: 9;
- triggers públicos e trigger de Auth relacionado ao COMUN: 47;
- grants de relações: 2.558; grants de rotinas: 22;
- default privileges: 6;
- buckets sanitizados: 4;
- migrations registradas: 41.

O fingerprint inclui owner, RLS, force-RLS, opções, persistência, replica
identity, definições normalizadas de views e funções, policies, grants,
constraints, índices, triggers, buckets e histórico de migrations.

## Snapshot informativo

`PLATFORM_INFORMATIONAL_SNAPSHOT`

- relações Auth: 23; funções Auth: 4;
- relações Storage: 8; funções Storage: 17;
- policies internas de Storage: 0;
- PostgreSQL: `170006`.

Essas contagens não entram no fingerprint. Atualizações internas gerenciadas
pelo Supabase não geram drift quando o contrato do COMUN permanece igual.

## Resultado de segurança

`COMUN_BASELINE_SECURITY_FINDINGS` — 12 achados. Consulte
[comun-security-baseline-findings.md](comun-security-baseline-findings.md).

O baseline é fail-closed: o verificador não declara segurança enquanto os
achados persistirem. Nenhuma correção remota foi executada.

## Artefatos

- JSON compacto versionado: 1.244.048 bytes, abaixo do limite de 5 MiB;
- captura detalhada sanitizada: Artifact `comun-remote-schema-baseline`,
  execução `30043886656`, retenção de sete dias.

Não há linhas de aplicação, e-mails, telefones, UUIDs de usuários, filenames,
object keys, coordenadas, tokens ou senhas. Identificadores estruturais de
colunas e policies permanecem apenas quando necessários à auditoria.
