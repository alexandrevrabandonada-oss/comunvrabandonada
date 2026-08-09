# COMUN 48.1C — protocolo do piloto humano Motorola

Status: **PREPARED — NO HUMAN SESSIONS YET**.

Este protocolo prepara a observação humana no domínio real. Ele não inicia o
piloto, não recruta participantes, não conclui P1G, não publica conteúdo e não
altera `launch_publicly=false`.

## Pergunta central

> A pessoa consegue ir da intenção ao resultado sem precisar aprender o COMUN?

O observador acompanha descoberta, hesitação, decisões, tempo, abandono,
compreensão do resultado, reencontro e continuidade. A sessão não pergunta se
a pessoa “gostou do site”.

## Privacidade e identificação

- Usar somente `P01`, `P02`, `P03` etc. nas notas; o código nunca entra no
  produto.
- Não registrar nome, e-mail, telefone, endereço, bairro, idade exata, conta
  Google, `user_id`, protocolo, texto do relato, fotografia, coordenada, cookie,
  token, IP ou user agent bruto.
- Não gravar áudio ou vídeo por padrão. Notas manuais curtas e sanitizadas são
  suficientes.
- Buscar diversidade funcional: familiaridade maior ou menor com apps e uso
  prioritário de celular. Não registrar condição médica ou diagnóstico.

## Preparação da sessão

1. Confirmar que a sessão foi explicitamente autorizada e que o piloto está em
   `IN_PROGRESS`; na etapa PREP isso ainda é proibido.
2. Priorizar celular. Desktop pode ser comparação.
3. Escolher jornadas sem exigir que uma pessoa execute todas.
4. Para teste sintético, usar cena ou objeto neutro e explicar que nada será
   publicado ou encaminhado.
5. Iniciar o cronômetro quando a pessoa começa a tentar registrar. Encerrar em
   “Guardado no COMUN”. Não incluir conversa, instrução inicial ou debrief.

## Jornadas canônicas

### J1 — Relata livre

Instrução: “Você viu um problema na rua e quer registrar.” Não dizer onde
tocar. Sucesso: encontra o Relata, registra e entende que foi guardado.

### J2 — Foto First

Instrução: “Você viu algo errado e prefere fotografar em vez de escrever.”
Usar objeto neutro; não fotografar pessoa sem necessidade, residência, placa,
documento ou criança. Sucesso: foto → guardar → protocolo → Meus registros.

### J3 — Calçadas

Instrução: “Você encontrou uma calçada difícil de usar.” Sucesso mínimo:
registrar rapidamente. Observar se distingue registro guardado de entrada
completa na fila do mapa, sem explicar adapter ou revisão antes.

### J4 — Ônibus

Instrução: “Seu ônibus demorou muito para passar.” Sucesso: identifica Ônibus,
registra, recebe protocolo e encontra a possibilidade de encaminhamento. Não
exigir envio real à STMU.

### J5 — Água

Instrução: “Seu bairro está sem água desde ontem.” Sucesso: usa a porta única
`/comun/relatar`, chega a `water_supply`, guarda e pode perceber que o COMUN
sabe o caminho. Não mencionar SAAE na instrução.

### J6 — Luz ambígua

Instrução: “A rua está toda sem luz.” Esperado: uma única pergunta adaptativa
distingue casas sem energia de postes/luminárias. Não ensinar a diferença.

### J7 — Reencontrar

Depois de uma contribuição: “Agora imagine que você voltou amanhã. Onde
procuraria o que enviou?” Sucesso: Minha área/Meus registros, encontra o item,
entende o status e identifica o próximo passo.

## Micro-gate Google separado

Google Auth não entra nas sete jornadas iniciais. O gate P1G continua separado:
login Google, onboarding quando for a primeira vez, Minha Participação, logout,
segundo login sem onboarding repetido e segundo logout. Somente prova humana
real pode concluir P1G; PREP não inventa esse resultado.

## Regra de ajuda e think-aloud

O observador não ensina a interface. Pode pedir “Pode ir falando o que você
está procurando.” Se houver trava, primeiro observa; depois pergunta apenas “O
que você tentaria agora?”. Se ainda houver trava, oferece uma dica curta e
registra `completed_with_hint`.

## Métricas manuais

Meta de captura Relata: mediana menor que 30 segundos. Não declarar a meta
atingida antes de existir medição humana.

- `duration_bucket`: `under_15s`, `15_to_30s`, `31_to_60s`, `over_60s`;
- `interaction_band`: `0-3`, `4-6`, `7+`;
- `result`: `completed_without_help`, `completed_with_hint`, `abandoned`,
  `blocked_by_bug`;
- `comprehension`: `understood`, `partially_understood`,
  `did_not_understand`.

A telemetria existente continua limitada a `eventType`, `interactionCount`,
`durationBucket`, `category` e `errorCode` interno sanitizado. Não correlacionar
evento com conta e não ampliar o schema.

## Motorola score operacional

O score avalia o produto, nunca a pessoa. Por jornada, derivar dos campos
permitidos e marcar `pass`, `fail` ou `not_applicable`:

- A — intenção acessível imediatamente;
- B — captura sem ajuda;
- C — conclusão em até 30 segundos, quando aplicável;
- D — resultado compreendido;
- E — reencontro compreendido.

Não criar ranking de participantes.

## Findings

Cada achado usa: `ID`, `journey`, `severity`, `observation`, `expected`,
`frictionType`, `frequency`, `recommendedAction`.

Tipos: `discovery`, `decision`, `copy`, `navigation`, `form`,
`privacy_comprehension`, `status_comprehension`, `recovery`, `accessibility`,
`performance`, `bug`.

- P0: risco de privacidade, perda de dado ou ação externa indevida;
- P1: impede jornada principal;
- P2: causa ajuda ou abandono significativo;
- P3: incômodo ou melhoria.

Preferência estética isolada não é P0/P1. Performance percebida inclui câmera,
upload, geolocalização, troca de página, Meus registros e toques repetidos por
falta de feedback. Acessibilidade observa alvos, teclado, contraste, scroll,
zoom, orientação e mensagens de erro, sem perguntar condição médica.

## Encaminhamento e conteúdo

Em jornadas sintéticas, parar em `prepared`: não abrir canal externo e não
declarar “enviei”. Uma ocorrência real só segue para um serviço por decisão
voluntária, separada do teste. O conteúdo real nunca entra no relatório de UX;
registrar apenas “jornada realizada com ocorrência real”.

## Cobertura e saída

- Mínimo do primeiro ciclo: 3 participantes independentes completos; alvo: 5.
- Cada jornada deve ocorrer pelo menos uma vez no ciclo, distribuída entre as
  pessoas.
- Testar o shortcut PWA “Vi um problema” em pelo menos uma sessão posterior,
  sem incluir instalação na métrica principal.
- P0 interrompe a jornada afetada. P1 recorrente leva a patch focal 48.1D.
- O primeiro ciclo encerra com todas as jornadas cobertas, nenhum P0 aberto,
  nenhum P1 sem decisão, medição humana real e relatório agregado sanitizado.

Após o primeiro ciclo, 48.1D — Estabilização e Poda tem prioridade sobre P6B.
