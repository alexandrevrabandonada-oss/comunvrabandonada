# Estado atual do COMUN

Verificado em 23 de julho de 2026, a partir de
`b2f6733dacd15ec21601ed6b6837b42213b87d70`.

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

## Pendências reais

1. executar o gate humano com três pessoas reais;
2. manter o piloto público fechado até decisão humana e operacional;
3. alinhar formalmente o histórico de migrations sem `migration repair`
   automático;
4. executar a rotação controlada das credenciais administrativas;
5. acompanhar diariamente o fingerprint remoto e a saúde pública.

## Evidências

- [Baseline de produção](comun-production-baseline.md)
- [Baseline remoto do schema](comun-remote-schema-baseline.md)
- [Auditoria do histórico de migrations](comun-migration-history-audit.md)
- [Inventário de branches](comun-branch-inventory.md)
- [PMTiles em produção](comun-pmtiles-production.md)
- [Operação solo](../../docs/COMUN_SOLO_OPERATIONS.md)

Documentos anteriores à promoção da PR #23 são históricos e estão indexados em
`../archive/`.
