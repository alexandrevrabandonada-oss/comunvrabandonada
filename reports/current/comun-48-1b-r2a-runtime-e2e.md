# 48.1B-R2A — E2E privado de runtime

## Retomada F1 (2026-08-05)

O SQLSTATE `42702` foi corrigido por migration posterior e monotônica, sem
alterar a candidata congelada. A nova cadeia é exatamente:

1. `20260805130000_comun_production_pilot_core_bundle.sql`;
2. `20260805201000_comun_production_pilot_attachment_rpc_fix.sql`.

O teste focal de banco e o E2E completo foram executados na lane CI descartável
`31047472852` sobre o head `97b6ea496ccd9838778557aba79b038b6a907fe0`.
As migrations da cadeia foram aplicadas no banco descartável, mas a jornada
falhou depois dos anexos no vínculo explícito Carteira–conta.

## Estado

`COMUN_48_1B_R2A_BLOCKED_RUNTIME_E2E_FUNCTIONAL_FAILURE`

O head `97b6ea496ccd9838778557aba79b038b6a907fe0` mantém a migration candidata
imutável (`0648404b49be00b2d46dc5431c1bde4cb0072bf0f27a1c8f42075bb522cdd4f9`).

## Tentativa local limitada

O contexto Docker `desktop-linux` respondeu apenas no cliente; o daemon retornou
`Docker Desktop is unable to start`. Nenhuma reinicialização ampla, prune ou
limpeza de outros projetos foi executada.

## Lane reproduzível

Foi adicionada a lane independente **COMUN R2A / private runtime E2E** ao workflow
da PR #174. Ela usa Ubuntu efêmero, Node 22.18.0, Supabase local, credenciais
geradas pela própria stack e nenhum segredo remoto. O harness testa relato,
idempotência, recibo incorreto, localização criptografada, tipos/tamanho de foto,
bucket privado, isolamento entre carteiras, recuperação, vínculo explícito de
conta e coletivos desabilitados. O artifact é sanitizado e a stack é parada por
`trap`, com verificação de containers residuais.

## Findings funcionais

A primeira execução confirmou SQLSTATE `42702` (`ambiguous_column`) na RPC
`public.comun_relata_begin_attachment`; isso foi corrigido pelo hotfix
forward-only e a cadeia passou a aplicar no laboratório descartável.

Na execução seguinte, a jornada avançou até o vínculo de conta e encontrou uma
segunda falha funcional existente em
`public.comun_participation_wallet_link_account`: a cláusula
`ON CONFLICT(wallet_id,user_id)` é ambígua. A resposta foi reproduzida no banco
descartável, sem escrita remota. Não alteramos a migration candidata e não
expandimos o hotfix de anexos para esconder um defeito de outro domínio.

## Gate

A PR permanece draft e não pode ser marcada pronta ou mesclada enquanto o
E2E completo continuar bloqueado por essa falha funcional. O próximo patch
deverá ser tratado como hotfix forward-only separado, com escopo e cadeia
explicitamente revisados.
Não houve migration remota, flag pública, Google, allowlist, piloto ou
`launch_publicly`.

## 48.1B-R2A-F2 — correção Carteira–conta (2026-08-05)

- migration forward-only: `20260805212659_comun_production_pilot_wallet_account_rpc_fix.sql`;
- SHA: `0d4b9a271a169184d45020bdad3ef11c8e1a01bd6d256848787b98b5d04a3382`;
- candidata e hotfix de anexos permaneceram byte a byte imutáveis;
- commit da correção do teste: `9e51e5cb6d2bfa0c36a89a82102a0beb56e0e60f`;
- topology/release/privileges/typecheck/lint/build: verdes;
- execução anterior: cancelada enquanto iniciava, antes de qualquer resultado
  de health; Postgres e E2E não foram exercitados;
- classificação corrigida: `COMUN_48_1B_R2A_BLOCKED_CI_STARTUP_CANCELLED_BEFORE_HEALTH_RESULT`;
- patch CI1: artifacts pré-start, diagnóstico sanitizado, stack mínima,
  heartbeat de 20 segundos e limite real de 12 minutos;
- novo attempt neste SHA: pendente;
- PR #174 permanece draft; nenhuma migration remota, flag ou piloto foi ativado.
