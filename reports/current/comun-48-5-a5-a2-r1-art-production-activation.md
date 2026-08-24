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

Os dados finais de PR, checkpoint, CI, Preview, merge e deployment Production serão anexados no closeout documental após integração do runtime.
