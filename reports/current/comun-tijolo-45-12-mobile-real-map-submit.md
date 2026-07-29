# Tijolo 45.12 — mapa real e envio mobile observável

Resultado: `COMUN_SIDEWALK_MOBILE_REAL_MAP_AND_SUBMIT_UI_GREEN_NO_WRITE`

- cycle ID: `sidewalk-mobile-real-map-submit-fix-20260729-12`;
- domínio canônico observado: `comunsocial.online`;
- SHA inicial: `c575e3c04d069a5d3a31255ef8058f0d01ed6ef6`;
- PR funcional: #80;
- SHA candidato: `52e1b02553825442fd9d72841e50d32bb3989319`;
- merge: `ff7b399be2d199859da1b80dc051f6d20c78db1d`;
- deployment Production: `5664014950`, `READY`;
- gate dedicado: run `30485526852`, verde.

## Causas e correção

O formulário anterior desenhava um SVG procedural independente do renderer
MapLibre/PMTiles real. A PR #79 substituiu esse desenho pelo mapa real e tornou
o desafio hCaptcha visível. A PR #80 consolidou o mesmo style cartográfico
entre mapa público e seletor, adicionou evidência explícita da fonte PMTiles e
da camada viária e completou os nove estados observáveis do envio.

O pipeline agora publica `idle`, `validating`, `checking_captcha`,
`creating_private_session`, `authorizing_upload`, `uploading_photo`,
`confirming_record`, `success` e `recoverable_error`. O botão fica bloqueado
durante processamento, a mensagem usa `aria-live`, erros preservam o formulário
e não existe retry automático.

## Auditoria mobile read-only

A matriz em `360x800`, `390x844` e `412x915` passou em produção. Ela:

- carregou canvas MapLibre, PMTiles com Range e camada `roads`;
- mostrou ruas reais, atribuição OpenStreetMap/IBGE e marcador ajustável;
- habilitou o botão após completar os requisitos apenas no navegador;
- interceptou e bloqueou todos os métodos mutáveis;
- validou a fase `checking_captcha` e o diálogo mobile acima do conteúdo;
- produziu screenshots sem enviar token, criar sessão, upload ou contribuição;
- encontrou zero erro de console.

Duas execuções read-only iniciais expuseram apenas seletores ambíguos no próprio
teste (a mensagem aparece corretamente no botão e no `aria-live`). O locator foi
ancorado nos atributos semânticos e a terceira execução passou 3/3. Nenhuma das
execuções iniciou uma requisição mutável.

## Estado operacional preservado

- flag: `enabled`;
- runtime: `OPERATIONAL_READY`;
- estado público: `active`;
- usuários anônimos criados: `0`;
- tentativa de submissão: `0`;
- banco: `none`;
- Storage: `none`;
- migration: não executada;
- ativação: não executada;
- activation attempt 03: não reutilizado.

Próximo passo: a pessoa usuária pode realizar o uso normal da funcionalidade,
resolvendo manualmente o CAPTCHA e fornecendo a fotografia. Depois de uma
contribuição manual, deve ocorrer auditoria read-only de banco, Storage,
moderação, privacidade e duplicidade.
