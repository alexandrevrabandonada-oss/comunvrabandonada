# COMUN 48.1B-P6C-C — Encaminhamento assistido sensível

Atualizado em 10/08/2026.

## Estado do piloto

48.1C não foi concluído nem reiniciado. A decisão de produto permanece:

`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

Nenhuma métrica humana foi declarada atingida.

## Escopo entregue

Saúde pública, Educação pública e Proteção de criança ou adolescente passaram
a ter acompanhamento institucional assistido na Carteira, sem criar intake,
miniapp ou ledger paralelo. O relato privado e a mensagem institucional são
objetos distintos.

As três políticas são explícitas e fail-closed:

- `health_minimal_v1`: categoria geral e apenas os campos de Saúde escolhidos
  pela pessoa;
- `education_minimal_v1`: categoria geral e apenas os campos de Educação
  escolhidos pela pessoa;
- `child_protection_channel_only_v1`: somente escolha e acompanhamento do
  canal, sem conteúdo da situação.

Nenhuma opção vem selecionada. Antes de preparar o package, a pessoa vê
“SERÁ COMPARTILHADO” e “NÃO SERÁ COMPARTILHADO” e confirma “Continuar para o
canal”. O preview gera uma autorização curta e assinada, vinculada à Carteira,
item, categoria e disclosure normalizado. Valores não selecionados são
descartados antes da assinatura e da persistência.

O relato original nunca é concatenado ao texto institucional. Foto,
localização privada, identidade da conta, protocolo COMUN, token e receipt não
entram no package, manifesto, tentativa, evento, URL ou card da Carteira. O
campo de mensagem começa vazio e aceita somente texto novo escrito para o
encaminhamento, até 1000 caracteres. Sinais evidentes de documento, contato ou
identificador sensível exigem revisão.

## Proteção de crianças e adolescentes

`child_protection` opera estritamente em `CHANNEL_ONLY`. O package usa apenas o
marcador técnico interno:

“Conteúdo será informado diretamente pela pessoa ao canal.”

Não existe botão para copiar mensagem. Texto, resumo, subtipo, escola, nome,
endereço, localização e foto não são incluídos. Acompanhamento registra somente
canal, `prepared`, declaração explícita de envio, protocolo informado pela
pessoa e um estado de retorno allowlisted. Nota livre de resposta não é aceita.

## Prepared não é sent

Abertura de site ou telefone ocorre somente por gesto e registra `prepared`.
O catálogo retorna destino sem query de mensagem. Somente “Sim, enviei” produz
`person_declared_sent`; nenhum submit externo é detectado ou inferido. O
protocolo oficial é opcional, manual, não verificado e separado do Protocolo
COMUN. `due_at` permanece `NULL` para `sensitive_service`; a regra de 72 horas
continua exclusiva de Ônibus/STMU.

## Retenção e retirada

O núcleo existente foi generalizado sem criar tabelas paralelas:

- `private.comun_forwarding_packages`;
- `private.comun_forwarding_attempts`;
- `private.comun_forwarding_events`.

Enquanto o acompanhamento está aberto, o package mantém somente o conteúdo
institucional aprovado. Na retirada, Saúde, Educação e Proteção recebem scrub
de assunto, texto, opções selecionadas, protocolo oficial e nota de resposta.
`content_withdrawn_at` é registrado e os eventos append-only permanecem apenas
com códigos de auditoria, sem conteúdo da situação.

## Migration e segurança

Foi promovida exatamente uma migration forward-only:

- `20260810194054_comun_sensitive_assisted_forwarding.sql`;
- SHA-256
  `483cac71e342a69f906dc702ae7e7e75efe23dc214d0dc3236b465d68b943c2d`;
- adiciona `source_domain='sensitive_service'`, policy/version, manifesto
  mínimo e timestamp de retirada de conteúdo;
- cria RPCs de contexto, preparação, listagem e resposta sensível;
- preserva wrappers P5/STMU e preparação P6A;
- reasserta execução service-role-only e mantém RLS/FORCE RLS;
- não cria tabela, não faz backfill, não reclassifica histórico e não lê
  conteúdo de relatos.

O preflight metadata-only `31435526208` e o E2E descartável final
`31436411640` ficaram verdes. O laboratório comprovou:

- disclosure mínimo de Saúde e Educação;
- Proteção channel-only;
- preview e autorização exatos;
- package idempotente;
- `prepared != sent`;
- protocolo e resposta somente manuais;
- retirada com scrub e eventos preservados;
- receipt/Carteira incorretos negados e categoria não forjável;
- zero vazamento das sentinelas de texto, foto, localização, identidade e
  unidade não selecionada;
- zero snapshot, coletivo, request externo e hard delete.

Resultados descartáveis:

`COMUN_P6C_C_SENSITIVE_DISCLOSURE_NO_LEAK_GREEN`

`COMUN_P6C_C_SENSITIVE_ASSISTED_FORWARDING_DISPOSABLE_E2E_GREEN`

## Canais oficiais

As fontes foram revalidadas em 10/08/2026 apenas por leitura de páginas
oficiais, sem ligação, mensagem, formulário ou ensaio operacional:

- Saúde municipal, Carta de Serviços 302:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/302/`;
- Saúde municipal, Carta de Serviços 572:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/572/`;
- SES-RJ:
  `https://www.rj.gov.br/saude/participacao-social`;
- OuvERJ: `https://www.rj.gov.br/ouverj/`;
- OuvSUS:
  `https://www.gov.br/saude/pt-br/canais-de-atendimento/ouvsus`;
- SME de Volta Redonda:
  `https://www.voltaredonda.rj.gov.br/administracao-municipal/administracao-direta/sme-secretaria-municipal-de-educacao/`;
- portal SME: `https://www.smevr.com.br/`;
- rede de Ouvidorias/SEEDUC-RJ:
  `https://cge.rj.gov.br/enderecos-horarios-contatos-rede-ouvidorias-transparencia/`;
- Conselho Tutelar:
  `https://conselhos.voltaredonda.rj.gov.br/conselhos/conselho-tutelar-do-municipio-de-volta-redonda-ct-i-e-ii`;
- Carta de Serviços municipal 21:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/21/`;
- Disque 100:
  `https://www.gov.br/mdh/pt-br/acesso-a-informacao/disque-100/disque-100`;
- PMERJ 190: `https://sepm.rj.gov.br/fale-conosco/`;
- SAMU 192:
  `https://www.gov.br/saude/pt-br/composicao/saes/samu-192`.

As fontes municipais de Saúde 302/572 continuam conflitantes e o destino fica
nulo. As fontes municipais do Conselho Tutelar também divergem e falham
fechadas. Os demais canais ativos estão `source_verified`, todos permanecem
`operationally_unchecked` e `automationAllowed=false`. O COMUN não promete
anonimato universal nem coleta identidade adicional; quando exigida, a pessoa
a informa diretamente no serviço institucional.

## PR, CI e Production

- PR funcional `#264`;
- head final exato `eded4abb47af433c9a1c7b7a05d0b22310a81b74`;
- merge exact-head `0b4e17dadf7ca3cd010e73da21191456c16f9b58`;
- 222 check-runs concluídos, zero falha e zero pendência;
- zero review thread bloqueante e Vercel Preview verde;
- unit, typecheck, lint, build, F1/F2, S1/S3, P3, P4, P5, P6A, P6B-A/B,
  P6C-A/B1/B2, Google Auth, Wallet, RLS/grants, Security, no-leak,
  accessibility, Core Journeys e Quality verdes.

Promoção flags-OFF `31438994969`:

- dry-run mostrou exatamente a migration P6C-C;
- migration aplicada sem `--include-all`, repair, reset ou seed;
- postflight metadata-only confirmou schema, funções, RLS/FORCE RLS, grants,
  P5 e P6A;
- deployment
  `https://comunvrabandonada-4r5rhxkko-alexandrevrabandonada-oss-projects.vercel.app`
  promovido ao domínio canônico;
- `/comun`, `/comun/relatar`, `/comun/calcadas`, `/comun/onibus` e
  `/comun/minha-participacao` responderam `200`.

Wave 1 `31439260082` ativou somente Saúde e Educação:

- deployment
  `https://comunvrabandonada-amoud1u8y-alexandrevrabandonada-oss-projects.vercel.app`;
- duas fixtures sintéticas privadas;
- packages e attempts somente `prepared`;
- zero declaração de envio e zero request externo;
- cleanup integral em `finally`.

Wave 2 `31439448933` ativou Proteção channel-only:

- deployment
  `https://comunvrabandonada-3236iiga0-alexandrevrabandonada-oss-projects.vercel.app`;
- uma fixture sintética privada e não gráfica;
- package channel-only sem conteúdo e attempt somente `prepared`;
- zero declaração de envio e zero request externo;
- cleanup integral em `finally`.

Ao final de cada onda:

- active synthetic reports/cases/wallet items/wallets: `0`;
- active sensitive packages/attempts: `0`;
- public snapshots/collectives: `0`;
- external requests: `0`;
- hard deletes: `0`.

## Estado final

`COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED=enabled`

`COMUN_CHILD_PROTECTION_CHANNEL_ONLY_ENABLED=enabled`

Conta, Google Auth, Carteira, Relata único, Capture First, fotos e localização
privadas, Calçadas, Ônibus/STMU, serviços essenciais, classificação ambiental,
classificação urbana, SUS privado, Educação privada e Proteção privada
permanecem ativos. Forwarding ambiental e urbano continuam OFF.

Auto-send, publicação automática, mapa público geral e coletivos permanecem
OFF. `launch_publicly=false`.

Resultado:

`COMUN_48_1B_P6C_C_SENSITIVE_ASSISTED_FORWARDING_DOMAIN_GREEN_NO_AUTO_SEND`.

Próximo macrobloco elegível: `48.2 — Observatórios`, começando pelo desenho
unificado. Nenhuma nova categoria de denúncia foi iniciada neste ciclo.
