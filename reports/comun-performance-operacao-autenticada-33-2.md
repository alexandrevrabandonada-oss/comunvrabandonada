# Performance autenticada — Sprint 33.2

Medição local observacional, incluindo login Auth e renderização: as ações E2E por persona ficaram entre 0,8 s e 4,0 s; a matriz completa de 15 casos levou 47,6 s na segunda rodada. Central/detalhe com Axe ficaram entre 3,7 s e 6,1 s por viewport; captura visual entre 2,0 s e 3,3 s.

A central limita a consulta a 100 itens e o detalhe busca item, eventos e atribuições em `Promise.all`; não há consulta por card nem carregamento de original. O teste de capacidade anterior mediu 25/50/100 itens. Payload HTTP, RSS e contagem SQL por rota não foram instrumentados neste sprint; ficam como lacuna de performance antes de qualquer GO técnico integral.
