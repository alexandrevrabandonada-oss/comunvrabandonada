# PR #437: Production-reconciled Security Hardening v2

The read-only COMUN Nightly capture at run `35855343049`, artifact `10746939016`,
was bound to head `5f1ec0d0f0d451d0315e823dc72e1de80ca0c82b`. Its sanitized
canonical fingerprint is `4c4774d28908433d3cf9622fbda1e434f841e45202aa29077bfa6c5bb1d2afd6`.
The independent PR read-only promotion-fingerprint run `35883758532` at head
`5d429af8b7d0b74cb520ed2cb120bc024c687d1b` measured the runner's
`sha256-postgres-public-catalog-v1` fingerprint as
`db609afb6c7e6627a25b016460a2e1b02e7fb9f052fa1e440adeaed662b72460`.
These are deliberately different algorithms; the release manifest uses the runner value.

The Production capture contains 74 blocking findings, all
`DEFINER_SEARCH_PATH`, and 108 migration versions. Seven public legacy relations
are preserved: `comments`, `communities`, `knowledge_pages`, `posts`, `profiles`,
`project_links`, and `reactions_as_actions`. The consent migration
`20260901000000` is absent and remains a separate pending release.

An isolated local database reconstructed the complete captured canonical document,
including owners, grants, the original constraint expression, and managed defaults.
The pre-migration canonical JSON matched the Production capture exactly. Applying
the unchanged migration with SHA-256
`59351a1736ca21683f6307e78b12fa9362697d8772c0a8c807ab7c387f1da279`
produced runner fingerprint
`a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98`
and canonical fingerprint
`cb3bea0cb9abc6534760533d9c52a6471981a3a9672db8780c1ae4294995b1ee`.
Findings fell from 74 to 0. The relation, migration, and preserved legacy sets
were unchanged; no application rows were used.

The new PR #437 promotion preflight recaptures both fingerprints in a read-only
transaction immediately before the write-capable promotion step. It compares the
runner hash to the release manifest, the canonical hash to the captured reference,
and the migration/relation/security/consent metadata to the sanitized reference.
Any mismatch stops promotion before the transactional package. The package runner
still performs its own state and security checks. The diagnostic artifact contains
only hashes, object identities, and counts.

No Production write, migration, merge, or deploy was performed during this work.
