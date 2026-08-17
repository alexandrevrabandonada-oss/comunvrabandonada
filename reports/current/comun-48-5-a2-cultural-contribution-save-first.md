# COMUN 48.5-A2 — Contribuição Cultural Save-first

Status: `COMUN_48_5_A2_R1_CULTURAL_SAVE_FIRST_OPERATIONAL_GREEN_PRIVATE_RESUME_ROUTE_SELECTION`

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

## A2-R1 — fechamento operacional

O A2 entregou `SAVE-FIRST_PRIVATE_INTAKE` + `EXPLICIT_ROUTE_SELECTION`. A
retomada privada agora usa o RPC service-role-only
`comun_get_cultural_contribution_intake_v1`; protocolo sozinho, token errado ou
outra conta retornam 404 e não revelam conteúdo. A autorização aceita o hash
do cookie HttpOnly ou a conta vinculada, sem expor hash, identidade ou IDs
internos no DTO.

Escolher `photo_or_document`, `art`, `oral_history` ou `radio` marca o envelope
como `routed`; `unknown` permanece `routing`. Neste estágio `routed` significa
somente destino escolhido: `target_kind` e `target_id` continuam nulos e
nenhum item, asset, submissão de arte, sugestão de história oral ou contribuição
de Rádio é criado.

Migration R1: `20260817170000_comun_cultural_contribution_intakes_r1.sql`.
O handoff especializado e a conclusão progressiva estão explicitamente
deferidos: `COMUN_48_5_A2_SPECIALIZED_TARGET_HANDOFF_DEFERRED_TO_A3`.

Rollout: preflight remoto metadata-only, Wave 0 com a flag desligada, aplicação
das migrations aprovadas, postflight sem migrations pendentes e Wave 1 com
`COMUN_CULTURAL_SAVE_FIRST_INTAKE_ENABLED=enabled`. Production foi validado
somente por GET/HEAD; não houve intake sintético nem business write. A copy da
rota usa `Guardar uma memória | Acervo Vivo` também no metadata.

## Privacidade e escopo

Texto privado, token, identidade e destino interno não entram no Acervo,
Search ou HTML público. Não houve seed, upload, bucket change, API pública de
dados, auto-publicação, A2 cultural especializado ou business write de
Production.

Validações locais: typecheck, testes focais, lint e build. O plano R1 contém
somente a migration nova acima sobre a migration A2 já aplicada. Próximo
slice: `48.5-A3`.
