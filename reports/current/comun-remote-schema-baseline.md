# Baseline canônico de segurança do schema remoto

Atualizado em 24 de julho de 2026. O JSON versionado representa o estado remoto
sanitizado capturado depois da aplicação transacional da release.

## Fingerprints bloqueantes

- pré-migration:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- pós-migration comprovado:
  `a8dc235b2f0a1fa2554a7dd0db9c46372867fc21a5f610b47d008e1c15c46197`;
- algoritmo: `sha256-app-canonical-security-v2`.

A captura read-only do run `30099668279` comprovou zero achados bloqueantes,
uma observação de plataforma, três defaults gerenciados e o ledger presente.
O fingerprint anteriormente projetado divergia porque o projetor acrescentava
`INSERT` e `DELETE` para `service_role`, embora a migration nunca concedesse
esses privilégios. O baseline agora preserva o estado mais restritivo realmente
aplicado.

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
A migration remota foi aplicada e confirmada por captura sanitizada. Este lote
de reconciliação não realizou nova escrita remota.
