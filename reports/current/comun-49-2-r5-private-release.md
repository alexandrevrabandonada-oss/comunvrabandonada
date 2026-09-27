# COMUN 49.2 R5 — release imutável, schema ainda ausente em Production

Estado alvo: `COMUN_49_2_R5_RELEASE_READY_SCHEMA_STILL_ABSENT`.

O código funcional R5 já foi integrado em `main` no merge
`ef5048ffe270b8b76c8d13e305339b2cc693117d` e o deploy Git correspondente
ficou READY em Production. Isso não promoveu o schema R5.

A captura Production read-only da run `36288696034` confirmou PostgreSQL
17.6, fingerprints PRE runner `1a0f10d58073a0677c67bfdd82f58fadfd47be95b1efcc3d0dffd24457093e2c`
e canonical `9ed1bb21d0e26797b7b0021fd1e1efd11b313dffeae7cf1b39c0cd95cbc31706`,
zero findings, R1/R2/R3/R4 e seus ledgers aceitos, e R5 completamente ausente.

O laboratório Production-like da run `36289232456` reproduziu esse PRE
exatamente antes de aplicar a única migration R5. O POST derivado ficou em
runner `ccb89095e56cad37b6b0e8459eee4eee9c130abd709b78940a85578a302c317f`
e canonical `160face699d0b22b88b0434a6393cedf587ce0ccf1f8338dd8765ec56f6fab4a`.

A migration tem SHA-256
`4882f10a27a6a38263465498b2b15ce7d127c8c8bee58f2929dbe068834dc409`
e o conjunto imutável tem SHA-256
`b6805edd57d2fc8cdf2a84d63a035c80665403c2aa757952822710c3e2d590fe`.

O POST possui 3 bridges service-role-only, 6 helpers privados, 4 triggers,
RLS/FORCE RLS nas duas relações R5, zero grants diretos, zero decisões, zero
projeções e zero findings. Nenhuma autoridade de mapa é introduzida.

Este release exige promoção separada. Este PR não contém workflow de write em
Production e não autoriza a migration, o ledger ou qualquer linha de negócio.
