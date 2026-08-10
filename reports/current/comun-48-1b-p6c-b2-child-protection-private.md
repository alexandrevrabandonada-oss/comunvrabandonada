# COMUN 48.1B-P6C-B2 — Proteção privada de crianças e adolescentes

Atualizado em 10/08/2026.

## Estado do piloto

48.1C não foi concluído nem reiniciado. A decisão de produto permanece:

`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

Nenhuma métrica humana foi declarada atingida. P6C-C não foi iniciado.

## Escopo entregue

O Relata único em `/comun/relatar` passou a reconhecer possíveis violações de
direitos, perigo ou necessidade de proteção de crianças e adolescentes pela
categoria canônica `child_protection`, sem miniapp ou intake paralelo.

O roteador composável `comun-child-protection-routing-v1` usa expressões
contextuais ou inequívocas, preservando reclamações administrativas em
`public_education` e relações de trabalho em `workplace`. Ele produz poucos
subtipos privados, pergunta opcional e tipada sobre perigo imediato e nunca
bloqueia Guardar. Um relato continua com um report, um case, um protocolo COMUN
e um item de Carteira.

Os contratos centrais foram comprovados:

- possível perigo imediato → `child_protection`, `emergency` e orientação de
  segurança sem afirmar acionamento;
- possível violação grave → `child_protection`, `urgent` e revisão humana;
- escola sem professor → `public_education`;
- bullying sem perigo imediato ou violação grave → `public_education` com
  proteção alta;
- professor sem salário → `workplace`;
- texto desconhecido e foto-only continuam guardáveis como `other`;
- foto-only preserva `original_text=NULL`, sem visão computacional ou
  inferência de proteção.

## Privacidade, Carteira e boundary interna

Todo `child_protection` exige `privacyClass=high_risk`, publicação
`never_automatic` e `requiresHumanReview=true`. A projeção pública rejeita a
categoria e não cria snapshot, mapa, busca pública, observatório, coletivo ou
confirmação comunitária.

A Carteira mostra somente a categoria humana “Proteção de criança ou
adolescente”, o estado “Guardado com proteção reforçada”, a mensagem de que o
registro não será publicado e um próximo passo sanitizado conforme perigo
imediato. Subtipo, texto, criança, escola, localização, foto, documento e
detalhes do risco não são expostos.

A auditoria das superfícies internas confirmou que a tela administrativa ampla
vigente consulta apenas o pipeline histórico `comun_reports`; ela não recebeu
acesso aos relatos canônicos em `private.comun_relata_reports`. As tabelas
canônicas continuam sob RLS/FORCE RLS e execução service-role-only. Nenhuma
superfície pública, editorial genérica, comunitária ou de moderador comum passou
a ler conteúdo `high_risk`. Portanto não foi acionado o blocker
`COMUN_P6C_B2_BLOCKED_HIGH_RISK_REVIEW_BOUNDARY`.

## Migration e transição no mesmo protocolo

Foi promovida exatamente uma migration forward-only:

- `20260810171448_comun_child_protection_private_routing.sql`;
- SHA-256
  `92fb622d38ddf259d91529aecd52f07e52d34132b5ae7601c4799feaede7282b`;
- adiciona `child_protection` às constraints e allowlists necessárias;
- aceita somente `comun-child-protection-routing-v1` com subtipo allowlisted,
  `high_risk`, publicação `never_automatic` e revisão humana;
- permite apenas as transitions server-routed `other` ou `public_education` →
  `child_protection` após novo texto semântico;
- preserva report, case, protocolo, Carteira e a fala anterior;
- registra evento append-only; o antigo gate exclusivo de foto-only foi
  removido, mantendo coluna `NOT NULL`, RLS/FORCE RLS e trigger append-only;
- reasserta grants service-role-only;
- não cria tabela, fila, adapter, package, source domain, mapa, snapshot,
  coletivo ou backfill e não reclassifica histórico.

O preflight remoto `31415876505` leu somente metadata/schema e comprovou o
plano exato de uma migration:

`COMUN_P6C_B2_REMOTE_PLAN_EXACT_ONE`.

O preflight de regressão educacional `31415876632` também ficou verde com o
baseline B1 preservado. Não foram usados `--include-all`, migration repair,
reset ou seed, e nenhum conteúdo de relato foi lido.

## Canais oficiais informativos

As fontes foram revalidadas em 10/08/2026 somente por leitura de páginas
oficiais, sem ligação, mensagem, formulário ou teste operacional:

- Conselho Tutelar de Volta Redonda:
  `https://conselhos.voltaredonda.rj.gov.br/conselhos/conselho-tutelar-do-municipio-de-volta-redonda-ct-i-e-ii`;
- Carta de Serviços municipal 21:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/21/`;
- Disque Direitos Humanos — Disque 100:
  `https://www.gov.br/mdh/pt-br/acesso-a-informacao/disque-100/disque-100`;
- Polícia Militar do Estado do Rio de Janeiro — 190:
  `https://sepm.rj.gov.br/fale-conosco/`;
- SAMU 192:
  `https://www.gov.br/saude/pt-br/composicao/saes/samu-192`.

As duas fontes municipais publicam contatos divergentes para o Conselho
Tutelar. O catálogo registra `source_conflict`, mantém o destino nulo e não
escolhe um telefone silenciosamente. Disque 100, PMERJ e SAMU estão
`source_verified`; todos os canais permanecem `operationally_unchecked` e
`automationAllowed=false`.

Os canais são apenas informativos. O COMUN não cria package, não copia texto,
foto ou localização, não abre chamada automaticamente, não registra
`prepared`/`sent` e não afirma que uma denúncia foi realizada.

## Verificação e merge funcional

- PR funcional `#262`;
- head final exato `0527f9a1281a765afb00c49bfeb6355dc9ed5166`;
- merge exact-head `7fc5de4ea36fcd212a95b3ee2b236e66488b2655`;
- 38 checks verdes, zero falha, zero pendência e zero review thread;
- Vercel Preview `SUCCESS`;
- unitários, typecheck, lint, build, F1, F2, S1, S3, P3, P4, P5, P6A,
  P6B-A, P6B-B, P6C-A, P6C-B1, Google Auth, Wallet, RLS/grants,
  Security, no-leak, accessibility, Core Journeys e Quality verdes;
- E2E descartável `31415876592`:
  `COMUN_P6C_B2_CHILD_PROTECTION_PRIVATE_DISPOSABLE_E2E_GREEN`.

O E2E comprovou os cenários não gráficos do escopo, pergunta não bloqueante,
privacy absoluta, foto-only sem inferência, transition de foto e Educação no
mesmo protocolo, categoria não forjável, receipt inválido negado, outra
Carteira isolada, zero forwarding/request externo/snapshot/coletivo/hard
delete e artifact sem credenciais descartáveis.

## Production

O exact main `7fc5de4ea36fcd212a95b3ee2b236e66488b2655` foi promovido no run
`31419481470`. A migration, o postflight read-only e o deploy com as duas flags
OFF passaram. O deployment intermediário ficou READY:

`dpl_7NVmPMGbYe8EBeC6xH3jzTwQgY1y`.

Em seguida, a onda privada `31419755484` ativou somente:

`COMUN_CHILD_PROTECTION_PRIVATE_ROUTING_ENABLED=enabled`.

Permaneceu forçado a `disabled`:

`COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED`.

O deployment final `dpl_8rfmUtHn9q39fzJneSf31JGrdRAe` ficou READY e foi
promovido a `https://comunsocial.online`. As rotas `/comun`,
`/comun/relatar`, `/comun/calcadas`, `/comun/onibus` e
`/comun/minha-participacao` responderam `200`.

O smoke Production usou duas fixtures privadas, sintéticas e não gráficas,
sem criança, pessoa, instituição vinculada, nome, endereço, documento, foto ou
localização real. O cleanup em `finally` comprovou:

- active synthetic reports/cases/wallet items/wallets: `0`;
- active packages/attempts: `0`;
- public snapshots e collectives: `0`;
- external sends e external requests: `0`;
- hard deletes: `0`.

Não houve ligação, WhatsApp, e-mail, submit, auto-send ou publicação. Mapa
público geral, coletivos e `launch_publicly=false` permanecem inalterados.

Resultado arquitetural:

`COMUN_P6C_B2_CHILD_PROTECTION_FORWARDING_DEFERRED_EXPLICIT_CONSENT_REQUIRED`.

## Resultado

`COMUN_48_1B_P6C_B2_CHILD_PROTECTION_PRIVATE_DOMAIN_GREEN_FORWARDING_OFF`.

Próximo tijolo elegível: `48.1B-P6C-C — encaminhamento assistido sensível`.
P6C-C não foi iniciado neste ciclo.
