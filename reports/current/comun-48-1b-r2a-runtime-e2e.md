# 48.1B-R2A — E2E privado de runtime

## Estado

`COMUN_48_1B_R2A_BLOCKED_RUNTIME_E2E_FUNCTIONAL_FAILURE`

O head `f303fb44a08d3dc0300fc970be1231579e053499` mantém a migration candidata
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

## Finding funcional

A lane confirmou que o runtime sobe e que a localização privada funciona, mas o
início de fotografia retorna `404 {"code":"attachments_unavailable"}`. A
chamada read-only local, dentro de transação revertida, reproduziu SQLSTATE
`42702` (`ambiguous_column`) na RPC
`public.comun_relata_begin_attachment`. Isso é uma falha funcional do SQL
canônico da migration candidata, não uma falha de Docker/CI. Como o contrato
exige a migration candidata byte a byte imutável, não foi aplicada correção
silenciosa nem criada migration remota.

## Gate

A PR permanece draft e não pode ser marcada pronta ou mesclada enquanto o
SQLSTATE `42702` não tiver uma correção forward-only compatível com a
imutabilidade da candidata.
Não houve migration remota, flag pública, Google, allowlist, piloto ou
`launch_publicly`.
