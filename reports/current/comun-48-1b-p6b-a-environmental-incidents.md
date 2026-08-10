# COMUN 48.1B-P6B-A — incidentes ambientais e territoriais

Atualizado em 10/08/2026.

## Estado do piloto

48.1C não foi concluído nem reiniciado. A expansão P6B-A foi autorizada por
decisão de produto, mantendo o registro:

`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

Participantes humanos completos continuam em `0`; nenhuma métrica humana foi
declarada atingida.

## Escopo entregue

O Relata único em `/comun/relatar` reconhece, sem miniapp paralelo:

- fogo ou incêndio ativo e queimada ativa;
- fumaça, fuligem e vestígio ambiental;
- poluição, poeira, pó preto, odor ou emissão percebida;
- lixo, entulho, resíduo e descarte irregular.

O roteador determinístico versionado
`relata-routing-v2-environmental` produz candidatos, categoria selecionada,
confiança, sinais internos, pergunta adaptativa, revisão humana e versão de
routing. Os sinais internos não são expostos ao browser nem persistidos no
`routing_decision` público. Não foi adicionado LLM, visão computacional ou
inferência a partir de foto-only.

Fogo ativo domina risco e recebe urgência emergencial, mas o COMUN não afirma
ter acionado emergência. Fumaça ambígua oferece a pergunta opcional “Você
consegue ver chamas agora?” sem retirar a ação Guardar. Negação e contexto
distinguem fogo ativo de fogo apagado, fumaça ausente e vestígio ambiental.
Múltiplos sinais continuam gerando um relato, um protocolo e um item de
Carteira.

## Preflight e schema

O preflight remoto read-only confirmou por metadata, sem ler conteúdo de
relatos:

- categorias existentes `active_fire`, `smoke_or_environmental_trace`,
  `environmental_pollution` e `waste_or_debris`;
- constraints e assinatura vigente de `comun_relata_create`;
- classification transition, forwarding packages/attempts/events, grants,
  RLS/FORCE RLS e catálogo vigente;
- núcleo P5/P6A preservado.

Nenhuma categoria ou migration foi necessária. O dry-run final do head exato,
run `31354873210`, registrou `migrationCount=0`, `includeAll=false`,
`repair=false`, `reset=false` e `seed=false`:

`COMUN_P1G_REMOTE_MIGRATION_PLAN_EMPTY`.

A transition vigente só admite a correção photo-first do escopo P6A. A
correção ambiental arbitrária não foi improvisada:

`COMUN_P6B_A_CATEGORY_CORRECTION_CAPABILITY_DEFERRED`.

A constraint Production de `source_domain` aceita somente `bus` e
`essential_service`. O forwarding ambiental exigiria extensão de schema e
permanece desligado:

`COMUN_P6B_A_ENVIRONMENTAL_FORWARDING_SCHEMA_EXTENSION_DEFERRED`.

## Catálogo institucional

Os canais foram revalidados somente em fontes oficiais, sem ligação, mensagem,
e-mail, formulário ou teste operacional:

- emergência de fogo: Corpo de Bombeiros Militar do Estado do Rio de Janeiro,
  telefone `193`, fonte
  `https://www.cbmerj.rj.gov.br/sobre-o-cbmerj/unidade/unidades-operacionais/centro-de-operacoes-do-corpo-de-bombeiros-cocb/`;
- dano/denúncia ambiental municipal: Secretaria Municipal de Meio Ambiente de
  Volta Redonda, fonte `https://servicos.voltaredonda.rj.gov.br/cartaServicos/201/`;
- denúncia ambiental estadual: Ouvidoria do INEA, fonte
  `https://www.inea.rj.gov.br/ouvidoria/`;
- resíduos e descarte irregular: Prefeitura de Volta Redonda, canal `156`,
  fonte
  `https://www.voltaredonda.rj.gov.br/comunicacao/noticias/85-semop/11474-volta-redonda-c%C3%A2meras-da-ordem-p%C3%BAblica-flagram-descarte-irregular-de-lixo-e-autor-%C3%A9-responsabilizado/`.

Todos estão registrados no catálogo server-side como `source_verified` e
`operationally_unchecked`, revisados em `2026-08-10`. Nenhum destino novo foi
colocado em SQL e nenhum adapter foi ativado. A Carteira continua fail-closed,
sem Fiscaliza VR, STMU, SAAE ou outro canal como fallback ambiental.

## Verificação e merge

- PR funcional `#253`;
- head funcional exato
  `997c9de1c07ffcdb161535bf18fe0d26bfda3b1d`;
- merge exact-head `bc0e627988176afec0b06721f714a89db867b480`;
- checks executados no head final: `26` verdes, zero falha e zero pendência;
- Preview Vercel: READY;
- E2E P6B-A run `31354428041`:
  `COMUN_P6B_A_ENVIRONMENTAL_INCIDENTS_DISPOSABLE_E2E_GREEN`;
- regressão P6A run `31354428057`, verde;
- Core Journeys `31354428096`, Experience `31354428060`, Security
  `31354428068` e Full Surface `31354428113`, verdes.

O E2E descartável comprovou fogo ativo, fogo apagado com fumaça, fumaça
ambígua e pergunta opcional, pó preto, cheiro químico, entulho, lixo pegando
fogo, fallback `other` e photo-only sem texto. Também comprovou receipt
inválido negado, outra Carteira isolada, zero forwarding, zero request externo,
zero snapshot público, zero coletivo e zero hard delete.

## Production

O merge exato foi implantado primeiro com ambas as flags OFF, run
`31354964511`. As rotas `/comun`, `/comun/relatar`, `/comun/calcadas`,
`/comun/onibus` e `/comun/minha-participacao` responderam `200`.

A onda 1, run `31355068551`, ativou somente:

`COMUN_ENVIRONMENTAL_INCIDENTS_ENABLED=enabled`.

Permaneceu forçado a `disabled`:

`COMUN_ENVIRONMENTAL_FORWARDING_ASSISTED_ENABLED`.

Deployment final:

- ID `dpl_5htbwyTaw7nCXN6zxEpPnSa9g6dq`;
- URL
  `https://comunvrabandonada-iqq3mbr94-alexandrevrabandonada-oss-projects.vercel.app`;
- target/status `production` / `READY`;
- domínio canônico `https://comunsocial.online` apontando para esse deployment;
- commit `bc0e627988176afec0b06721f714a89db867b480`;
- scan de logs `error` após o deploy: `0` ocorrências.

O smoke Production criou quatro fixtures privadas com marcador sintético
inequívoco, sem endereço, pessoa, local ou foto real. O cleanup em `finally`
terminou com:

- active synthetic reports/cases/wallet items/wallets/packages/attempts: `0`;
- public snapshots e collectives: `0`;
- external sends e external requests: `0`;
- hard deletes: `0`.

Não houve onda 2: o forwarding ambiental foi corretamente adiado por exigir
migration. Auto-send, publicação automática, mapa público geral, coletivos e
`launch_publicly` permanecem desligados.

## Resultado

`COMUN_48_1B_P6B_A_ENVIRONMENTAL_INCIDENTS_DOMAIN_GREEN_NO_AUTO_SEND`.

Próximo tijolo elegível: `48.1B-P6B-B — alagamento, drenagem e árvores`.
Não iniciar P6C no mesmo ciclo.
