# COMUN 48.1B-P6B-B — alagamento, drenagem e risco de árvores

Atualizado em 10/08/2026.

## Estado do piloto

48.1C não foi concluído nem reiniciado. A decisão de produto permanece:

`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

Nenhuma métrica humana foi declarada atingida. P6C não foi iniciado.

## Escopo entregue

O Relata único em `/comun/relatar` passou a reconhecer, sem miniapps
paralelos:

- `urban_flooding`: alagamento ou enchente ativa;
- `stormwater_drainage`: drenagem, bueiro, boca de lobo, canal ou canaleta;
- `tree_hazard`: árvore, galho ou risco de queda.

O roteador composável `relata-routing-v3-urban-incidents` preserva o V2
ambiental e aplica dominância explícita: risco elétrico, fogo ativo,
alagamento, árvore em risco, drenagem e demais categorias. Alagamento com
drenagem e árvore com fiação continuam gerando um report, um case, um
protocolo COMUN e um item de Carteira.

As perguntas `flood_active_risk` e `tree_state` são tipadas, opcionais e nunca
retiram a ação Guardar. Negações impedem classificar “não alagou” ou “bueiro
não está entupido” como incidentes. Poda rotineira sem risco não vira
`tree_hazard`. Foto-only permanece `original_text=NULL` e `category=other`,
sem visão computacional ou texto inventado.

A Carteira usa os labels “Alagamento ou enchente”, “Drenagem, bueiro ou
canal” e “Árvore, galho ou risco de queda”. O resolver continua fail-closed:
nenhum Fiscaliza, SAAE, Light ou STMU é usado como fallback.

## Schema e promoção

O preflight remoto leu somente metadata e confirmou as três categorias
ausentes, as RPCs vigentes, transition, grants, RLS/FORCE RLS, source_domain e
histórico reconciliado.

Foi promovida exatamente uma migration forward-only:

- `20260810045610_comun_flood_drainage_tree_categories.sql`;
- SHA-256
  `3e1f85b83332c9f52561c9d87ff7f54ad3b929e52e5097d798e175d4efcc06ac`;
- sem tabela, geometria, snapshot, adapter, backfill ou reclassificação
  histórica.

O dry-run remoto `31361880718` registrou:

`COMUN_P6B_B_REMOTE_PLAN_EXACT_ONE`.

O plano continha somente a migration P6B-B, com `includeAll=false`,
`repair=false`, `reset=false` e `seed=false`. A exceção histórica de Calçadas
foi reconciliada pelo procedimento já estabelecido.

O push remoto foi concluído no run `31361960231`. A primeira consulta de
postflight falhou depois da aplicação por um `oid` não qualificado no próprio
SQL de evidência, sem falha da migration. A PR focal `#256` corrigiu apenas a
consulta para `k.oid`; head `46d44e631628ba23964b185ee0db60639fefc8c5`,
merge exact-head `baa5b3139f79f910492aab161fe6a11c9aeb27cd`.

O postflight read-only corrigido `31362446006` comprovou:

- migration e três categorias presentes;
- P6B-A preservado;
- `comun_relata_create` e classification transition executáveis somente por
  `service_role`, sem execute para `anon` ou `authenticated`;
- classification events com RLS e FORCE RLS;
- forwarding `source_domain` inalterado;
- transação read-only e zero leitura de rows de negócio.

## Catálogo institucional

As fontes foram revalidadas em 10/08/2026, somente em páginas oficiais, sem
ligação, mensagem, formulário ou teste operacional:

- Defesa Civil de Volta Redonda, emergência `199`:
  `https://www.voltaredonda.rj.gov.br/comunicacao/noticias/24-gabinete-do-prefeito/9215-preven%C3%A7%C3%A3o-defesa-civil-de-volta-redonda-d%C3%A1-dicas-de-como-agir-em-caso-de-chuva-forte/`;
- Carta de Serviços 162, drenagem, bueiros e bocas de lobo:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/162/`;
- Carta de Serviços 147, limpeza de córregos, rios e canais:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/147/`;
- Carta de Serviços 143, retirada de árvores caídas:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/143/`;
- Carta de Serviços 196, avaliação/corte/poda em domínio público:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/196/`;
- Carta de Serviços 435, referência Fiscaliza VR:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/435/`.

Todos os itens estão `source_verified`, `operationally_unchecked` e
`automationAllowed=false`. O catálogo fica no runtime server-side, fora do
SQL. O Fiscaliza é somente referência, nunca fallback. Prazo administrativo
de manutenção não é apresentado como prazo de emergência.

## Verificação e merge funcional

- PR funcional `#255`;
- head final exato `2b82156020ad7d8e958aa61a536fa444b2c70883`;
- merge exact-head `29bf5fbac1ad8abc538d4d220ead2a932cf25ef4`;
- 33 checks verdes, zero falha e zero pendência;
- Vercel Preview READY e zero review thread bloqueante;
- E2E descartável P6B-B `31359162103`:
  `COMUN_P6B_B_URBAN_INCIDENTS_DISPOSABLE_E2E_GREEN`;
- P6B-A `31359162131`, P6A `31359162158`, Full Surface `31359162097`,
  Core Journeys `31359162138`, Security `31359162122`, Experience
  `31359162121` e Quality `31359162109`, verdes.

O E2E comprovou alagamento, risco ativo, drenagem, árvore caída/inclinada,
negações, dominância elétrica, pergunta não bloqueante e photo-only sem
inferência. Também comprovou receipt inválido negado, outra Carteira isolada,
categoria não forjável, zero forwarding, zero request externo, zero snapshot,
zero coletivo e zero hard delete.

## Production

O exact main `baa5b3139f79f910492aab161fe6a11c9aeb27cd` foi implantado primeiro com
classificação e forwarding urbanos OFF no run `31362536123`. Em seguida, a
onda 1 `31362722810` ativou somente:

`COMUN_URBAN_INCIDENTS_ENABLED=enabled`.

Permanece forçado a `disabled`:

`COMUN_URBAN_INCIDENTS_FORWARDING_ASSISTED_ENABLED`.

Também permanece OFF:

`COMUN_ENVIRONMENTAL_FORWARDING_ASSISTED_ENABLED`.

Deployment final:

- ID `dpl_D8YtJ9YXnzHNmVVWwa8CncHz4xjB`;
- URL
  `https://comunvrabandonada-octgtiqsy-alexandrevrabandonada-oss-projects.vercel.app`;
- target/status `production` / `READY`;
- domínio canônico `https://comunsocial.online` promovido para o deployment.

As rotas `/comun`, `/comun/relatar`, `/comun/calcadas`, `/comun/onibus` e
`/comun/minha-participacao` responderam `200` no workflow e em smoke GET
independente.

O smoke Production criou quatro fixtures privadas com marcador sintético,
sem pessoa, endereço, localização ou fotografia real. O cleanup em `finally`
terminou com:

- active synthetic reports/cases/wallet items/wallets: `0`;
- active packages/attempts: `0`;
- public snapshots e collectives: `0`;
- external sends e external requests: `0`;
- hard deletes: `0`.

Não houve forwarding urbano, window.open, ligação, WhatsApp, e-mail, submit,
auto-send ou publicação. Mapa público geral, coletivos e
`launch_publicly=false` permanecem inalterados.

## Resultado

`COMUN_48_1B_P6B_B_FLOOD_DRAINAGE_TREE_DOMAIN_GREEN_NO_AUTO_SEND`.

Próximo tijolo elegível: `48.1B-P6C — SUS, Educação e serviços sensíveis`.
P6C não foi iniciado neste ciclo.
