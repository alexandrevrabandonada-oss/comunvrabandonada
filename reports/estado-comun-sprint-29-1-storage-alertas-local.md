# Estado do COMUN — Sprint 29.1

Data: 15/07/2026. Escopo exclusivamente local.

## Resultado

O Storage local real foi validado com dois buckets: original privado e derivadas públicas. O provider local implementa upload target, confirmação, leitura, HEAD, escrita de derivada, remoção, listagem de cleanup, URL pública e leitura privada temporária. Fixture e R2 permanecem no contrato comum, sem acionar infraestrutura externa.

Upload administrativo especializado valida JPEG/PNG/WebP server-side; limite de 30 MB e 80 MP, magic bytes e animação são verificados. Sharp gera três WebPs preservando proporção. A criação de derivadas exige `allow_comun_display`; o original continua privado.

Alertas possuem fingerprint, deduplicação, contagem e resolução automática. Auditoria remove recursivamente campos privados e registra apenas estado, tipos, contagens, dimensões e timestamps. Retry/dead-letter reutiliza a fila existente, com idempotency key e máximo de tentativas.

## Gates

- Supabase CLI 2.109.1; Storage 1.62.5; PostgreSQL 17.6.1; Docker 29.2.1.
- dois ciclos independentes de start/reset/readiness/smoke aprovados;
- smoke real: upload/download/privacidade/Sharp/URLs/alerta/auditoria/retirada lógica/cleanup aprovado duas vezes;
- 17 arquivos e 97 testes unitários aprovados;
- Playwright Storage: 4/4; axe: 16/16 em quatro viewports, zero serious/critical;
- lint, TypeScript, build production-like, db lint e `RLS_MATRIX_OK` aprovados;
- dry-run do prune: zero objetos; fixtures banco/Auth: zero;
- npm audit: zero high/critical e duas moderadas; `--force` não usado.

## Performance local observada

No fixture real de 1200×800, o smoke completo levou aproximadamente 7 segundos no primeiro ciclo e 13 segundos após readiness no segundo, incluindo banco, upload, três transformações, escrita, alertas e cleanup. O build levou 50 segundos. Não houve falha de memória.

## Ressalvas

O `db reset` da CLI pode reiniciar Storage com novo IP enquanto o Kong conserva o upstream anterior. O readiness detecta a falha; a recuperação comprovada é reiniciar somente o gateway desta instância. O `.env.local` aponta para Supabase remoto e continua intocado; gates locais precisam sobrescrever as variáveis. O Playwright cobre proteção da superfície administrativa e acessibilidade; a prova binária integral é feita pelo smoke real server-side.

## Declarações

## Commits locais

1. `fix: alinha supabase storage local`
2. `feat: adiciona upload real local de arte`
3. `feat: adiciona processamento e cleanup de derivadas`
4. `feat: conclui alertas da arte`
5. `feat: conclui auditoria sanitizada da arte`
6. `test: cobre storage local real`
7. `docs: documenta operacao de mídia local`

- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Smoke remoto: NÃO EXECUTADO
- Custo externo: R$ 0

Status: READY local, com procedimento operacional obrigatório de readiness/restart limitado do gateway; nenhuma promoção remota autorizada.
