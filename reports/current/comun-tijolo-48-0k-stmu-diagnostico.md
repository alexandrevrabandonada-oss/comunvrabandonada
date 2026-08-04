# Tijolo 48.0K — diagnóstico STMU WhatsApp

Data: 2026-08-04. Branch: `codex/tijolo-48-0k-stmu-whatsapp-assisted`.

Baseline novo após a integração do 48.0J: `e7ef45aadd92e757da2fc2ca6c01dd240ac24708` (PR #164). O smoke pós-merge confirmou `/comun`, `/comun/relatar` e Calçadas `200`; Relata, Ônibus e forwarding permaneceram `404`.

O canal `vr-stmu-whatsapp` foi modelado como infraestrutura local-only. A observação humana sanitizada de 04/08/2026 confirma identidade do WhatsApp STMU/STPP Volta Redonda, menu 1 horário, 2 elogio/sugestão, 3 reclamação e atendimento de segunda a sexta, 8h–17h. Perguntas da opção 3, anexos, protocolo e handoff não foram observados.

Fontes conflitantes permanecem separadas: fonte oficial histórica de 2022 (expectativa de 72h), página oficial atual sem WhatsApp e Carta de Serviços 211. Nenhum prazo foi promovido a garantia operacional.

Migration nova e forward-only: `20260804204544_comun_stmu_whatsapp_assisted_local.sql`, SHA-256 `5ed6358e97650c20fb0bb881c6d804a6f79d6ea5455fb81079f506861e7c112a`; manifesto `requiresPromotion=false`, `remotePromotionAllowed=false`.

O reset completo da cadeia em Supabase descartável foi executado. Houve retries de infraestrutura (gateway Storage/vector e portas locais), sem alteração remota e sem finding de produto. O rehearsal DB, RLS e grants passaram; não houve acesso ao WhatsApp nem envio.

Estado máximo: `menu_operational_complaint_flow_pending`. O micro-gate humano da opção 3 continua separado e pendente.
