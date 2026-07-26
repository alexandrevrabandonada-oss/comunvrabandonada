# Estado atual do COMUN

Atualizado em 26 de julho de 2026.

## Estado vigente

- repositório: `alexandrevrabandonada-oss/comunvrabandonada`;
- `main` vigente: `28f26f2b7c101633e6b68332e0cea003bc4c3af1`;
- último fechamento: PR #40, mesclada por merge commit;
- decisão vigente:
  `COMUN_TIJolo_44_3_ACTION_TO_MEMORY_MERGED`;
- Tijolo 44.3: jornada administrativa de Ações Coletivas integrada até
  encaminhamento, protocolo, resposta, resultado e memória pública;
- MICRO, CHECKPOINT e RELEASE/FULL do SHA candidato aprovados;
- Preview e produção do merge SHA aprovados; `/comun/acoes` respondeu 200 em
  modo pausado;
- `COMUN_COLLECTIVE_ACTIONS_V1`: desabilitada em produção;
- migration remota de Ações Coletivas: não aplicada;
- Tijolo 43: código integrado, ativação operacional permanece estacionada na
  branch específica e sem escrita remota;
- banco remoto, storage e histórico de migrations: sem escrita nesta entrega;
- piloto público: fechado.

O relatório de fechamento desta entrega está em
`reports/current/comun-tijolo-44-3-fechamento.md`. As seções seguintes
preservam o histórico dos Tijolos 42 e 43.

## Histórico — Tijolo 42

A pauta passa a ser o eixo público entre território, comunidade, conversa,
contribuição, ação, resultado e memória. A pauta-piloto “Calçadas em
circulação” apresenta seis etapas fixas e mantém o mapa como sua ferramenta
cartográfica. A comunidade-piloto é identificada editorialmente como
“Mobilidade e Acessibilidade”, sem criar fixture ou registro remoto.

Nenhum domínio, Supabase remoto ou workflow foi alterado neste tijolo. O
diagnóstico canônico está em `reports/current/comun-tijolo-42-diagnostico.md`.

Evidência terminal:

- FAST: aprovado;
- FULL: aprovado no run `30122395558`;
- Vercel Preview: aprovado;
- PR #31 mesclada normalmente;
- CI da `main`: aprovado no run `30125728267`;
- Vercel da `main`: aprovado no merge SHA;
- `/comun`, `/comun/calcadas` e `/comun/participar`: HTTP 200;
- Minha Participação e Caixa: HTTP 307 esperado;
- PMTiles: HTTP 206;
- `/comun/pautas/calcadas-em-circulacao`: HTTP 404;
- nenhuma resposta 5xx;
- navegação pauta ↔ mapa: reprovada pelo 404.

O bloqueio `NO_GO_PAUTA_CANONICA_404` acima é evidência histórica do primeiro
smoke do Tijolo 42 e foi encerrado pela PR #32. Nenhuma branch ou PR do Tijolo
43 foi criada durante esse fechamento.

O Tijolo 42.1 adiciona um fallback editorial honesto e sem fixture remota.
Registro público real sempre vence; registro privado/arquivado e falha de
consulta não são convertidos em pauta pública. A validação local passou com
typecheck, lint, 263/263 unitários, build, dois smokes, 14/14 E2E, 8/8 Axe e
fixtures limpas.

## Fechamento vigente — Tijolo 42.1

- PR #32 mesclada por merge commit;
- branch HEAD: `a52c625e2221345311a93d6931491d3887e478cd`;
- merge SHA: `a989d517cd56d1051176eeb16675b019936e3244`;
- FULL pré-merge: run `30128663490`, aprovado;
- CI pós-merge: run `30130058303`, aprovado;
- Vercel Production deployment `5595972121`: aprovado;
- pauta canônica, Home, pautas, mapa e participação: HTTP 200;
- áreas autenticadas: HTTP 307 esperado;
- PMTiles: HTTP 206;
- pauta ↔ mapa: aprovada;
- nenhuma resposta 5xx ou marcador sensível encontrado nas superfícies
  inspecionadas.

Decisão vigente: `COMUN_NUCLEO_VIVO_PRODUCTION_GREEN`.

O Tijolo 43 está `TIJOLO_43_UNBLOCKED`; o gate humano permanece 0/3 e o piloto
público permanece fechado.

## Início controlado do Tijolo 43

A PR documental #33 foi mesclada no SHA
`9b067d8302eb42e443afb6580b347d8a2cc941ec`. O smoke subsequente encontrou um
identificador editorial local usado como chave React no payload RSC de Home e
Pautas. A correção mínima da PR #34 foi mesclada no SHA
`4a9e2d4f341e755b3a1aa969c26344f4f4334bae`.

O novo smoke confirmou Home, Pautas, pauta canônica, Mapa e Participar com HTTP
200, PMTiles com HTTP 206, navegação bidirecional e ausência dos marcadores
sensíveis auditados. Só então foi criada a branch
`codex/tijolo-43-calcadas-ciclo-operacional`.

O diagnóstico inicial foi corrigido: a proteção do texto privado, o lock
recuperável e a relação durável de duplicidade exigiram a migration local
`20260724233256_comun_sidewalk_operational_hardening.sql`. Ela não foi aplicada
remotamente. O gate humano permanece 0/3 e o piloto público fechado.

## Checkpoint CI do Tijolo 43

O SHA anterior corrigiu o teste frágil de marcadores e tornou o rehearsal
diagnosticável por checkout imutável e artifact sanitizado. No run
`30141194406`, o PRE real coincidiu com o contrato, mas a primeira passagem
falhou com `SOLO_CANONICAL_DATABASE_QUERY_FAILED`; POST e segunda passagem não
foram alcançados. FAST falhou nos três testes de transporte Docker do
PostgreSQL temporário no Ubuntu, enquanto os gates locais seguem verdes.
Vercel Preview passou; FULL foi pulado e não foi disparado manualmente.

Não houve Supabase remoto, migration remota, merge, deploy manual, domínio ou
promoção. A correção da conectividade Docker no CI é o próximo bloqueio antes
de qualquer promoção.

## Patch T43.1 — transporte PostgreSQL no Ubuntu

O diagnóstico confirmou que o cliente `psql` e o banco são containers irmãos:
no GitHub Ubuntu, a porta publicada em loopback não é uma rota entre eles. O
patch usa uma rede Docker explícita e alias interno (`postgres-test` nos
testes; `db` no rehearsal), sem ampliar a allowlist local nem alterar a
migration ou o manifesto congelado. Os 18 testes do runner passaram em duas
execuções locais consecutivas; typecheck, lint, 266 unitários, validator SQL,
`solo:test` e smoke operacional passaram.

Na mesma rodada, a stack Supabase local não estava iniciada: faltava
`supabase_db_nvmdszymrtacfehdynpg`. Portanto runtime smoke, matriz RLS e DB
lint não têm novo resultado verde e a decisão continua
`COMUN_CALCADAS_FAST_PATCH_REQUIRED`. O FAST e o rehearsal no GitHub devem
passar no mesmo SHA antes de qualquer FULL. Gate humano permanece 0/3 e piloto
público fechado.

## Hardening

A release `20260723220112-canonical-security-hardening` ficou executável pelo
role `postgres` disponível. Ela corrige integralmente o escopo controlável pelo
COMUN e mantém os defaults de `supabase_admin` como observações gerenciadas.

Foram preparados:

- view pública `security_invoker`, RLS e grants de coluna sanitizados;
- defaults futuros pertencentes a `postgres` endurecidos;
- duas funções definer com `search_path=pg_catalog`;
- trigger `auth.on_auth_user_created` preservado;
- ledger privado `public.comun_schema_releases`;
- lint obrigatório de privilégios explícitos;
- runner de release por manifesto, checksum e fingerprints;
- CI com diagnóstico separado e repetição única para 502 transitório.

## Decisão histórica

Estado técnico anteriormente comprovado após FAST, FULL e Vercel no mesmo HEAD:
`COMUN_SECURITY_HARDENING_READY_TO_PROMOTE`.

Evidências:

- captura sanitizada determinística: run `30054188587`;
- FAST: run `30054740000`, sucesso;
- FULL: run `30054740000`, sucesso;
- Vercel Preview: sucesso;
- fingerprint pré:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- fingerprint pós inicialmente projetado:
  `82989755711d63a14d209cc2074fd3656288e74fb030331dac282acac7a8265b`.

Não houve migration remota, merge, alteração de domínio ou mudança em
produção. O gate humano permanece 0/3 e o piloto público fechado.

## Promoção final

O run `30057245879` criou o checkpoint sanitizado `8583227864`, mas interrompeu
o runner forward-only com `SOLO_FORWARD_ONLY_FAILED`. A captura read-only
`30057335078` confirmou rollback total: fingerprint pré inalterado, 9
bloqueantes e ledger ausente. A label foi removida, a PR permanece aberta e a
main não avançou.

## Correção do runner em validação

A causa exata foi reproduzida com PostgreSQL 17: a consulta JSON era executada
no formato tabular padrão do `psql`, e o runner aplicava `JSON.parse` sobre
cabeçalho, separador, documento e contador `(1 row)`. A exceção nativa não
recebia marcador próprio, contribuindo para o diagnóstico genérico no workflow.

O patch separa `executeSql`, `queryJson` e `queryScalar`, canoniza o transporte,
sanitiza todas as falhas de processo e adiciona um preflight remoto
estritamente read-only no `COMUN Nightly`. A migration e seu checksum
permanecem idênticos.

O primeiro ensaio read-only, run `30061056715`, comprovou que o baseline
compacto não contém por contrato triggers de `auth`; a validação antiga
procurava `auth.on_auth_user_created` na projeção errada. O patch passou a
consultar somente a contagem desse trigger em `pg_catalog`, por `queryScalar`.
Nenhuma escrita ocorreu nesse diagnóstico.

Evidências do HEAD técnico corrigido
`12fbb437324086f92d8beefc586d335b5652f8ed`:

- FAST e FULL: run `30061223511`, sucesso;
- Vercel Preview: sucesso;
- preflight remoto read-only: run `30062302321`, sucesso;
- fingerprint remoto:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- bloqueantes: 9; observações de plataforma: 1; ledger: ausente;
- todos os demais jobs do `COMUN Nightly` foram ignorados.

Essa decisão foi superada pela segunda tentativa controlada.

## Estado canônico após a segunda tentativa

No run `30099519716`, a migration foi confirmada e aplicada dentro da transação,
mas o pós-check interrompeu a promoção com
`SOLO_CANONICAL_POST_FINGERPRINT_MISMATCH`. A captura read-only
`30099668279` confirmou:

- fingerprint real:
  `a8dc235b2f0a1fa2554a7dd0db9c46372867fc21a5f610b47d008e1c15c46197`;
- zero achados bloqueantes;
- uma observação de plataforma e três defaults gerenciados;
- ledger presente;
- cleanup dry-run sem objetos elegíveis;
- `main` ainda em `b2f6733dacd15ec21601ed6b6837b42213b87d70`;
- nenhum merge e nenhum deployment novo.

A divergência ficou limitada a dois privilégios que o projetor pressupunha,
mas a migration corretamente não concedeu: `INSERT` e `DELETE` no ledger para
`service_role`. O contrato local foi reconciliado com o estado remoto mais
restritivo, mantendo os bytes e o checksum da migration aplicada. A tupla
histórica do ledger é aceita apenas por valor completo explicitamente
registrado; qualquer outra divergência continua bloqueante.

## Fechamento da terceira tentativa

O contrato reconciliado foi validado no HEAD
`7f19aa6b0894a68194f5f20b6236382bf1e8e006`:

- FAST e FULL: run `30102040827`, sucesso;
- preflight remoto estritamente read-only: run `30103889675`, sucesso;
- fingerprint remoto:
  `a8dc235b2f0a1fa2554a7dd0db9c46372867fc21a5f610b47d008e1c15c46197`;
- zero achados bloqueantes;
- uma observação de plataforma;
- ledger presente e aceito pelo contrato histórico exato;
- nenhum job mutável executado no preflight.

A autorização controlada disparou o run `30104161976`. O runner:

- criou o checkpoint sanitizado `8600891303`;
- validou manifesto, checksum e SQL;
- reconheceu `COMUN_CANONICAL_SECURITY_HARDENING_ALREADY_APPLIED`, sem repetir
  a migration;
- concluiu DB lint e postflight remoto;
- executou cleanup somente em dry-run, com zero objetos elegíveis;
- interrompeu antes do merge em `Validate immutable Vercel preview`, com
  `SOLO_VERCEL_PREVIEW_CURL_FAILED:/comun:1`.

Como a falha ocorreu antes do merge, os passos de merge, deployment da `main`,
reconciliação de domínio, smoke público e marcador verde de produção foram
ignorados. A label `comun:promover` foi removida imediatamente. A PR #30
permanece aberta e sem merge; a `main` permanece em
`b2f6733dacd15ec21601ed6b6837b42213b87d70`.

Decisão vigente: `SOLO_PROMOTION_FAILED`. O hardening remoto está aplicado e
sem achados bloqueantes, mas a promoção da aplicação não foi concluída. O
próximo trabalho deve diagnosticar a chamada autenticada ao preview da Vercel
sem repetir a migration. O gate humano permanece 0/3 e o piloto público
continua fechado.

## Correção isolada do preview protegido

A causa inferior foi confirmada como `VERCEL_SCOPE_FAILED`. O runner combinava
rota relativa, URL sem protocolo e um slug de escopo que o token do Actions não
podia acessar. O cliente agora usa a URL HTTPS completa do deployment e não
depende de slug; o contrato canônico é comprovado pelos IDs de projeto e time,
SHA, `READY` e target `preview`.

O modo manual `preview_preflight=true` executa somente checkout, Node,
imutabilidade do SHA, cliente Vercel e artifact sanitizado. Ele não recebe
secrets de banco e mantém release preflight, FULL local, cleanup, worker,
health de produção e baseline capture como `skipped`.

No HEAD `7a86cc8585ae81a8b732346220b30dbaa29f8578`, FAST, FULL e
Vercel passaram. O preflight isolado `30111887097` bloqueou antes das rotas
porque o CLI rejeitou o valor atual de `VERCEL_TOKEN` como inválido. O
deployment `dpl_41VBYab1Z6i6cBtr5Y266tJAZPyy` foi confirmado read-only como
`READY` no projeto e time canônicos por uma identidade Vercel separada.

Decisão vigente: `NO_GO_VERCEL_PREVIEW_CREDENTIAL`. A PR #30 permanece aberta,
sem merge e sem label de promoção; o gate humano permanece 0/3 e o piloto
público continua fechado.
Adendo Tijolo 43.1: FAST no SHA `5503e02` ficou verde e o rehearsal confirmou a rede interna em `db:5432`; a falha posterior era somente um delimitador de fingerprint no runner, já corrigido com teste de regressão. A decisão permanece `COMUN_CALCADAS_FAST_PATCH_REQUIRED`, sem FULL, promoção ou escrita remota.
