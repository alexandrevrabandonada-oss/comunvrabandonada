# Contribuicao comunitaria do Acervo

A rota `/comun/acervo/contribuir` recebe uma fotografia por contribuicao, sem exigir conta. O formulario registra contexto, procedencia, declaracao de direitos, credito e contato opcional.

Protecoes: honeypot, desafio leve, validacao no servidor, hash irreversivel, limite de 3 contribuicoes por hora e 10 por dia, ate 10 URLs de upload por hora, JPEG/PNG/WebP e limite de 20 MB.

O contato e privado. O protocolo confirma recebimento, nao publicacao. A fila administrativa fica em `/comun/admin/acervo/contribuicoes`.
