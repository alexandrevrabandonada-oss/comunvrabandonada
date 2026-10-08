# Escola R0 — pacote separado de revisão da release

Estado: preparação de release, **sem autorização de promoção**.
Base: merge #522, `2d21df3de4da10851840529a639944ee22141377`.
O #523 permanece candidato em `ec849235b1fa33dd4dad959a4748b6ddff438bfd`.

Certificação do #522: a inspeção de schema retornou
`COMUN_QUALITY_REMOTE_READ_ONLY_GREEN`. Quality run `37811285564` falhou depois
no seletor antigo da busca, que inclui a cópia oculta de streaming. A correção
já validada no #523 precisa entrar em PR focal antes de encerrar a certificação
da base; não é falha da inspeção read-only nem motivo para transportar schema.

## Pacote imutável

| Item                   | Identidade conferida                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| Migration              | `20261006134804_comun_learning_r0.sql`                                 |
| SHA-256 da migration   | `5036a833b1b681487204349f8ebc58690228a2f5aa932943a81f60df1d3b6ba7`     |
| Manifest               | `20261006134804-comun-learning-r0.json`                                |
| SHA-256 do manifest    | `3b598bc6b3ea3dfe462ba205b6747016aace52de87c87dec332ecbb1a567d4de`     |
| Objetos principais     | 6 tabelas, 4 funções; 6 tabelas com RLS esperado                       |
| Seed editorial         | 4 trilhas, 24 missões, 4 materiais; comparação completa com o catálogo |
| Permissão remota atual | `remotePromotionAllowed=false`, `scope=local_candidate`                |
| Ativação               | `COMUN_LEARNING_R0_ENABLED`; esta entrega não altera a flag            |

A comparação Git de migration, manifest, scripts da Escola e workflow entre
main e o head do #523 não encontrou diferenças. As provas descartáveis do #523
são evidência dessas partes; não substituem baseline remoto ou pós-promoção.

Os seis preflights do #523 continuam bloqueados pela versão `20261006134804`.
Quality e Civic Intelligence do candidato terminaram com sucesso. O diagnóstico
remoto registrado no #523 indica nenhuma migration desconhecida, nenhum
controle estrutural falhando e somente a Escola pendente. A captura precisa
ser atualizada antes de qualquer futura mudança no banco.

## Verificadores deste pacote

```sh
node --test scripts/learning/release-review.node-test.mjs
node scripts/learning/release-review.mjs
```

O comando offline verifica os hashes fixos, o manifest ainda bloqueado, nomes
dos objetos e igualdade de todos os conteúdos JSON do seed com o catálogo.
Produz `.ci-artifacts/learning-release-review/package.json` com SHA de origem
e `promotionReady=false`. Não conecta ao banco nem promove a release.

A captura opcional usa a identidade allowlisted e as variáveis de conexão
do mecanismo de revisão, sem imprimi-las:

```sh
node scripts/learning/release-review.mjs --capture
```

Exige `SUPABASE_DB_URL`, `SUPABASE_PROJECT_REF` e
`COMUN_LEARNING_REVIEW_ALLOWED_PROJECT_REFS`. A conexão inicia read-only;
`BEGIN READ ONLY` envolve um SELECT de catálogos/histórico e termina em
`ROLLBACK`. Nenhuma linha de progresso, prática, pessoa ou pauta é consultada.
Falhas são sanitizadas; objeto parcial ou histórico já presente bloqueiam uma
promoção nova. Mesmo ausência completa retorna necessidade de baseline e
revisão, nunca autorização para instalar.

Esse inventário não verifica ainda grants, policies, constraints, assinatura
completa, ledger ou fingerprint de todo o schema. É captura preliminar, não
preflight de promoção nem certificado de ausência de drift.

O workflow deste pacote roda somente em pull_request e usa PostgreSQL vazio
descartável, sem secrets remotos. A prova SQL verifica inventário ausente,
objetos parciais/desconhecidos, histórico presente e recusa de DDL/DML pelo
leitor. A fixture é sintética e não substitui Auth ou schema canônico.

## Ordem para destravar o próximo merge

1. Certificar deploy e checks pós-merge do #522 no SHA integrado. Não reutilizar
   resultado de Preview como certificado de Production.
2. Integrar este pacote depois dos seus checks pertinentes. Isso publica as
   ferramentas de revisão; mantém a promoção bloqueada.
3. Capturar baseline canônico e ledger em read-only, no ambiente identificado,
   com fingerprint/hash e SHA de origem. Confirmar que a única pendência é a
   migration fixada e que os dez objetos ainda não existem. Qualquer drift
   adicional requer diagnóstico próprio, sem atualizar expectativas para passar.
4. Preparar e testar separadamente o transportador e o POST derivado. Definir
   gravação atômica de schema, migration history e ledger. O SQL original contém
   BEGIN/COMMIT e não é idempotente: não executá-lo duas vezes nem usar db push
   abrangente. Uma instalação parcial não autoriza replay ou reparo automático.
5. Ensaiar PRE → aplicação única → POST → replay recusado em banco descartável
   com schema canônico. Conferir RLS, grants, funções SECURITY INVOKER, catálogo,
   constraints e ausência de alteração nos outros domínios. Usar a prova Auth
   real existente para isolamento, concorrência e API; distinguir os dois ensaios.
6. Revisar identidade do ambiente, pacote exato, capacidade de recuperação e
   autorização específica da escrita de schema. Só então um pacote separado
   pode alterar a permissão remota e executar a promoção controlada. Merge de
   código não autoriza essa escrita.
7. Com schema comprovado e flag ainda desligada, repetir os seis preflights
   afetados, conferir o merge de teste sobre main e integrar #523 se verde.
   Certificar o deploy Git e checks pós-merge no SHA final.
8. Tratar ativação da Escola, responsáveis reais, aparelhos e ensaio humano
   como etapa posterior, sem inferir conclusão V1.

## Recuperação que precisa ser ensaiada

A migration cria objetos e seed editorial em transação. Falha antes do COMMIT
deve deixar PRE preservado; o transportador precisa demonstrar isso incluindo
history/ledger. Após COMMIT, manter a flag desligada e bloquear a operação se o
POST divergir. Não oferecer DROP ou restauração sobre Production automática.

Antes de autorizar a escrita, demonstrar uma cópia recuperável do estado PRE,
definir responsável pela execução e substituto, e medir a recuperação em um
destino isolado. Se houver progresso/prática reais, uma remoção de objetos pode
perder dados privados: preservar esses dados e interromper a promoção. Nenhuma
capacidade de backup ou recuperação é presumida por este documento.

## Evidência desta preparação

PASS local: 15 testes Node, execução offline do pacote e diff-check. Banco real
local NOT_RUN: Docker/psql ausentes; a prova PostgreSQL foi preparada no CI e
precisa do resultado do novo head. Captura remota, baseline completo, transporte,
POST derivado, recuperação e promoção NOT_RUN nesta preparação. Migration e
manifest permanecem byte-idênticos. Nenhuma flag, schema remoto ou gate mudou.
