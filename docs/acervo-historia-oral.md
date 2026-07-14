# História Oral no Acervo Vivo

História Oral usa `comun_archive_items` com `item_type=oral_history`. O fluxo é: original privado, consentimento, transcrição interna, revisão de risco, versão pública separada, aprovação e publicação seletiva.

O editor reúne participantes, consentimentos, arquivos, versões, segmentos sensíveis, embargo, retirada e histórico sanitizado. A rota pública nunca consulta campos privados diretamente e falha fechada quando consentimento, embargo ou workflow impedem exposição.

Sugestões públicas não aceitam áudio; passam por honeypot, desafio, limite diário, hash não reversível e moderação.
