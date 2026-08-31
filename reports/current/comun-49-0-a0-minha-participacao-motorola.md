# COMUN 49.0-A0 — Minha participação Motorola

## Resultado

`/comun/minha-participacao` passou a responder primeiro “o que precisa de mim agora?”, preservando Participation Wallet, Personal Center, resolvers e painéis especializados existentes.

- parent canônico: `c6c88c847a4c16716a9ab9013857406e9dd14f5f`
- branch: `codex/49-0-a0-minha-participacao-motorola`
- backendChanged=false
- walletContractChanged=false
- routingChanged=false
- attentionFirst=true
- singlePrimaryAction=true
- recordsUnifiedAtEntry=true
- accountConfigurationSecondary=true
- legacyProtocolSecondary=true
- archiveActionSecondary=true
- recoveryOneTimePriorityPreserved=true
- emergencyPriorityPreserved=true
- relataMotorolaPreserved=true

## Baseline auditado

No painel anterior, o cabeçalho próprio da carteira e o bloco “Conta e Carteira” apareciam antes do primeiro registro no estado autenticado. Recovery, quando recém-gerado, acrescentava um terceiro bloco. Os registros eram separados em quatro grupos (“Meus relatos”, “Observações”, “Casos acompanhados” e “Protocolos acompanhados”), e cada card mostrava de saída protocolo, arquivamento/retirada, próximo passo, explicação de encaminhamento e painel especializado.

Baseline de código:

- blocos permanentes antes do primeiro registro autenticado: 2;
- configuração antes do primeiro registro: sim;
- ação administrativa visível antes/dentro do primeiro registro: sim;
- protocolo legado na jornada principal: sim;
- linguagem interna encontrada nos painéis/explicações: referências a experiência/contrato especializado possíveis no conteúdo expandido.

## Regra de continuidade

A apresentação usa somente sinais existentes. A ordenação conservadora é:

1. `immediateDanger`, urgência `urgent`/`emergency` ou categoria `child_protection`;
2. `action_required` ou próximo passo produzido por `resolveWalletRelataAction`;
3. `updated_at` descendente.

Não há score, ranking comportamental, inbox paralelo nem novo modelo de prioridade. A atenção do Personal Center participa do mesmo bloco e só vira destaque quando nenhum registro wallet tem ação mais prioritária.

## Superfície final

- cabeçalho: “Minha participação” / “Continue de onde parou”;
- “Precisa de você” mostra um único destaque ou “Nada precisa da sua atenção agora.”;
- itens adicionais viram resumo/link;
- “Meus registros” é uma lista única, compacta e cronológica por continuidade;
- detalhes, protocolo, encaminhamento e painéis especializados abrem sob demanda;
- “Arquivar ou retirar” fica dentro de “Opções do registro” e mantém confirmação;
- “Tenho um protocolo antigo” e “Conta e recuperação” são disclosures secundários;
- recovery code recém-criado permanece imediatamente visível;
- segurança imediata e proteção infantil vencem a hierarquia normal com sinais já existentes.

## Matriz local/mockada

Cobertura determinística sem banco e sem conteúdo Production:

- carteira vazia e recovery recém-gerado;
- relato normal de Calçada;
- Educação com `action_required`;
- três registros com uma atenção;
- múltiplas atenções;
- estado aguardando retorno;
- saúde sensível;
- proteção infantil com perigo imediato;
- protocolo legado acessível;
- vínculo de conta preservado no mesmo contrato/componente;
- arquivar/retirar acessível somente como opção secundária.

## UX e acessibilidade

- mobile390x844=true
- desktop768x1024=true
- primaryActionsAboveFold=1
- technicalLabelsAboveFold=0
- accountConfigurationAboveFirstRecord=false
- legacyProtocolAboveFirstRecord=false
- nextActionVisibleWithoutOpeningDetails=true
- recoveryExceptionPreserved=true
- keyboardFocusAfterContinue=true
- ariaExpanded=true
- ariaControls=true
- ariaLive=true
- minimumControlHeight44px=true

Playwright mockado: 10/10 GREEN em 390x844 e 768x1024; rodada final móvel: 5/5 GREEN. Axe não encontrou violações critical/serious no cenário coberto.

O Browser integrado não inicializou porque o runtime local não encontrou o caminho de seus arquivos internos. O fallback Playwright era explicitamente requerido por este tijolo. Screenshots foram inspecionados em resolução original; após a inspeção, foi corrigido um detalhe que deixava conteúdo expandido por CSS apesar de `hidden`.

## Infraestrutura local

- system CA attempt: executada com `NODE_OPTIONS=--use-system-ca`;
- TLS verification disabled=false;
- localE2EInfrastructureBlocked=true;
- causa final: Docker/Supabase local indisponível, antes de qualquer conexão TLS;
- validação substituta: servidor Next local + mocks de rede com DTOs wallet existentes;
- Production writes: nenhum.

## Gates

- `npm run test:unit`: 1294 GREEN;
- `npm run typecheck`: GREEN;
- `npm run lint`: GREEN;
- `npm run build`: GREEN;
- `git diff --check`: GREEN;
- wallet focal/mobile/desktop/a11y/keyboard: GREEN.

## Accounting

- ProductionSchemaWrites=0
- ProductionEnvWrites=0
- ProductionBusinessWrites=0
- Migrations=0
- publicMap=false
- COST01=preserved
- COST02=preserved
- COST03=preserved
- COST04=preserved
- A1/A2 iniciado=false

`COMUN_49_0_A0_MINHA_PARTICIPACAO_MOTOROLA_GREEN`
