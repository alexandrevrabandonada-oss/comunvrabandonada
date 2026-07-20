# História Oral no Acervo Vivo

História Oral usa `comun_archive_items` com `item_type=oral_history`. O fluxo é: original privado, consentimento, transcrição interna, revisão de risco, versão pública separada, aprovação e publicação seletiva.

O editor reúne participantes, consentimentos, arquivos, versões, segmentos sensíveis, embargo, retirada e histórico sanitizado. A rota pública nunca consulta campos privados diretamente e falha fechada quando consentimento, embargo ou workflow impedem exposição.

Sugestões públicas não aceitam áudio; passam por honeypot, desafio, limite diário, hash não reversível e moderação.
# Piloto editorial 24.1

O fluxo operacional, o gate humano e os limites do piloto estão em `historia-oral-fluxo-operacional.md` e `historia-oral-piloto.md`. Publicação agora depende também de consentimento final, aprovação do participante, dupla revisão, terceiros resolvidos e, quando houver original, checksum e backup.
