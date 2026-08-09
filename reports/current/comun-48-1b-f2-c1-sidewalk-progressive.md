# COMUN 48.1B-F2-C1 — captura progressiva de Calçadas

Data: 2026-08-09

## Contrato entregue

- flag cumulativa `COMUN_SIDEWALK_PROGRESSIVE_CAPTURE_ENABLED`;
- primeira fase cria `Relata` com categoria `sidewalk_accessibility`,
  `original_text IS NULL`, privacidade `sensitive`, revisão e enriquecimento
  obrigatórios;
- a foto é selada pelo runtime P3 antes da etapa estruturada;
- nenhuma condição é pré-selecionada e nenhum texto/default é inventado;
- a segunda fase usa o receipt cookie do mesmo protocolo e chama somente o
  `public.comun_sidewalk_intake_create` existente com
  condition/problems/affected groups;
- localização privada e `comun_sidewalk_intake_finalize` conduzem a
  `pending_review`;
- zero publicação e forwarding automáticos;
- zero migration C1, zero adapter novo e zero segundo protocolo.

## Validação

- unitários: 121 arquivos e 546 testes, mais o teste focal do manifesto PWA;
- typecheck, lint e build Next.js `16.2.11` verdes;
- privilege lint: 22 migrations;
- security hardening, resilience e secrets boundary verdes;
- Supabase descartável: run `31300536511`, marcador
  `COMUN_48_1B_F2_C1_SIDEWALK_PROGRESSIVE_DISPOSABLE_GREEN`;
- QA renderizada em 1366×768 e 390×844: seleção de foto refletida na UI, uma
  única app bar mobile, zero erro de console/resposta e zero violação Axe
  séria/crítica. O Browser integrado falhou ao carregar os próprios assets; o
  fallback foi o Playwright já instalado no repositório.

## Merge e Production

- PR `#241`;
- head exato: `0577e144e0a9bb29d9162b3717b7e5f511803e79`;
- merge: `be08800ac7a13a7f9d29a481b5a3d85e6856733d`;
- deploy inicial OFF: run `31300837241`, deployment
  `dpl_HzemDXcHfdLus2ydibkaZSm9yF77`;
- ativação: run `31300951155`, deployment
  `dpl_3iZw5io4iNJBNFc6611KgZS7aMtQ`;
- seis rotas públicas 200;
- fixture Production: `original_text=null`, categoria
  `sidewalk_accessibility`, um protocolo, adapter existente, foto selada,
  localização privada, Carteira em revisão e `pending_review`;
- cleanup exato de banco e Storage confirmado; recovery/rollback não foram
  necessários.

Resultado C1:
`COMUN_48_1B_F2_C1_SIDEWALK_PROGRESSIVE_PRODUCTION_GREEN_CLEANUP`.

## PWA e terminal F2

- primeiro shortcut: `Vi um problema` → `/comun/relatar`;
- Share Target permanece adiado:
  `COMUN_F2_SHARE_TARGET_DEFERRED_FILE_LIFECYCLE_REQUIRED`;
- terminal:
  `COMUN_48_1B_F2_CAPTURE_FIRST_DOMAIN_GREEN`.

Próximo tijolo: `48.1B-P6A — ÁGUA + ENERGIA + ILUMINAÇÃO`.
