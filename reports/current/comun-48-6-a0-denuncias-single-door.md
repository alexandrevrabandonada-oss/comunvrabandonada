# 48.6-A0-R1 — Denúncias: porta única e checkpoint exato

Estado terminal: `COMUN_48_6_A0_DENUNCIAS_SINGLE_DOOR_ROUTING_FOUNDATION_GREEN_NO_AUTO_SEND`.

- PR existente: #392; checkpoint funcional final: `f4432c07c22c0b5a3fc294af0382e0eceda3e7a5` (`[comun-preview]`);
- merge SHA: `9b74252a4f8f70de9744ace4a6753f5cee2391b8`; `origin/main` confirmado nesse SHA;
- o contrato corrente foi reconciliado para `routeInventoryTotalPages=227`, com `/comun/denuncias` em `requiredRoutes` e na matriz de experiência, preservando `/comun/relatar` como engine de captura;
- COST-02, Experience Coherence, Core Journeys, Quality, Civic Graph, Civic Intelligence, Full Surface, P6 aplicáveis e COMUN CI fecharam verdes no checkpoint;
- Preview exato: Vercel pronto; deployment Production do merge: `6091466154`, status SUCCESS/READY;
- smoke read-only pós-deploy: `/comun/denuncias` HTTP 200 e `/comun/relatar` HTTP 200 em `https://comunsocial.online`;
- `denunciasEntry=ACTIVE`, `denunciasRequiredRoute=TRUE`, `singleRelataEngine=PRESERVED`, `unifiedRoutingGuide=ACTIVE`;
- `channelSourceTruth=ENFORCED`, `escalationChains=ACTIVE`, `preparedIsNotSent=true`, `comunProtocolIsNotOfficialProtocol=true`, `automaticOfficialSend=false`;
- não houve migration, Supabase write, env write, envio externo, relato real, publicação, mapa geral ou agrupamento coletivo público;
- A3/A4 preservados como ON/Production-only; A5 preservado.

Aprendizado: ao adicionar uma superfície pública canônica, o contrato de experiência e `requiredRoutes` deve ser atualizado explicitamente; o inventário de páginas não é apenas um contador.

Próximo bloco permitido: `48.6-A1 — Encaminhamento assistido multidomínio`. Não iniciado neste closeout.
