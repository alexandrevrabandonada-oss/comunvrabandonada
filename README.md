# COMUN VR Abandonada

O COMUN é uma plataforma comunitária de Volta Redonda para transformar relatos,
memórias e evidências em pautas, ação coletiva, acompanhamento, resultado e
memória pública.

**Relatar. Confirmar. Organizar. Transformar em ação.**

## Produção canônica

- site: <https://comunsocial.online>;
- código: branch `main`;
- Vercel: projeto `comunvrabandonada`;
- Supabase: Postgres, Auth e Storage;
- estado técnico: `SOLO_PRODUCTION_GREEN`;
- gate humano: 0/3;
- piloto público: fechado.

## Arquitetura

- Next.js App Router, React e TypeScript;
- Supabase com RLS e operações privilegiadas somente server-side;
- Vercel com deploy por integração GitHub;
- PMTiles versionado para a base cartográfica de Volta Redonda;
- originais privados e projeções públicas sanitizadas.

## Superfícies principais

- Hub: `/comun`;
- Explorar: `/comun/explorar`;
- Participar: `/comun/participar`;
- Comunidades: `/comun/comunidades`;
- Territórios: `/comun/territorios`;
- Pautas: `/comun/pautas`;
- Minha participação: `/comun/minha-participacao`;
- Caixa de entrada: `/comun/caixa-de-entrada`;
- Acervo: `/comun/acervo`;
- Arte dos Territórios: `/comun/acervo/arte`;
- Rádio: `/comun/radio`;
- Mapa das Calçadas: `/comun/calcadas`.

## Miniapps

Os miniapps compartilham o shell do COMUN e preservam contexto entre pauta,
território e participação. O Mapa das Calçadas reúne mapa real, captura rápida,
moderação, prioridades, mobilização, encaminhamento, resultado e memória.
Acervo, Arte, Rádio e História Oral usam a mesma fundação editorial, sem expor
originais ou dados privados.

## Desenvolvimento local

Requisitos: Node compatível com `package.json`, Docker Desktop e Supabase CLI.

```bash
npm ci
cp .env.example .env.local
npx supabase start
npm run dev
```

Abra <http://localhost:3000/comun>.

Nunca commite `.env.local`, tokens, senha do banco, `service_role`, sessões,
storage states, dumps ou dados reais.

## Fluxo de um tijolo

```text
main
→ codex/tijolo-<numero>-<nome>
→ PR única
→ CI
→ merge
→ main
```

Não empilhe PRs estruturais. Cada mudança de schema futura recebe migration
nova com timestamp posterior à baseline canônica.

## CI e promoção

Há três workflows ativos:

- `COMUN CI`: FAST e FULL;
- `COMUN Promote`: promoção remota controlada;
- `COMUN Nightly`: regressão, scheduler do acervo e saúde de produção.

Checks locais usuais:

```bash
npm run solo:test
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:fixtures:assert-clean
```

Mudança remota exige autorização explícita, SHA imutável, gates verdes,
checkpoint sanitizado e SQL forward-only. Um tijolo documental como o 41 não
usa a label `comun:promover`.

## Segurança

- `NEXT_PUBLIC_*` nunca recebe chave privilegiada;
- `service_role` é exclusivamente server-side;
- RLS é obrigatória em tabelas expostas;
- coordenadas precisas, object keys, contatos e originais permanecem privados;
- limpeza remota permanece dry-run até autorização própria;
- credenciais são rotacionadas pelo runbook, nunca registradas em relatórios.

## Documentos vigentes

- [Estado atual](reports/current/estado-atual-comun.md)
- [Baseline de produção](reports/current/comun-production-baseline.md)
- [Baseline remoto do schema](reports/current/comun-remote-schema-baseline.md)
- [Auditoria de migrations](reports/current/comun-migration-history-audit.md)
- [Operação solo](docs/COMUN_SOLO_OPERATIONS.md)
- [Gate humano](docs/gates/COMUN_HUMAN_GATE.md)
- [Rotação de credenciais](docs/security/COMUN_CREDENTIAL_ROTATION.md)

Relatórios anteriores à PR #23 são evidências históricas e estão indexados em
[`reports/archive/`](reports/archive/README.md).

## Estado do piloto

A infraestrutura está verde, mas isso não abre o piloto público. A abertura
depende de três testes humanos reais, ensaio operacional e decisão explícita.
