# Laboratório SOC-D09

Dois domínios de prova; nenhum usa Production ou dados reais.

## Navegador: páginas reais, transporte controlado

```sh
npm ci --ignore-scripts
npx playwright install chromium
node tests/public-discovery/run-fixture.mjs build
npx playwright test -c playwright.public-discovery.config.ts
```

O processo serve somente `127.0.0.1:3150`, recusa credenciais externas e não
reutiliza servidor existente. Importa o Explorar, os detalhes e leitores reais.
Somente o transporte Supabase é substituído, no webpack da fixture, nunca no
config do produto. Cookies `discovery-lab` selecionam cenários sintéticos; não são
identidade nem autorização. O navegador bloqueia destinos externos e monitora
escritas. `ready`, `empty`, `archive-down` e `withdrawn` são modos locais.
Encerrar o servidor não modifica banco nem sessões reais. A fixture não é
publicada na aplicação. Resultados em `test-results/public-discovery` são sintéticos.

## Auth/Postgres reais: runner descartável próprio

Workflow `.github/workflows/comun-public-discovery.yml`, job `real-auth-postgres`.
Não executar contra estação compartilhada nem reutilizar stack previamente aberta.
O launcher exige GitHub-hosted Linux efêmero, Docker local sem containers e ausência
de credenciais externas. Usa Supabase CLI 2.117.0 e a cadeia canônica do checkout.
Antes de fixtures, confere API/DB loopback, portas do config e container Postgres
criado nessa execução. Nenhum reset remoto, secret ou ambiente Production.

```sh
COMUN_DISCOVERY_LAB=OWNED_EPHEMERAL_RUNNER node scripts/discovery/run-owned-lab.mjs
```

O comando é destinado ao job acima; recusa execução fora desse domínio.
Usuários A/B são criados pelo Auth local e recebem sessões reais por password
sign-in. Anônimo/A/B devem receber 42501 na bridge server-only. O leitor real usa
PostgREST contra fixtures publicadas/rascunho/privadas/retiradas/direitos restritos.
A consulta SQL serve apenas para inserir/remover fixtures, não substitui a leitura.
IDs aleatórios e prefixo `discovery-lab` não são conteúdo editorial real. Cada escrita
valida destino; cleanup remove apenas os IDs criados e comprova contagens zero.
Logout precede remoção das identidades; finalmente a própria stack é parada sem
backup. Tokens/chaves ficam apenas no processo; não são impressos nem enviados em
artifacts. Falha do comando é erro explícito, sem retry cego.

Essa prova não certifica Storage, media processing, School ou disponibilidade
editorial real. O incremento não altera autorização, consentimento, grants ou RLS.

## Retomada

Base `8b0ba0d2`; branch `codex/comun-soc-d09-public-discovery-20261015`.
Reaproveitar resultado verde somente no SHA/tree correspondente. Não reabrir #549
nem aplicar a migration da Escola para obter CI verde. Não considerar SKIPPED PASS.
