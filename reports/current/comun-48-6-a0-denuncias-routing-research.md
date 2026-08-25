# 48.6-A0 — Denúncias e serviços públicos: pesquisa e rota unificada

Data da revisão: 25/08/2026. Baseline: `bc69e8c6c0bc7de8d119b43be129caaae6dbe779`.

## Arquitetura reutilizada

`QuickCaptureV2` em `/comun/relatar` captura o relato privado e aplica `routeRelata`; `comun_reports` conserva o relato/protocolo COMUN; a Carteira mantém o acompanhamento; os painéis e pacotes de encaminhamento existentes tratam os serviços essenciais; protocolos oficiais, tentativas e respostas continuam nas estruturas já existentes. Casos coletivos permanecem intactos e não foram ativados publicamente.

Fluxo factual: **captura → classificação → roteamento → canal → pacote/declaração de envio → protocolo oficial → resposta → resultado → memória coletiva**. O A0 acrescenta somente uma projeção em memória (`lib/server/comun-denuncias-routing-guide.ts`) e a porta `/comun/denuncias`; não há nova tabela, fila, protocolo, wallet, adapter de envio ou ontologia.

## Pesquisa institucional e matriz

Todos os canais visíveis vêm dos catálogos canônicos versionados. A pesquisa externa foi somente de fontes oficiais; os estados são `source_verified`/`operationally_unchecked` conforme catálogo, sem denúncia, ligação, WhatsApp ou formulário de teste.

| Categoria Relata | Primeiro caminho humano | Escalada / condição | Situação |
| --- | --- | --- | --- |
| public_lighting | Prefeitura/CAU 156 | Encaminhamento assistido existente | fonte oficial; operação não testada |
| power_distribution | Light | Light → Ouvidoria Light com protocolo → ANEEL | fonte oficial; nunca mostrar ANEEL primeiro |
| water_supply | SAAE-VR | Encaminhamento assistido existente | fonte oficial; operação não testada |
| public_transport | triagem humana | órgão depende da linha/competência | fallback explícito, sem palpite |
| electrical_hazard | emergência primeiro | registro COMUN só depois de segurança | canal de emergência, sem forwarding normal |
| active_fire | emergência 193 | registro só se seguro | emergência imediata |
| smoke_or_environmental_trace / environmental_pollution | canal ambiental canônico | escala somente se fonte determinar | fonte oficial; operação não testada |
| sidewalk_accessibility | fluxo Calçadas existente | revisão humana/territorial | sem mapa público novo |
| waste_or_debris | canal ambiental/municipal canônico | conforme origem institucional | fonte oficial |
| public_health | rede municipal/estadual + OuvSUS quando cabível | esfera incerta fica em revisão humana | dados clínicos não entram no COMUN |
| public_education | rede municipal/estadual canônica | esfera incerta fica em revisão humana | não expor dados de estudante |
| child_protection | proteção infantil canônica / emergência se perigo | não expor identificação | preserva os gates P6C |
| workplace | revisão humana | MPT apenas se competência confirmada | sem roteamento automático |
| urban_flooding / stormwater_drainage / tree_hazard | Defesa Civil/urbano conforme catálogo | emergência quando houver risco | fonte oficial; operação não testada |
| other | revisão humana | classificar sem inventar órgão | fail-closed |

Fontes externas rechecadas: [CAU/Prefeitura de Volta Redonda](https://www.voltaredonda.rj.gov.br/servicos/central-de-atendimento-unico/), [OuvSUS](https://www.gov.br/saude/pt-br/canais-de-atendimento/ouvsus), [sequência oficial da ANEEL](https://www.gov.br/aneel/pt-br/canais_atendimento/reclame-da-distribuidora) e [Disque 100](https://www.gov.br/mdh/pt-br/acesso-a-informacao/disque-100/disque-100). A ANEEL confirma a escada distribuidora → ouvidoria → ANEEL, com protocolos anteriores; a OuvSUS informa canais, sigilo e limites do acompanhamento de manifestação anônima.

## Decisões e limites operacionais

- `automationAllowed=false` para todos os caminhos. Abrir/preparar pacote não é envio; somente `person_declared_sent` e/ou evidência já prevista pelo contrato pode registrar envio externo.
- “Protocolo COMUN” é sempre distinto de “protocolo do órgão”. O guia pede que o segundo seja guardado e registrado depois, sem o chamar de protocolo oficial antes de existir.
- Emergência interrompe a burocracia: fogo ativo e risco elétrico instruem atendimento imediato; não há tentativa de integração externa nem fila.
- Saúde, infância, energia e saneamento conservam os avisos de privacidade: CPF, credenciais, unidade consumidora, prontuário e dados identificáveis seguem diretamente ao órgão quando necessários.
- Canais sem fonte/cobertura suficientemente específica permanecem como `requiresHumanReview`; fonte conflitante não é apresentada como certeza operacional.

## Cobertura e próximos gaps

O contrato de cobertura percorre as 18 categorias `RelataCategory`, exige ao menos um canal com URL oficial ou fallback humano explícito, exige caminho emergencial quando a decisão é emergencial e falha se automação for habilitada. Não há teste de atendimento externo, por segurança.

Gaps legítimos permanecem deliberadamente fora deste tijolo: adapter direto por instituição, prova operacional de cada canal, mapas públicos, agrupamento público de casos e autoenvio. Esses passos exigem contratos próprios de identificação, consentimento, idempotência, protocolo e tratamento de resposta.

## Efeito do A0

`/comun/denuncias` é uma porta semântica para o mesmo Relata, e a confirmação do relato passa a apresentar “Como resolver isso”: agora, onde encaminhar, o que pode precisar, protocolo e eventual escalada. Não houve schema, flags, produção, Search, coleções, publicação ou mutação externa.
