# Experiência das filas operacionais

A central é uma lista finita, server-side e retomável. A URL descreve página, tamanho (20 por padrão; máximo 25), filtros e ordenação. Uma recarga, compartilhamento do endereço ou retorno do detalhe restaura o mesmo recorte.

Cada página responde o que requer atenção, motivo sanitizado, pessoa responsável, prazo indicativo, próxima ação e contexto permitido. Retiradas ficam prioritárias na ordenação padrão, seguidas de vencimentos, prioridade, prazo, criação e ID estável. As alternativas são prazo, mais antigo, mais recente, prioridade e próxima ação.

Os filtros de fila, status, prioridade, sem responsável, prazo, tipo e busca segura são aplicados na função SQL; a busca escapa curingas. Os campos de pauta, território e responsável fazem parte do contrato e são normalizados como UUIDs para integrações que os exponham. Chips tornam o recorte visível e removível; “Limpar filtros” retorna à central.

Uma RPC com privilégios apenas de `service_role` calcula página, total e contadores agregados por fila. Ela não executa uma consulta por card e entrega somente os campos sanitizados da lista; e-mail, IDs de autenticação, notas privadas, contatos, URLs, object keys e originais não fazem parte do retorno. Os contadores refletem o recorte ativo.

No desktop os filtros ficam expostos; no celular ficam em painel expansível, preservando chips e paginação alcançáveis. A lista usa cards, não tabela larga nem scroll infinito. Estados vazios explicam o próximo passo. Páginas inexistentes são normalizadas pela consulta para a última página existente.
