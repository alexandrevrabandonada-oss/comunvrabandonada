# Tijolo 48.0J — conexão Calçadas ↔ Relata

Resultado local: `COMUN_SIDEWALK_48_0J_LOCAL_CONNECTION_GREEN_FISCALIZA_DEGRADED`.

## Ponte

A migration `20260804203000_comun_sidewalk_relata_connection_local.sql` cria um ledger privado append-only para relações `sidewalk_to_relata` e `relata_to_sidewalk`, com estado, jurisdição, consentimento e idempotência. Relata recebe `sidewalk_accessibility` sem alterar protocolos existentes; registros de Calçadas permanecem a fonte canônica do mapa.

O fluxo sintético validado foi: registro de calçada → protocolo COMUN imediato → item da Carteira → jurisdição pública explícita → pacote `package_ready_channel_degraded`. A mesma operação é idempotente e não expõe texto original, geometria privada, foto ou segredo.

## Responsabilidade e jurisdição

Condições estruturadas incluem superfície quebrada/irregular, passagem bloqueada/estreita, rampas, obstáculos, vegetação e drenagem. A pergunta adaptativa aceita espaço público, diante de imóvel particular ou não sei. Frente privada e jurisdição desconhecida ficam em revisão e não são roteadas automaticamente.

## Fiscaliza

O adaptador `vr-smi-public-sidewalk-maintenance-v1` registra Carta 165, Secretaria Municipal de Infraestrutura, inspeção estimada em 7 dias e execução estimada em 30 dias; são estimativas de serviço, não prazos legais. O canal atual continua degradado e sem abertura assistida.

## Segurança

 As três tabelas novas têm RLS habilitada e forçada, privilégios apenas para `service_role`, RPCs com `search_path=pg_catalog` e eventos append-only. Nenhuma migração ou escrita remota foi realizada.

O cloak local foi verificado com a flag cumulativa desligada: GET/POST/PUT/PATCH/DELETE em `/api/comun/sidewalk-relata/links/x` retornaram 404, sem 405; `/comun` e `/comun/relatar` retornaram 200. O smoke genérico `smoke:no-leak-http` ainda encontra o desvio pré-existente da fixture `/comun/pautas/fixture-s28-2-*` (404), que não pertence ao 48.0J. Smoke read-only em Production confirmou `/comun=200`, `/comun/relatar=200`, Relata/Ônibus/forwarding e a API 48.0J em 404.
