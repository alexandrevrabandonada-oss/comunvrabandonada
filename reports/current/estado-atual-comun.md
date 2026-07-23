# Estado atual do COMUN

## Hardening canônico da PR #30

Decisão atual: `NO_GO_SECURITY_HARDENING_PROMOTION`. A conexão remota canônica
usa `postgres`, mas não pode assumir `supabase_admin`; portanto não pode
revogar os default privileges pertencentes a esse role. A promoção falha antes
de qualquer escrita. A migration, o trigger preservado, a view com RLS e o
manifesto estão preparados, mas não devem ser promovidos até existir um
mecanismo autorizado para essa revogação.

Verificado em 23 de julho de 2026. `main` permanece em
`b2f6733dacd15ec21601ed6b6837b42213b87d70`; o Tijolo 41 está na PR #30,
branch `codex/tijolo-41-baseline-canonico`, HEAD
`cb1c2a5e0f84ffdc38eff721cd17f90eaeee98c7`.

## Decisão vigente

**SOLO_PRODUCTION_GREEN**

- fonte canônica: `main`;
- site: <https://comunsocial.online>;
- Vercel canônica: projeto `comunvrabandonada`;
- deployment observado: `dpl_FYTwUsW2Lg1ytaRw4sjK85463sfq`, `READY`;
- Supabase: schema reconciliado pelo pacote forward-only da PR #23;
- gate humano: 0/3;
- piloto público: fechado.

## Arquitetura operacional

O produto usa Next.js App Router na Vercel, Supabase para Postgres, Auth e
Storage, e PMTiles versionado para a base cartográfica de Volta Redonda.
`main` é a única base para novos tijolos.

Workflows ativos:

- `COMUN CI`: FAST em push/PR e FULL nos gates canônicos;
- `COMUN Promote`: promoção controlada, não usada neste tijolo;
- `COMUN Nightly`: regressão diária, scheduler do acervo e saúde de produção.

## Segurança vigente

- RLS continua obrigatória nas superfícies expostas;
- `service_role` permanece exclusivamente server-side;
- originais e uploads operacionais permanecem privados;
- nenhuma coordenada privada, object key ou credencial integra projeções
  públicas;
- mudanças de banco continuam exclusivamente forward-only;
- cleanup remoto das calçadas permanece em dry-run.
- o baseline v2 separa contrato do COMUN de internals gerenciados pelo
  Supabase;
- a auditoria fail-closed encontrou 12 riscos de privilégios, defaults, view e
  funções; nenhuma correção remota foi executada.

## Pendências reais

1. executar o gate humano com três pessoas reais;
2. manter o piloto público fechado até decisão humana e operacional;
3. alinhar formalmente o histórico de migrations sem `migration repair`
   automático;
4. executar a rotação controlada das credenciais administrativas;
5. acompanhar diariamente o fingerprint remoto e a saúde pública.
6. tratar os achados do baseline em migration forward-only separada antes de
   declarar o baseline seguro.

## Fechamento do Tijolo 41

- captura Nightly: `30043886656`;
- Nightly normal: `30044370056`, tentativa 2, aprovado;
- FAST e FULL CI: aprovados;
- cleanup remoto dry-run: 0 removidos;
- decisão: `COMUN_CANONICAL_BASELINE_SECURITY_REVIEW_REQUIRED`;
- PR #30 permanece aberta para revisão.

## Evidências

- [Baseline de produção](comun-production-baseline.md)
- [Baseline remoto do schema](comun-remote-schema-baseline.md)
- [Auditoria do histórico de migrations](comun-migration-history-audit.md)
- [Inventário de branches](comun-branch-inventory.md)
- [PMTiles em produção](comun-pmtiles-production.md)
- [Achados do baseline de segurança](comun-security-baseline-findings.md)
- [Fechamento consolidado do Tijolo 41](../comun-fechamento-tijolo-41.md)
- [Operação solo](../../docs/COMUN_SOLO_OPERATIONS.md)

Documentos anteriores à promoção da PR #23 são históricos e estão indexados em
`../archive/`.
