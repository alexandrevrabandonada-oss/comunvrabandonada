# COMUN — Tijolo 48.0E — diagnóstico

Data: 2026-08-04
Branch: `codex/tijolo-48-0e-comun-bus-foundation`

## Baseline

- `origin/main`: `f8efa8e1eb8370613a35e605ddb8d346b90a4676`
- branch criada diretamente dessa base; histórico forward-only
- Production e Supabase remoto não foram consultados nem alterados
- Relata/mapa público permanecem dormentes (404)

## Diagnóstico

O transporte público já possuía uma rota observatória legada. O 48.0E adiciona uma superfície local separada em `/comun/onibus`, sem substituir o redirect existente de `/comun/transporte`. A cadeia de migrations 48.0B, 48.0C, 48.0D e 48.0E foi aplicada em banco Supabase descartável limpo.

O laboratório precisou usar portas locais `56431–56439`, pois a faixa `55431–55432` estava indisponível no host. Essa é uma condição do ambiente, não do produto; `supabase/config.toml` foi restaurado aos valores versionados antes do commit.

## Achados

- 20 tabelas privadas de ônibus com RLS habilitada e forçada;
- RPCs allowlisted somente para `service_role` server-side;
- fixture sintética `FIX-01`, sem dados reais;
- nenhum bucket público, mapa público, envio externo ou protocolo oficial;
- importação de horários versionada, com fonte, checksum e histórico;
- sessão de espera usa token opaco com hash e timestamps do servidor;
- candidato de canal STMU permanece não verificado, sem link ou envio.

## Decisão

Sem blocker de produto. A validação local é suficiente para abrir PR draft; a promoção continua proibida (`requiresPromotion=false`, `remotePromotionAllowed=false`).
