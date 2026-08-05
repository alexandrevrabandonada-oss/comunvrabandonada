# 48.1B-R2A — E2E privado de runtime

## Estado

`COMUN_48_1B_R2A_RUNTIME_E2E_PENDING_CI`

O head `26b9679a168827b0c20886068c949aed0e28a899` mantém a migration candidata
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

## Gate

A PR permanece draft até a lane CI e todas as demais verificações terminarem.
Não houve migration remota, flag pública, Google, allowlist, piloto ou
`launch_publicly`.
