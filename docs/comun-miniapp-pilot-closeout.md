# Encerramento do piloto territorial das Calçadas

## Fronteira

O piloto `calcadas-vr-piloto-01` termina em
`2026-08-06T03:00:00.000Z`. Até esse instante, o relatório diário é somente
leitura e o domínio `miniapps` permanece `in_progress`.

Nenhuma passagem de tempo promove o domínio automaticamente. O workflow gera
evidência sanitizada; uma eventual promoção exige PR revisada, checks verdes e
amostra real suficiente.

## Procedimento

1. Executar `COMUN Sidewalk Pilot` no SHA atual da `main`.
2. Preservar JSON e Markdown do artifact.
3. Confirmar janela, metas e denominadores originais.
4. Classificar mobilização, produto, técnica, operação, privacidade e ação
   pública externa separadamente.
5. Medir participantes, uploads, registros, publicação, SLA, fila, territórios,
   retorno, fotos, órfãos, vínculos políticos, verificações, resoluções,
   reaberturas e incidentes P0/P1/P2.
6. Confirmar que IDs, coordenadas, identidades, object keys, textos privados e
   originais não entraram no artifact.
7. Atualizar somente a issue agregadora do piloto.
8. Promover `miniapps` apenas se o relatório indicar
   `green_evidence_complete` e a evidência cumulativa atender ao programa.

## Resultados

O relatório e o painel exigem contagem exata compatível com as linhas recebidas.
As fotos são consultadas somente para os registros da janela original. Se a
API truncar uma consulta ou omitir a contagem, o cálculo bloqueia com
`SIDEWALK_PILOT_SAMPLE_INCOMPLETE`; não usar o último artifact como prova de uma
nova execução bem-sucedida. Os limites de leitura continuam vigentes e podem
exigir um trabalho separado de paginação quando a amostra crescer.

A confirmação de completude vale por consulta. As leituras de tabelas distintas
não formam um snapshot transacional; o envelope declara essa limitação. Isso
não comprova amostra real suficiente, revisão de campo ou recuperação durável.

- `eligible_for_closeout`: janela ainda ativa; procedimento pronto.
- `attention`: acompanhamento operacional necessário.
- `blocked`: janela fechada sem evidência real suficiente ou com blocker.
- `green_evidence_complete`: evidência suficiente para propor promoção por PR.

Baixa participação não é convertida em falha técnica. Resposta institucional
não é resolução, e resolução exige verificação de campo autorizada. Reabertura
preserva o histórico.

## Incidente

P0 ou P1 bloqueia promoção. O relatório não executa rollback, limpeza,
publicação ou correção automática. A equipe usa as superfícies protegidas do
cockpit e abre um tijolo focal para qualquer mudança de produto ou dados.

## Ensaio privado

A fixture de encerramento fica restrita a teste local em memória. Ela percorre
prioridade, ação, protocolo, resposta, verificação, resultado e memória sem
escrever na amostra real, banco ou Storage.
