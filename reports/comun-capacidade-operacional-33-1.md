# Capacidade operacional — Sprint 33.1

O ensaio sintético cobre 25 e 50 contribuições/dia e backlog de 100, acrescido conceitualmente de 10 imagens, 5 correções, 3 retiradas, 2 protocolos e 2 resultados. Listagem, atribuição, filtro e paginação de 20 itens são operações lineares em memória; a central limita consulta a 100 e detalhes/eventos são buscados em paralelo, sem N+1 por item.

Na máquina local, os três cenários ficaram abaixo de 5 ms para preparar, atribuir, filtrar e paginar os dados em memória. Essa medida não representa produtividade humana. O limite operacional recomendado para o piloto é 25 entradas/dia; acima disso, coordenação deve reduzir escopo ou pausar recebimento.
