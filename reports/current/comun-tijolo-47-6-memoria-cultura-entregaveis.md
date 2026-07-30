# Tijolo 47.6 — Memória e cultura entregáveis

Estado deste relatório: implementação integrada; promoção bloqueada por
findings remotos objetivos.

## Diagnóstico

| Experiência          | Implementação existente                                                                                                      | Fonte canônica                                                        | Lacuna comprovada                                                                                             | Ação focal                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Acervo Vivo          | Catálogo, detalhe, contribuição, moderação, assets, coleções, identificação, correção e retirada                             | `comun_archive_items` + `comun_archive_assets`                        | Evidência de entregabilidade dispersa e ausência de inventário remoto agregado                                | Contrato cultural comum e auditoria read-only            |
| Rádio Comunitária    | Programas, episódios, áudio privado/público, créditos, consentimentos, direitos musicais, transcrição, capítulos e retirada  | raiz `comun_archive_items`; especializações `comun_radio_*`           | Asset público não era filtrado também por `public_safe`; `unavailable` era aceito como transcrição suficiente | Fronteira pública explícita e acessibilidade fail-closed |
| Arte dos Territórios | Obra, agentes, créditos, direitos granulares, original privado, derivadas, contexto territorial, retirada, alertas e cleanup | raiz `comun_archive_items`; especializações `comun_archive_artwork_*` | Publicação não exigia alt text nem comprovava a existência do objeto derivado                                 | Checklist exige acessibilidade e objeto verificável      |
| Integrações          | Busca, experiência central, pauta/território, Minha Participação e Inbox                                                     | relações existentes e eventos `artwork_update`/`radio_update`         | Não havia um gate cultural único                                                                              | Definições comuns sem duplicar entidades                 |
| Operação             | Smokes locais fortes por produto                                                                                             | scripts de Acervo, Rádio e Arte                                       | Nenhum workflow focal separava PR, preflight, ensaio e inventário                                             | Workflow `COMUN Cultural Deliverability`                 |

## Matriz do contrato

| Evidência                    | Acervo                 | Rádio                                        | Arte                  |
| ---------------------------- | ---------------------- | -------------------------------------------- | --------------------- |
| raiz canônica                | `comun_archive_items`  | `comun_archive_items`                        | `comun_archive_items` |
| fonte/contexto               | obrigatório            | obrigatório                                  | obrigatório           |
| direitos/consentimento       | obrigatório            | obrigatório                                  | obrigatório           |
| original privado             | obrigatório para mídia | obrigatório                                  | obrigatório           |
| derivada pública revisada    | obrigatório para mídia | áudio público                                | imagem pública        |
| acessibilidade               | alt text               | transcrição publicada ou exceção documentada | alt text              |
| vínculo político/territorial | contexto de fonte      | pauta/território/contexto                    | pauta/território      |
| retirada e auditoria         | existente              | existente                                    | existente             |

## Segurança

- nenhum schema novo foi necessário;
- migration e manifesto operacionais não foram alterados;
- PR executa apenas verificações locais;
- inventário remoto usa SQL fixo, `default_transaction_read_only` e
  `begin transaction read only`;
- ensaio remoto usa fixtures privadas, bloqueia projeção `anon` e reverte a
  transação;
- artifacts contêm somente contagens, booleans e estados;
- autorização de conteúdo real não é inferida por contagem;
- `launch_publicly` não é acionado.

## Inventário remoto inicial read-only

Captura sanitizada em 2026-07-30:

- migrations `20260714144416`, `20260715170058`, `20260715174723` e
  `20260715185344` presentes no histórico remoto;
- `comun_archive_items`, `comun_archive_assets`, `comun_archive_artworks`,
  `comun_radio_programs` e `comun_radio_episodes` legíveis;
- itens do Acervo: **0**;
- itens públicos do Acervo: **0**;
- programas publicados da Rádio: **0**;
- episódios publicados da Rádio: **0**;
- obras territoriais publicadas: **0**;
- quatro buckets culturais esperados presentes;
- buckets privados marcados como públicos: **0**;
- assets privados com URL pública: **0**;
- escritas no banco e no Storage: **none**.

O inventário não leu IDs, títulos, descrições, contatos, object keys ou
conteúdo editorial. A ausência de conteúdo real impede promoção verde, mesmo
que contrato, schema, RLS e ensaio privado fiquem verdes.

## Evidências ainda necessárias

1. CI integral do SHA candidato;
2. preflight remoto read-only;
3. ensaio privado remoto e limpeza comprovada;
4. inventário agregado de conteúdo real;
5. smoke público e no-leak após o merge;
6. conteúdo real com autorização editorial separada nos três recortes antes
   de promoção.

Até a existência dessas provas, este documento não declara
`COMUN_ARCHIVE_RADIO_ART_GREEN`.

## Evidência pós-merge e reparo de linhagem

O primeiro audit automático da `main`, run `30575925581`, foi preservado como
evidência histórica e retornou
`COMUN_ARCHIVE_RADIO_ART_BLOCKED_REMOTE_STATE`. As contagens SQL daquele run
divergiram do inventário read-only obtido pela configuração pública canônica:
foram observados 2/4 buckets, enquanto o inventário do projeto público mostrou
4/4. O run também contou assets de imagem fora da projeção pública cultural
efetivamente publicada.

Essa divergência não foi reinterpretada como sucesso e o ensaio remoto privado
permaneceu bloqueado. O reparo focal:

- vincula `SUPABASE_DB_URL` ao único `SUPABASE_PROJECT_REF` allowlisted antes
  da conexão;
- aceita somente host direto ou usuário de pooler compatível com o project ref
  exato;
- aplica o mesmo bloqueio ao audit e ao ensaio privado;
- registra no artifact apenas `target.verified=true`, sem URL, host, usuário ou
  project ref;
- limita o finding de alt text a imagens aprovadas, com URL pública, ligadas a
  itens efetivamente publicados e públicos.

Um novo preflight remoto é obrigatório antes do ensaio privado. O run
`30575925581` não será apagado nem sobrescrito.

## Evidência local

- histórico completo de migrations aplicado em Supabase local descartável;
- migration e manifesto canônicos permaneceram inalterados;
- `COMUN_ARCHIVE_RADIO_ART_PRIVATE_REHEARSAL_GREEN`;
- um item privado por domínio, projeção pública bloqueada e rollback integral;
- linhas remanescentes após o rollback: **0**;
- `COMUN_ARCHIVE_RADIO_ART_AUDIT_SANITIZED`;
- tabelas canônicas presentes: **11/11**;
- tabelas sem RLS: **0**;
- grants públicos perigosos: **0**;
- buckets culturais presentes: **4/4**;
- buckets privados públicos: **0**;
- assets privados com URL pública: **0**;
- Rádio, Arte, Storage de Arte, fundação do Acervo e matriz RLS verdes;
- build, typecheck, lint, contratos e testes focais verdes;
- rotas `/comun/acervo`, `/comun/radio`, `/comun/acervo/arte` e `/comun/arte`
  responderam HTTP 200 sem marcadores privados.

O smoke de fotografia histórica com R2 real permaneceu deliberadamente não
executado porque exige escrita externa. O smoke geral legado de UI ainda contém
expectativas textuais anteriores à Home atual; a falha é independente destas
superfícies culturais e não foi mascarada.

## Operação diária

O workflow focal separa:

1. verificação local e sem secrets na PR;
2. auditoria remota agregada e somente leitura após integração;
3. ensaio privado transacional, somente com confirmação explícita;
4. uma única issue agregadora para findings da execução diária.

Nenhum desses canais publica conteúdo ou aciona `launch_publicly`.

## Fechamento

- PR funcional: #105;
- SHA candidato funcional:
  `a6bee9b4b1e75df96ffe96a0f99f53442beb3ed0`;
- merge funcional:
  `007cd534bbced82b4b3ffeb0a5fa061cc5d95361`;
- PR de reparo da linhagem do audit: #106;
- SHA candidato do reparo:
  `bda9283a7737839c0b88a95fd7f8877a6104c99a`;
- merge do reparo:
  `20bfd0c05ff2eca28811f78143e95fc864835c93`;
- CI focal da PR #106: run `30576664453`, verde;
- audit automático pós-merge: run `30576859682`, verde como execução
  read-only e sanitizada;
- deployment de Production: `5681375598`, `success`;
- `target.verified=true`;
- schema: 11/11 tabelas, RLS ausente em 0, grants públicos perigosos 0;
- Storage: 2/4 buckets culturais presentes;
- imagens efetivamente publicadas sem alt text: 1;
- conteúdo real potencial comprovado: Acervo 0, Rádio 0, Arte 0;
- rotas `/comun/acervo`, `/comun/radio`, `/comun/acervo/arte` e `/comun/arte`:
  HTTP 200 e sem marcadores privados;
- ensaio privado remoto: não executado, pois o preflight permaneceu bloqueado;
- banco e Storage: zero escrita remota neste checkpoint;
- `launch_publicly`: não executado.

Resultado terminal:

`COMUN_ARCHIVE_RADIO_ART_BLOCKED_REMOTE_STATE`

O domínio permanece `evidence_required`. A próxima correção deve tratar, em
checkpoint próprio, os dois buckets ausentes e a acessibilidade editorial da
imagem publicada. Somente depois de um novo preflight estrutural verde poderá
ser executado o ensaio privado transacional. A presença de conteúdo real
autorizado nos três recortes continuará sendo uma evidência separada e
obrigatória.

O checkpoint focal subsequente está documentado em
[TIJOLO 47.6A](./comun-tijolo-47-6a-remote-state-checkpoint.md). Este resultado
bloqueado permanece preservado e não será reclassificado retroativamente.
