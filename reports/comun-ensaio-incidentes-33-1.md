# Ensaio de incidentes — Sprint 33.1

Doze incidentes sintéticos foram induzidos: Storage indisponível, imagem e áudio corrompidos, duplicidade, publicação sem direitos, sessão expirada, responsável suspenso, retirada urgente, resposta contestada, alerta preso, falha de exportação e falha de restore.

Em todos, o contrato exigiu detecção, estado `publication_blocked`, alerta, auditoria sanitizada, mensagem interna, recuperação, resolução e cleanup. Resultado: `COMUN_EDITORIAL_INCIDENTS_LOCAL_OK`; nenhuma publicação indevida e nenhum dado privado no evento.
