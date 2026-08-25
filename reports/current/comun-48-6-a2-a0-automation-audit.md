# COMUN 48.6-A2-A0 — Auditoria real de automatizabilidade

Data da revisão: 25/08/2026 (America/Sao_Paulo)
Repositório: `alexandrevrabandonada-oss/comunvrabandonada`
Parent/main auditado: `bdff355e4d33191a81127e05b8082d6e9b70daae`
Produção: [comunsocial.online](https://comunsocial.online)

## Resultado terminal

`COMUN_48_6_A2_A0_AUTOMATION_AUDIT_GREEN_NO_SAFE_DIRECT_ADAPTER`

Não foi selecionado adapter direto neste tijolo. A auditoria encontrou
canais oficiais reais, mas nenhum reúne, hoje, autorização institucional,
contrato de produção, autenticação, idempotência, evidência de sucesso e
protocolo suficientes para permitir envio automático seguro pelo COMUN.

Isso não é um erro de cobertura: o contrato correto, por enquanto, é
encaminhamento assistido. O A1 continua sendo a autoridade operacional para
preparar o pacote, abrir o canal oficial e registrar `person_declared_sent`.
Nenhum formulário externo foi enviado, nenhuma ligação foi feita e nenhum
WhatsApp foi acionado durante esta auditoria.

## Escopo e invariantes

Este A2-A0 foi executado como `DIAG → VERIFY → REPORT`, sem alteração de
runtime, migration, env, catálogo, configuração Vercel ou dados de produção.

- `automationAllowed=false` permanece vigente em todos os catálogos e
  features auditados.
- `prepared != sent` permanece preservado.
- protocolo COMUN continua distinto do protocolo oficial do órgão.
- nenhum captcha foi resolvido, nenhum login externo foi realizado e nenhum
  mecanismo de terceiros foi preenchido automaticamente.
- `ProductionBusinessWrites=0`.
- `ProductionSchemaWrites=0`.
- `ProductionEnvWrites=0`.
- `externalOfficialSends=0`.
- `fixtures=0`, `publications=0`, `SearchWrites=0`.

O baseline A1 foi confirmado no relatório
`reports/current/comun-48-6-a1-multidomain-assisted-forwarding.md`: a
migration `20260825090000_comun_multidomain_assisted_forwarding.sql` está
registrada uma vez, o postflight foi GREEN e as superfícies
`/comun/denuncias`, `/comun/relatar` e `/comun/minha-participacao` respondem
HTTP 200 em leitura.

## Arquitetura factual reutilizada

O fluxo existente é:

```text
CAPTURA
  → /comun/relatar e Quick Capture
CLASSIFICAÇÃO
  → RelataCategory + perguntas adaptativas
ROTEAMENTO
  → projection/resolver do A1 e catálogos institucionais
CANAL
  → official-channels, institutional catalogs e canais especializados
ENVIO/DECLARAÇÃO
  → forwarding package/attempt, abertura manual do canal,
    person_declared_sent
PROTOCOLO
  → protocolo COMUN separado do protocolo oficial
RESPOSTA
  → registro de protocolo/resposta já existente
RESULTADO
  → follow-up e métricas existentes
MEMÓRIA COLETIVA
  → comun_reports, Case e projeções já existentes; agrupamento público
    permanece fora deste tijolo
```

Foram auditados, sem duplicação:

- `lib/comun-relata-contract.ts` e suas 18 categorias;
- `lib/official-channels.ts`;
- `lib/comun-relata-channels.ts`;
- `lib/server/comun-institutional-channel-catalog.ts`;
- catálogos especializados de Saúde, Educação, proteção infantil,
  ambiente, incidentes urbanos e civic forwarding;
- `lib/comun-forwarding-catalog.ts`;
- `lib/comun-forwarding-feature.ts` e features sensível/cívica;
- `lib/server/comun-a1-routing-resolver.ts`;
- packages/attempts, protocolos oficiais, resposta e a Carteira de
  Participação referenciados pelo A1.

Não foi criada tabela universal, fila, wallet, protocolo, case model,
forwarding engine, event bus, ontologia ou endpoint novo.

## Matriz de categorias e canais

`sourceVerified` significa que a fonte oficial foi localizada e lida nesta
auditoria. Não significa que o atendimento externo foi testado. Nenhum canal
foi marcado como `operationally_confirmed` porque isso exigiria uma operação
real, proibida neste tijolo.

| Categoria Relata | Primeiro caminho oficial projetado | Evidência oficial revisada | Classificação operacional | Decisão A2-A0 |
|---|---|---|---|---|
| `public_lighting` | Prefeitura/SMI; Fiscaliza VR quando acessível | [Carta de Serviços 158](https://servicos.voltaredonda.rj.gov.br/cartaServicos/158/), [Carta de Serviços 435](https://servicos.voltaredonda.rj.gov.br/cartaServicos/435/) | `ASSISTED_AUTH_REQUIRED`, estado `degraded` para o endpoint Fiscaliza observado | manter assistido; sem adapter |
| `power_distribution` | Light: call center, WhatsApp ou Agência Virtual | [Atendimento Light](https://www.light.com.br/SitePages/page-atendimento-light.aspx?v=1.1), [Agência Virtual](https://agenciavirtual.light.com.br/Portal/Atendimento.aspx) | `PHONE_ONLY`/`ASSISTED_AUTH_REQUIRED`; ouvidoria é escalada | não selecionar |
| `water_supply` | SAAE-VR, 115 ou atendimento presencial | [SAAE 115](https://www.saaevr.com.br/atendimento115.asp), [Carta de Serviços 523](https://servicos.voltaredonda.rj.gov.br/cartaServicos/523/) | `PHONE_ONLY` | não selecionar |
| `public_transport` | órgão municipal competente conforme catálogo vigente | fontes públicas sem formulário/protocolo de produção comprovado | `HUMAN_REVIEW_REQUIRED` | manter assistido/revisão |
| `electrical_hazard` | emergência/distribuidora conforme risco imediato | [Atendimento Light](https://www.light.com.br/SitePages/page-atendimento-light.aspx?v=1.1) | `EMERGENCY_ONLY` quando houver perigo; otherwise `PHONE_ONLY` | emergência fora de automação |
| `active_fire` | emergência imediata | canal emergencial, sem envio automatizado | `EMERGENCY_ONLY` | interromper burocracia; não automatizar |
| `smoke_or_environmental_trace` | órgão ambiental municipal/INEA/Ibama conforme competência | [INEA Ouvidoria](https://www.inea.rj.gov.br/ouvidoria/), [Denúncia ambiental Ibama](https://www.gov.br/ibama/pt-br/assuntos/fiscalizacao-e-protecao-ambiental/fiscalizacao-ambiental/denuncias) | `ASSISTED_CAPTCHA_OR_INTERACTIVE`/`HUMAN_REVIEW_REQUIRED` | não selecionar |
| `sidewalk_accessibility` | Prefeitura/Fiscaliza VR | [Carta de Serviços 435](https://servicos.voltaredonda.rj.gov.br/cartaServicos/435/) e catálogo municipal | `ASSISTED_AUTH_REQUIRED`, endpoint público não confirmado | manter assistido |
| `waste_or_debris` | limpeza/serviço municipal | [Carta de Serviços 147](https://servicos.voltaredonda.rj.gov.br/cartaServicos/147/) | `HUMAN_REVIEW_REQUIRED` | sem adapter |
| `public_health` | OuvSUS; gestão municipal/estadual conforme o caso | [OuvSUS](https://www.gov.br/saude/pt-br/canais-de-atendimento/ouvsus), [FAQ OuvSUS](https://www.gov.br/saude/pt-br/canais-de-atendimento/ouvsus/faq/faq), [OuvSUS municipal](https://servicos.voltaredonda.rj.gov.br/cartaServicos/302/) | `ASSISTED_AUTH_REQUIRED`/`ASSISTED_CAPTCHA_OR_INTERACTIVE` | sem auto-envio; dados sensíveis exigem revisão |
| `public_education` | SME ou Secretaria estadual conforme a escola | [SME Volta Redonda](https://www.voltaredonda.rj.gov.br/administracao-municipal/administracao-direta/sme-secretaria-municipal-de-educacao/), [Inspeção Escolar RJ](https://www.inspecaoescolar.educacao.rj.gov.br/fale-conosco) | `HUMAN_REVIEW_REQUIRED`/`ASSISTED_AUTH_REQUIRED` | sem adapter |
| `child_protection` | Conselho Tutelar/Disque 100; emergência se perigo atual | [Carta Conselho Tutelar](https://servicos.voltaredonda.rj.gov.br/cartaServicos/21/), [Disque 100](https://www.gov.br/mdh/pt-br/assuntos/noticias/2026/defeso-eleitoral/julho/violencia-contra-criancas-e-adolescentes-denunciar-e-um-ato-de-protecao) | `PHONE_ONLY`/`EMERGENCY_ONLY` | channel-only; P6C preservado |
| `workplace` | MTE/MPT conforme competência e natureza | [Denúncia trabalhista](https://denuncia.sit.trabalho.gov.br/home), [Ouvidoria MPT](https://mpt.mp.br/ouvidoria/) | `ASSISTED_AUTH_REQUIRED`/`ESCALATION_ONLY` | sem adapter |
| `environmental_pollution` | órgão municipal, INEA, Ibama ou Linha Verde conforme competência | [INEA](https://www.inea.rj.gov.br/ouvidoria/), [Ibama/Linha Verde](https://www.gov.br/ibama/pt-br/assuntos/notas/2022/fale-com-o-ibama-pelo-linha-verde) | `ASSISTED_CAPTCHA_OR_INTERACTIVE`/`HUMAN_REVIEW_REQUIRED` | sem adapter |
| `urban_flooding` | Defesa Civil/órgão municipal; emergência quando houver risco | catálogo de incidentes urbanos e fontes municipais | `EMERGENCY_ONLY` quando houver risco; otherwise `HUMAN_REVIEW_REQUIRED` | não automatizar |
| `stormwater_drainage` | serviço municipal de drenagem | [Carta de Serviços municipal](https://servicos.voltaredonda.rj.gov.br/cartaServicos/162/) | `HUMAN_REVIEW_REQUIRED` | sem adapter |
| `tree_hazard` | Prefeitura/Defesa Civil; emergência se queda iminente | [Carta de Serviços 143](https://servicos.voltaredonda.rj.gov.br/cartaServicos/143/), [Carta de Serviços 196](https://servicos.voltaredonda.rj.gov.br/cartaServicos/196/) | `EMERGENCY_ONLY` se iminente; `ASSISTED_AUTH_REQUIRED` otherwise | manter assistido |
| `other` | revisão humana e descoberta de competência | não há justificativa para palpite automático | `UNKNOWN_NOT_SAFE` | fail-closed |

## Cadeias de escalada verificadas

### Energia

A ANEEL documenta a ordem: distribuidora → ouvidoria da distribuidora com
protocolo anterior → ANEEL. A fonte é
[Reclame da distribuidora](https://www.gov.br/aneel/pt-br/canais_atendimento/reclame-da-distribuidora).
O COMUN não deve exibir ANEEL como primeiro passo para falta de energia.

### Saúde

OuvSUS oferece canais públicos, mas a rastreabilidade depende de protocolo e
chave; manifestação anônima não recebe acompanhamento final. A diferença
está documentada no [FAQ oficial do OuvSUS](https://www.gov.br/saude/pt-br/canais-de-atendimento/ouvsus/faq/faq).
O catálogo municipal possui conflito de encaminhamento e, portanto, não é
base para auto-seleção sem revisão.

### Ambiente

INEA e Ibama possuem ouvidoria/denúncia, mas as fontes públicas não
comprovam, para este projeto, um contrato de produção estável com campos,
idempotência e evidência de protocolo. A rota permanece assistida.

### Educação, trabalho e proteção infantil

Os caminhos dependem de esfera, contexto ou risco. Conselho Tutelar,
Disque 100 e emergência nunca devem ser tratados como um POST genérico. MTE
exige login GOV.BR no caminho observado; MPT é escalada específica, não
default.

## Candidato técnico examinado: Fala.BR

A [documentação oficial da API Fala.BR](https://falabr.cgu.gov.br/help) confirma
que existe uma API para registrar, consultar e tratar manifestações. A API
usa OAuth 2.0 e credenciais de sistema; a [política oficial de uso](https://wiki.cgu.gov.br/images/9/9f/Politica_de_uso_API_v202307.pdf)
exige autorização do administrador Fala.BR. A documentação também indica que
o sistema receptor gera identificador/NUP e que o integrador precisa
correlacionar essa resposta.

Isso torna Fala.BR uma capacidade técnica potencial, mas não um adapter
selecionável agora. Faltam, dentro do contrato autorizado do COMUN:

- autorização institucional de produção;
- `client_id`, segredo e usuário de sistema provisionados pelo órgão;
- confirmação de quais categorias e esferas o destinatário aceita;
- contrato de campos, anexos, dados pessoais e retenção;
- consentimento explícito para enviar dados em nome da pessoa;
- idempotency key e reconciliação para timeout após criação;
- prova de resposta, protocolo/NUP e consulta posterior;
- política para manifestação anônima versus rastreável;
- kill switch, auditoria e tratamento de falha parcial.

Decisão: `transport=DIRECT_API_OFFICIAL`, `comunReadiness=HUMAN_REVIEW_REQUIRED`,
`selected=false`. Não há endpoint do COMUN, não há segredo salvo, não há
flag e não há mutation.

## Por que os demais canais não são adapters seguros

- Fiscaliza VR documenta cadastro, protocolo e acompanhamento, mas o endpoint
  público observado estava sem resolução DNS; não há base para assumir que o
  fluxo atual está operacional.
- Agência Virtual Light exige conta/identificação e senha; o formulário
  público observado usa estado ASP.NET/anti-CSRF e não oferece contrato de
  protocolo de reclamação adequado para um POST cego.
- SAAE expõe telefone e atendimento presencial, sem API/formulário público
  estável para este uso.
- Saúde, proteção infantil e trabalho envolvem dados sensíveis, login,
  captcha, risco ou acompanhamento que não pode ser inferido de uma página
  GET.
- Ambiente, drenagem, lixo e transporte têm referências oficiais, mas não
  contrato técnico público suficiente para garantir sucesso, idempotência ou
  resposta.

Abrir uma página, copiar um link ou preparar um pacote não é prova de envio.

## Privacy, consentimento e dados

O COMUN deve continuar pedindo somente o contexto necessário para ajudar a
pessoa. CPF, senha, matrícula, unidade consumidora, prontuário, credenciais
de concessionária e documentos destinados ao órgão devem ser fornecidos
diretamente ao canal oficial, salvo contrato futuro específico e consentido.

Saúde mantém o limite de não armazenar prontuário ou diagnóstico identificável
desnecessário. Proteção infantil mantém os gates P6C. Endereço exato não deve
ser projetado em mapa público. Nenhum mapa ou agrupamento público foi ativado.

## Contrato futuro mínimo, se houver autorização

Antes de qualquer A2-A1, um adapter candidato precisaria demonstrar, em
ambiente autorizado e descartável:

1. autorização do órgão e credenciais escopadas;
2. payload/termos/campos documentados;
3. consentimento e política de dados;
4. idempotency key determinística por attempt;
5. sucesso inequívoco com protocolo oficial;
6. reconciliação de timeout/duplicidade;
7. consulta de status e resposta;
8. logs sem segredos ou dados desnecessários;
9. kill switch e `automationAllowed` independente;
10. prova de que a falha não aparece como enviado.

Sem esses elementos, o único comportamento correto é assisted-only.

## Verificação executada

Foram feitas apenas leituras de código, Git e GET/HEAD de páginas públicas
oficiais. As URLs públicas de produção e as superfícies canônicas responderam
sem que qualquer ação de negócio fosse executada. Não houve POST externo,
criação de protocolo, ligação, WhatsApp, login de terceiro, upload, fixture,
alteração de banco ou alteração de catálogo.

## Decisão e próximos limites

Este A2-A0 fecha a auditoria com cobertura factual e sem adapter seguro
selecionado. O próximo passo autorizado, se solicitado, é um tijolo de
autorização/contrato para uma única integração oficial — não implementação
automática genérica.

Não iniciar A2-A1 ou A3 neste run.
