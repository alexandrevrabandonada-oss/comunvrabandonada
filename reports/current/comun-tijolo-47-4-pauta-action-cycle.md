# Tijolo 47.4 — esteira política completa

Estado deste relatório: ciclo político integrado, comprovado remotamente e
ativado de forma escopada. O lançamento público integral permanece fechado.

## Base e diagnóstico

- PR #94 integrada por merge commit
  `881c3bda42ff0bea8c882d2735cc4584c8c86de5`.
- PR funcional: #96; merge
  `89f5e41ce95b76f78c01ec0068affd93ee81a41b`.
- SHA operacional final: `e9bd809324dce96875f2f4dc8b96fcd5a5fa4f18`.
- Hotfixes de promoção: PRs #97–#100, todos focais e fail-closed.
- Inventário remoto inicial: somente leitura; zero escrita.
- Ações Coletivas dos Tijolos 44–44.3: ausentes no remoto no diagnóstico.
- Pautas, contribuições, sínteses, rodas, protocolos, resultados, comunidades e
  Inbox: presentes e reutilizados.

## Decisão de arquitetura

Não foi criado outro sistema de mobilização. A migration aditiva acrescenta
somente decisão, ciclo e eventos, ligando:

`contribuição → moderação → roda → síntese → decisão → ação → tarefa → encaminhamento → protocolo → resposta → resultado → memória`.

As fontes canônicas e a matriz de lacunas estão em
`docs/comun-fluxo-pauta-acao.md`.

## Evidências locais

- máquina de estados: verde;
- matriz positiva e negativa: verde;
- idempotência e conflito de versão: verdes;
- schema completo em Supabase descartável: verde;
- 11 objetos esperados com RLS: verdes;
- Ações Coletivas — jornada do membro e memória administrativa: verdes;
- matriz RLS global: `RLS_MATRIX_OK`;
- ensaio autenticado privado: 12 transições verdes;
- transição negativa: bloqueada;
- atividade separada de resultado: comprovada;
- projeção pública por RLS: verde, sem nota privada;
- rollback transacional: concluído;
- linhas sintéticas após postflight: zero;
- protocolo externo real: não enviado;
- banco remoto e Storage remoto: zero escrita durante o diagnóstico.

## Evidências remotas

- migration aditiva: run `30563375786`;
- postflight: `APPLIED_EXACT`, quatro migrations, 11 objetos e 11 relações com
  RLS;
- preflight independente: run `30563542027`, `APPLIED_EXACT`, somente leitura;
- ensaio autenticado privado: run `30563635313`, 12 etapas verdes;
- protocolo e resposta: sintéticos e vinculados, sem envio externo;
- transição negativa: bloqueada;
- atividade concluída não resolveu automaticamente a pauta;
- rollback transacional: concluído, zero linhas sintéticas no postflight;
- ativação escopada: run `30563832909`;
- flag: `COMUN_COLLECTIVE_ACTIONS_V1=enabled`;
- Production e rotas `/`, `/comun`, `/comun/pautas`, `/comun/acoes` e
  `/comun/minha-participacao`: HTTP 200;
- conteúdo sintético nas superfícies públicas verificadas: ausente;
- auditoria agregada diária: run `30564142320`, zero findings e zero escrita.

Artifacts:

- `comun-pauta-action-cycle-migration-e9bd809324dce96875f2f4dc8b96fcd5a5fa4f18-30563375786`;
- `comun-pauta-action-cycle-preflight-e9bd809324dce96875f2f4dc8b96fcd5a5fa4f18-30563542027`;
- `comun-pauta-action-cycle-rehearsal-e9bd809324dce96875f2f4dc8b96fcd5a5fa4f18-30563635313`;
- `comun-pauta-action-cycle-audit-e9bd809324dce96875f2f4dc8b96fcd5a5fa4f18-30564142320`.

## Segurança operacional

Os modos permanecem separados:

- `preflight`: somente leitura;
- `migrate`: migrations aditivas exatas, após dry-run;
- `rehearse`: dados sintéticos privados em transação revertida;
- `activate`: exige ensaio verde do mesmo SHA e altera somente
  `COMUN_COLLECTIVE_ACTIONS_V1`.

O gate `launch_publicly` não faz parte deste tijolo.

Escritas remotas executadas: somente quatro migrations aditivas e a alteração
escopada da flag seguida do deployment normal. Storage: nenhuma. Envio a órgão
externo: nenhum. O ensaio foi integralmente revertido.

## Avaliação do processo

- objetivo, integração, segurança e evidência: verdes;
- quatro hotfixes focais foram necessários na promoção;
- os gates fail-closed evitaram replay da migration de Calçadas e qualquer
  plano vazio ou inesperado;
- maior retrabalho: contrato operacional da saída do Supabase CLI;
- melhoria: fixtures de workflow devem reproduzir stdout e stderr reais antes
  da primeira promoção;
- melhoria: cada migration aplicada por runner dedicado deve declarar como
  convive com o histórico da CLI;
- melhoria: artifact de failure deve preservar a classificação sanitizada do
  plano sem registrar conexão.

## Resultado

`COMUN_PAUTA_ACTION_CYCLE_GREEN`
