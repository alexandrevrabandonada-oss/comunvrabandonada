# COMUN 48.1B-P1 — smoke de Production

Estado antes do merge: Production preservada no núcleo público; superfícies de piloto continuam dormentes. A execução deste smoke depende do novo deployment após merge e das duas fases de flags descritas no relatório de ativação.

Critérios: `/comun=200`, `/comun/relatar=200`, `/comun/calcadas=200`; APIs de Relata novo, Ônibus, forwarding e Carteira retornam `404` enquanto desligadas; nenhum `405`; nenhuma migration ou escrita de piloto fora da ativação autorizada; `launch_publicly=false`.
