# COMUN Ônibus — modelo e horários

O modelo separa fonte, versão, vigência e entrada de horário. A versão ativa da fixture é `fixture-v1`, fonte `fixture://comun-bus-48-0e`, linha `FIX-01`, ponto `FIX-STOP-01` e partida sintética às 10:00 em dia útil.

Importações validam tipo de dia, horário, offset de meia-noite, duplicidade e checksum SHA-256 normalizado. Uma nova versão substitui o estado operacional sem apagar versões anteriores. Nenhum horário é tratado como dado oficial de operação.

Regra de atraso: `scheduled_at` e `observed_at` ficam separados; classificação é determinística e versionada, sem LLM, embeddings ou consulta externa.
