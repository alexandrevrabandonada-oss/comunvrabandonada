# COMUN 48.1B-P2 — diagnóstico

Data: 2026-08-07

## Baseline e escopo

- `origin/main`: `76687bf06491b82b7062d99c2d6ba26b8c10574a`.
- Branch: `codex/48-1b-p2-relata-text-domain`.
- Conta e Carteira permanecem ativas; território, Google, evidências, Ônibus,
  forwarding, coletivos e publicação permanecem desligados.
- Nenhuma migration foi criada ou alterada neste tijolo.

## Preflight remoto

- `supabase migration list --linked`: cadeia conhecida alinhada; a release
  excepcional de Calçadas `20260724233256` permanece fora do ledger do CLI por
  autoridade externa já documentada.
- A quarentena read-only dessa migration produziu plano vazio (`upToDate=true`)
  e restaurou o arquivo com SHA íntegro.
- Nenhuma escrita, reset, repair, seed ou alteração remota foi executada.

## Decisões

- `COMUN_RELATA_PERSISTENCE_ENABLED` é a flag canônica de Production.
- `COMUN_RELATA_LOCAL_PERSISTENCE` continua apenas como alias local com
  `ALLOW_LOCAL_TESTS=true` e Supabase loopback.
- Quick Capture depende da persistência válida, não de chaves ou evidências.
- A página resolve `quickCaptureEnabled` e `evidenceEnabled` separadamente.
- P2 renderiza texto apenas; foto, localização, mapa e APIs de evidência ficam
  dormentes.

## Limitação de laboratório

O daemon Docker/Supabase do host Windows não respondeu dentro do timeout focal.
Por isso o rehearsal de banco fica delegado à lane CI descartável, que não recebe
credenciais remotas. Isso é limitação de infraestrutura local, não finding de
produto.
