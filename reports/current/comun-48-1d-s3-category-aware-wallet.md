# COMUN 48.1D-S3 — Carteira orientada pela categoria

Atualizado em 10/08/2026.

## Resultado técnico

- finding de origem: `MOTOROLA-P1-003` / `WRONG_INSTITUTIONAL_FORWARDING_FALLBACK`;
- PR funcional: `#251`;
- head funcional exato: `ef577fdd75396dc50c4cd0a7931b53a9a5c202b0`;
- merge exact-head: `357c85100958f2cbe1b9b6a6ca9eb9c9a2b1ca02`;
- migrations S3: `0`;
- plano remoto reconciliado: `[]`;
- conteúdo de relatos Production lido: `0`;
- fixtures ou novas escritas Production: `0`;
- requests/envios institucionais: `0`;
- hard deletes: `0`.

O resolver único `resolveWalletRelataAction` escolhe a apresentação e a ação da
Carteira por categoria, metadata comprovada e flags. As únicas rotas de ação
são `bus`, `essential_service`, `sidewalk` e `no_verified_forwarding`. Categoria
desconhecida falha fechada, sem adapter, canal ou botão de envio.

## Contrato por categoria

- `public_transport`: somente STMU assistida ou o fallback multicanal STMU
  explicitamente habilitado;
- `water_supply`, `power_distribution` e `public_lighting`: somente o painel de
  serviços essenciais quando suas flags permitem;
- `sidewalk_accessibility`: estado de Calçadas, sem Fiscaliza VR, STMU ou painel
  de serviços essenciais;
- demais categorias canônicas: registro guardado e nenhum forwarding não
  verificado;
- categoria desconhecida: “Categoria em revisão”, sem ação institucional.

O `ComunForwardingPanel` ficou marcado como adapter legado específico de
`vr-fiscaliza-lighting-v1` e foi removido da Carteira canônica. Ele não é mais
fallback de qualquer categoria.

Os labels técnicos foram substituídos pelo mapa canônico de linguagem humana.
O protocolo continua mascarado. O bloco duplicado “Precisa de você” foi
removido: cada item aparece uma vez em “Meus relatos”, com próximo passo
específico somente quando há evidência suficiente.

## Calçadas

Para a fixture exata do finding — `relata_report`,
`category=sidewalk_accessibility`, `presentation_state=Guardado` e ação genérica
de informação — a Carteira mostra:

- “Calçada e acessibilidade”;
- estado de Calçadas;
- “Faltam informações para entrar no mapa”;
- ação de arquivar/retirar;
- zero Fiscaliza VR, `vr-fiscaliza-lighting-v1`, STMU ou Essential panel;
- um único card.

A Carteira não ganhou link de retomada inseguro. Enquanto a autorização por
item não puder provar que o receipt corrente pertence ao relato escolhido, a
capacidade fica registrada como:

`COMUN_WALLET_SIDEWALK_RESUME_CAPABILITY_PENDING`.

Nenhuma migration foi criada para contornar essa limitação.

## Verificação

- testes focais do resolver: `16/16`;
- unitários completos: `586/586`;
- typecheck, lint, journeys, coerência, surfaces e formatação: verdes;
- E2E Account/Wallet descartável e fixture S3 em cinco viewports: run
  `31348386321`, com
  `COMUN_48_1D_S3_SIDEWALK_WALLET_ROUTING_GREEN`;
- regressão P5/STMU: run `31348386320`, preservando `prepared != sent`;
- regressão P6A: run `31348386316`, preservando `prepared != sent`;
- Experience Coherence: run `31348386313`, tentativa 3 verde;
- Quality Performance: run `31348386309`, tentativa 2 verde;
- Core Journeys: run `31348386274` verde;
- Civic Intelligence: run `31348386302` verde;
- Full Surface, segurança, no-leak e acessibilidade: run `31348386297` verde;
- checks agregados da PR: `31` verdes, zero thread bloqueante;
- Vercel Preview: verde.

Os reruns foram necessários somente por respostas `502` no restart de stacks
Supabase descartáveis. Em todos os casos, a falha ocorreu antes do respectivo
contrato/E2E; os reruns em novo runner concluíram verdes. Nenhum patch de
produto foi aplicado para mascarar infraestrutura.

## Production

- deployment: `dpl_6kdi6MwdPdfUtxnJjTVuKfrsJG6w`;
- target/status: `production` / `READY`;
- commit do deployment: `357c85100958f2cbe1b9b6a6ca9eb9c9a2b1ca02`;
- alias canônico: `https://comunsocial.online`;
- scan de logs de erro após o deploy: `0`;
- smoke read-only:
  - `/comun` = `200`;
  - `/comun/relatar` = `200`;
  - `/comun/minha-participacao` = `200`;
  - `/comun/calcadas` = `200`;
  - `/comun/onibus` = `200`.

O smoke foi anônimo e sem cookie, formulário, fixture ou leitura de Carteira
privada. Auto-send, publicação automática e `launch_publicly` permanecem
desligados.

## Gate humano focal

O código e Production estão prontos para reencontrar o relato atual. O reteste
é feito pela própria pessoa na Carteira privada e registra apenas:

- registro encontrado: sim/não;
- categoria humana: correta/incorreta;
- Fiscaliza VR ausente: sim/não;
- próximo passo compreensível: sim/não.

Nenhum protocolo integral, receipt, conteúdo do relato ou identidade deve ser
registrado. Depois desse micro-gate, retomar `J1`, `J3` e `J7`. P6B permanece
proibido.
