# COMUN 48.5-A2 — Contribuição Cultural Save-first

Status: `COMUN_48_5_A2_CULTURAL_CONTRIBUTION_SAVE_FIRST_GREEN_PRIVATE_INTAKE_SPECIALIZED_HANDOFF`

Baseline: `fcccf0de0bf82b105f520bbf14a6291b6f4cedae`.

## Contrato

Foi criada somente a raiz operacional privada
`private.comun_cultural_contribution_intakes`. Ela é um envelope anterior à
especialização, não um artefato cultural. O primeiro gesto aceita apenas texto
livre, gera um Protocolo COMUN e não cria `comun_archive_items`, assets,
coleções ou documentos de busca.

O RPC `comun_create_cultural_contribution_intake_v1` é service-role-only,
idempotente por `request_id`, limita tentativas por hash de retomada e deriva o
vínculo de conta server-side. O token de continuidade é opaco, armazenado em
cookie HttpOnly/Secure/SameSite e somente seu hash é persistido.

## Continuidade

Após salvar, a pessoa escolhe explicitamente foto/documento, arte, história
oral, Rádio ou “Ainda não sei”. A escolha só atualiza o envelope privado; não
publica e não cria um objeto especializado automaticamente. Os pipelines
existentes permanecem a autoridade para direitos, consentimento e segurança.
Música não recebeu upload genérico.

Com a flag `COMUN_CULTURAL_SAVE_FIRST_INTAKE_ENABLED` desligada, o formulário
fotográfico anterior permanece intacto. Nenhuma flag de segurança do Acervo é
alterada.

## Privacidade e escopo

Texto privado, token, identidade e destino interno não entram no Acervo,
Search ou HTML público. Não houve seed, upload, bucket change, API pública de
dados, auto-publicação, A2 cultural especializado ou business write de
Production.

Validações locais: typecheck e testes focais verdes. Migration prevista:
exatamente a migration A2; após promoção, o diff de migrations deve voltar a
vazio. Próximo slice: `48.5-A3`.
