# 48.5-A5-A2-R1 — Arte: schema Production e ativação da materialização privada

Data: 24/08/2026.

## Proveniência e rollout

- Parent funcional: `82f3e757cdec39c800ee1b10dc11cceb5a9c1ba7`; A5-A2 funcional: `67c41a40d929a2c688d5604fa2fc45560970a13e`.
- Migration: `20260824001340_comun_artwork_submission_private_materialization.sql`.
- SHA-256: `b9da07e8da93aa22d41119eb3a0f406176595bd4fbdf96bf1d75e16ddfd02354`.
- PR do runner: #374, merge `4d023525cfca5fd6ce44b395224d3272132fbdd0`.
- Correção fail-closed do parser stderr: PR #375, merge `5296b4103a42340aad757d4938c88a9449672f62`.
- O run inicial `32686261099` parou antes de writes: o dry-run continha a migration exata, mas o CLI havia emitido o plano em stderr. Artifact `9505758613`.
- Rollout canônico: run `32686486554`, no main exato `5296b4103a42340aad757d4938c88a9449672f62`.
- Planner antes: exatamente `20260824001340_comun_artwork_submission_private_materialization.sql`; planner depois: `[]`.
- Ledger de Arte: `0 → 1`; Sidewalk permaneceu `cliHistoryExpected=absent` e `remoteStateRequired=applied_exact_scoped`.

## Postflight Production

- Guard, trigger e os dois RPCs estão presentes; RPCs são security-invoker.
- `public`, `anon` e `authenticated` não executam os RPCs; `service_role` mantém execute.
- RLS da submissão de Arte permanece habilitada.
- Baselines de submissões, vínculos, roots territoriais, children, assets, Search, coleções, publicação e Storage permaneceram byte-equivalentes.
- `ArtworkSubmissionBackfill=0`; `ProductionSchemaWrites=1_migration_only`; `ProductionBusinessWrites=0`; `ProductionEnvWrites=0`.
- `territorialArtworkRootsCreated=0`; `artworkChildrenCreated=0`; `publications=0`; `SearchWrites=0`; `collectionWrites=0`; `publicAssetPromotions=0`.

## Runtime A5-A2-R1

- Obra nova elegível recebe a ação simples **Criar rascunho privado**. A action refaz autorização, refetch, slug/título e readiness no servidor e chama a primitive atômica.
- `existing_work_complement` e `credit_correction` nunca criam nova root. O editor escolhe explicitamente uma root `territorial_artwork`, `draft`, `private`, com child de Arte, e a action usa `comun_link_artwork_submission_private_root_v1`.
- Replay, double-click, concorrência, provenance imutável e retarget divergente continuam sob autoridade transacional do banco.
- A UI não mostra códigos internos e repete que rascunho privado não é publicação.
- Ações auditadas: `artwork_private_root_materialized` e `artwork_existing_root_linked`, com `readiness_contract=a5-a2-r1-v1` e `publication=not_authorized`.

## Invariantes

`A3=ON/preserved`; `A4=ON/preserved`; `A5A1=ACTIVE/preserved`; Oral e Rádio preservados; `publicationEligible=false`; `autoPublication=false`.

## Integração e Production

- Runtime checkpoint: `287199470dee8802b54b57e7675de34fb6013041`, mensagem `[comun-preview] feat(a5): activate artwork private materialization`.
- PR runtime: #376; merge/main final funcional: `1d6153591607ffa25de9590d1b54906ae45c3d18`.
- COST-02 no run `32686939964`: Preview do SHA exato, success, URL `*.vercel.app` e checkpoint fresh.
- Gates GREEN: COMUN CI `32686939964`; Cultural `32686940011`; Full Surface `32686940028`; Experience `32686940035`; Quality/Security `32686939967`; A5-A1 disposable `32686939996`; A5-A2 artwork disposable `32686939994`; demais deliverability/preflights aplicáveis verdes.
- GitHub Production deployment `6056378513`, environment URL `https://comunvrabandonada-bz6ie8apq-alexandrevrabandonada-oss-projects.vercel.app`, status success, SHA `1d6153591607ffa25de9590d1b54906ae45c3d18`.
- GET e HEAD em `/comun/acervo`, `/comun/acervo/contribuir`, `/comun/acervo/arte`, `/comun/acervo/arte/contribuir`, `/comun/acervo/historias-orais`, `/comun/acervo/historias-orais/contribuir`, `/comun/radio` e `/comun/radio/contribuir`: `200`; nenhum marcador privado/RPC interno no HTML.
- Smoke pós-merge foi exclusivamente read-only. Nenhuma contribuição, root, child, publicação, Search, asset ou coleção foi criada.

## Terminal

`COMUN_48_5_A5_A2_R1_ART_PRIVATE_MATERIALIZATION_GREEN_PRODUCTION_ACTIVE_NO_PUBLICATION`

`A3=ON/preserved`; `A4=ON/preserved`; `A5A1=ACTIVE/preserved`; `oralPrivateMaterialization=ACTIVE`; `radioPrivateMaterialization=ACTIVE`; `artPrivateMaterialization=ACTIVE`; `artExistingRootLink=ACTIVE`; `artSchemaRolloutRequired=false`; `autoPublication=false`; `publicationEligible=false`; `ProductionSchemaWrites=1_migration_only`; `ProductionBusinessWrites=0`; `ProductionEnvWrites=0`; `ProductionPrivateRootsCreated=0`; `ProductionArtworkChildrenCreated=0`; `publications=0`; `SearchWrites=0`; `publicAssetPromotions=0`; `collectionWrites=0`; `plannerAfter=[]`.
