# COMUN 48.3-E2 — Pontes naturais de organização

Data: 14/08/2026

Baseline: `50613f49d76e8dd236cbb36db211c8a6cb24f48e`

Estado: green em Production, com merge exact-head e prova read-only concluídos.

## Decisão

E2 não cria destino, Pauta ou objeto social. A ponte parte exclusivamente das referências públicas versionadas que o Panorama já expõe e inverte, em leitura, a relação persistida em `comun_pauta_evidence_items.public_evidence_ref_id`.

Fluxo canônico:

`Panorama → PublicEvidenceReferenceV1 → PublicEvidenceCitationV1 → relação persistida exata → Pauta pública existente`.

Não há matching por título, resumo, categoria, território, busca, `ILIKE`, embedding, similaridade ou IA. `comun_search_documents` permanece fora da relação. Abrir Panorama, o recorte de Pautas ou uma Pauta não executa criação nem attach de evidência.

## Contrato público e consulta

- `PublicOrganizationBridgeV1` contém somente `evidenceRefId`, versão pública atual e Pautas allowlisted;
- cada Pauta projetada contém identidade pública, slug, título, resumo, estado público, próximo passo, versão ligada e `relationVersionState`;
- a projeção exige `source_type=public_evidence`, `status=approved`, `sensitivity=public_safe`, referência não nula, payload válido, Pauta pública e não arquivada;
- a consulta recebe todas as refs do Panorama e usa uma única leitura batched com `.in("public_evidence_ref_id", refs)`, sem N+1;
- a ordenação é determinística por atualização decrescente e slug, nunca por engajamento;
- versão persistida igual à versão resolvida é `current_version`; versão anterior válida é `historical_version` e permanece inalterada;
- erro de fonte falha fechado para lista vazia e registra somente diagnóstico sanitizado.

## Experiência

- uma relação leva diretamente a `/comun/pautas/[slug]` com “Ver pauta relacionada”;
- múltiplas relações levam à rota existente `/comun/pautas?evidencia=<refId>` com “Ver N pautas relacionadas”;
- zero relações não produz CTA morta nem associação falsa;
- o recorte resolve a ref no servidor e mostra somente Pautas exatamente ligadas;
- ref inválida falha fechada com “Esta referência pública não está disponível.”;
- ref válida sem relações explica “Ainda não há pauta pública ligada a esta evidência.”;
- o cabeçalho preserva título, período, proveniência e link “Ver fonte no COMUN”;
- a ponte é contextual e não se torna segunda ação primária do Panorama;
- a rota canônica da Pauta permanece compartilhável e sem query obrigatória.

## Segurança e limites

O DTO não serializa `original_text`, `report_id`, `receipt`, Wallet, identidade, email, CPF, anexos, localização privada, forwarding ou notas internas. A leitura é exclusivamente das duas estruturas públicas canônicas e respeita RLS. O write path especializado de A1 não foi alterado.

Débito preservado:

`COMUN_48_3_E2_RELATA_TO_PAUTA_DEFERRED_PRIVATE_BOUNDARY`

Uma futura ponte de Relata só poderá partir de projeção pública explicitamente sanitizada/revisada e gesto explícito. Nunca haverá relação direta entre relato privado e Pauta.

## Gates

- testes unitários cobrem versões atual/histórica, filtros fail-closed, deduplicação, payload allowlisted e links para zero/uma/múltiplas Pautas;
- teste de contrato proíbe fuzzy/search/IA/write/attach e exige consulta batched;
- workflow remoto audita somente metadata em transação read-only, RLS, policy, constraint, índice e grants;
- o remote plan deve registrar `migrationCount=0`, preservando a exceção external-ledger de Calçadas;
- workflow descartável prova relações current/historical, exclusão de Pauta privada/arquivada e evidência rejeitada/privada, não-match por mesmo título e rollback integral;
- a suíte de coerência percorre Panorama → ponte exata → Pauta → próximo passo em mobile e desktop quando existe relação; sem relação real, prova ausência de recomendação ou criação falsa.

## Mudanças estruturais deliberadamente ausentes

- migration: 0;
- API nova: 0;
- feature flag nova: 0;
- rota nova: 0;
- objeto social novo: 0;
- auto-create: 0;
- auto-attach: 0;
- fixture Production: 0;
- business write de rollout: 0.

## Promoção

Validação local pré-PR:

- baseline/ancestry: `origin/main=50613f49d76e8dd236cbb36db211c8a6cb24f48e`, ancestral direto do branch funcional;
- 186 arquivos e 951 testes unitários verdes;
- testes focais: 19 verdes, incluindo projeção, firewall, versões e contratos dos workflows;
- TypeScript, lint integral e build Next.js com 129 páginas verdes;
- auditoria E1: `publicDoorCount=4`, `contextLost=0`, `unexpectedTopLevelChoices=0`, `findings=[]`;
- jornada E2: 5/5 cenários Playwright verdes em `360×800`, `390×844`, `768×1024`, `1024×768` e `1366×768`;
- navegador real: Panorama e recorte filtrado sem overflow em mobile/desktop, uma ação primária no Panorama, ref inválida fail-closed e empty state válido sem associação falsa;
- migration diff vazio.

Promoção concluída:

- PR funcional `#322`, head exato `a21ddf2f1f42a27dd3887e1157a3dc06cdbf5356`;
- 139 checks de PR concluídos sem falha ou pendência e zero review thread bloqueante;
- preflight remoto `31833796298` verde, metadata-only em transação read-only, `businessContentRead=false` e `migrationCount=0`;
- descartável `31833796300` verde para versões atual/histórica, exclusões fail-closed, não-match textual e rollback integral;
- merge exact-head `ab4fe8e416e96a9c4b67822d86162baf7fcc2695`, confirmado como `origin/main` imediatamente após a integração;
- deploy Vercel `GTB5XNXFqEsm69mcJQYzn8g1j2rn` concluído no mesmo SHA;
- CI pós-merge `31834740686`, Core Journeys `31834740690`, Quality Performance `31834740622`, Experience Coherence `31834740647` e Civic Graph `31834740646` verdes;
- o único rerun foi do job Production do Civic Graph: o Chromium encerrou com `SIGSEGV` após 37/40 cenários, foi classificado como falha transitória de runner e passou integralmente no segundo attempt sem alteração de código;
- consulta do bridge permanece uma leitura batched por conjunto de refs (`bridgeQueryCount=1`), sem N+1, busca aproximada ou write;
- migration diff contra o baseline permaneceu vazio.

Smoke read-only em `https://comunsocial.online`:

- GET e HEAD `200` em `/comun`, `/comun/observatorios/panorama`, `/comun/pautas`, `/comun/pautas?evidencia=panorama%3Aterritory%3Acoverage` e `/comun/pautas/calcadas-em-circulacao`;
- a referência pública válida sem ligação real mostrou o empty state contratual, sem criar fixture ou associação falsa;
- referência inválida falhou fechada e ofereceu somente retorno a todas as Pautas;
- Panorama preservou uma única ação primária e não exibiu criação de Pauta;
- HTML/DTO não continham marcadores privados auditados;
- `businessWrites=0`, auto-create `0`, auto-attach `0` e fixtures Production `0`.

Estado terminal:

`COMUN_48_3_E2_NATURAL_ORGANIZATION_BRIDGES_GREEN_PUBLIC_EVIDENCE_TO_PAUTA_NO_AUTO_CREATE`

## Próximo tijolo

48.3-E3 — Criação de Pauta com baixíssima fricção. E3 não faz parte desta mudança.
