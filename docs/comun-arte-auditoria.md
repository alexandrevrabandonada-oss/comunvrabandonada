# Auditoria sanitizada da arte

Eventos administrativos usam `logComunAdminAction`. O sanitizador é recursivo, limita texto e remove e-mail, contato, notas privadas, termos, tokens, segredos, chaves de objeto e URLs assinadas.

Upload e processamento registram início, conclusão, status, MIME, tamanho, dimensões e contagens. O painel da obra mostra somente ação, horário e metadata sanitizada.
