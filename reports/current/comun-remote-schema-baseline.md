# Baseline canônico de segurança do schema remoto

Atualizado em 24 de julho de 2026. O JSON versionado representa o estado
esperado depois da release, sem afirmar que o remoto já foi alterado.

## Fingerprints bloqueantes

- pré-migration:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- pós-migration esperado:
  `82989755711d63a14d209cc2074fd3656288e74fb030331dac282acac7a8265b`;
- algoritmo: `sha256-app-canonical-security-v2`.

A captura read-only do run `30054188587` repetiu a projeção duas vezes e
produziu hashes idênticos. O pré continha 9 achados bloqueantes e 1 observação
de plataforma; o pós projetado contém zero bloqueantes e preserva a observação
dos 3 defaults gerenciados.

O fingerprint inclui somente contratos controláveis pelo COMUN: relações,
colunas, constraints, índices, RLS, policies, views, funções, triggers, grants,
defaults pertencentes a `postgres`, buckets sanitizados e ledger. Identidades
de funções são estáveis e não dependem de OIDs do ambiente restaurado.

## Snapshot informativo da plataforma

Defaults pertencentes a `supabase_admin` ficam em
`platformInformationalSnapshot.managedDefaultPrivileges`, com owner, schema,
tipo, grants, quantidade e hash. Eles não entram no fingerprint bloqueante,
mas seu hash precisa coincidir com o snapshot aprovado.

Estado esperado:

- `security.status = COMUN_APP_SECURITY_OK`;
- `security.blockingFindings = []`;
- `security.platformObservations` registra os defaults gerenciados;
- `COMUN_PLATFORM_DEFAULTS_OBSERVED`.

## Privacidade

O arquivo não contém linhas de aplicação, usuários, e-mails, telefones,
filenames, object keys, coordenadas, tokens, senhas ou connection strings.
Nenhuma migration remota foi aplicada neste lote.
