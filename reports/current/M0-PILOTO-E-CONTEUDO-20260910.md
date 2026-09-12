# Preparação operacional M0 — não executada com pessoas

Estado: **NOT_RUN** para sessões humanas, conteúdo real e publicação.
Este anexo preenche a preparação do ciclo existente; não cria um segundo gate.
Fontes canônicas: `docs/gates/COMUN_HUMAN_GATE.md`, `docs/comun-piloto-calcadas.md`,
`docs/comun-miniapp-pilot-closeout.md`, `docs/comun-cultural-deliverability.md` e
os templates existentes de escala/plantão. A janela `calcadas-vr-piloto-01`
terminou em 06/08/2026; não foi reaberta. O closeout encontrado contém amostra
zero e `COMUN_MINIAPPS_READY_FOR_PILOT_CLOSEOUT`, não conclusão operacional.

## Antes das três sessões do gate existente

- Ambiente previamente aprovado para esse uso; o laboratório técnico só recebe
  fixtures. Não usar Production ou Preview para resolver indisponibilidade local.
- Responsável operacional e substituto: **a designar pelo responsável pelo produto**.
  Confirmar ambos nos templates de escala/plantão já existentes. Não inventar nomes.
- Moderador: conferir fila, permissões, devolutiva e retirada usando as telas
  canônicas. Substituto deve conseguir retomar pela mesma fila e histórico.
  Necessidade de SQL manual, ausência de autorização ou falta de devolutiva é lacuna.
- Observador: solicitar consentimento; não orientar cliques, completar respostas
  nem transformar silêncio em aprovação. Interrupção e recusa são permitidas.
- Não registrar nomes completos, contatos, credenciais, fotos pessoais ou coordenadas
  precisas no relatório. IDs de sessão aleatórios e resumo agregado, conforme gate.

## Roteiro de uso e retorno

| Momento | Proposta de tarefa, sem ensinar o caminho | Evidência a registrar |
| --- | --- | --- |
| Propósito | “Explique para que serve esta página e encontre uma Pauta.” | Compreensão espontânea; obstáculo observado, sem score inventado |
| Contribuição | “Descubra como contribuir sobre uma calçada.” | Entrada, requisito, estado/retorno e consequência compreendidos |
| Privacidade | “O que ficaria público? O que você prefere não enviar?” | Compreensão e possibilidade de recusar; nenhuma exposição real induzida |
| Captura | Usar o procedimento consentido de câmera/GPS do gate, apenas no ambiente aprovado | Não simular consentimento ou sucesso; interromper se o ambiente não isolar dados |
| Recibo | “Como você sabe que enviou? Como acompanha depois?” | Protocolo/estado canônico, retorno à participação e recuperação compreendidos |
| Moderação | Moderador revisa a fixture privada; substituto localiza a pendência | Decisão e devolutiva pelas telas, sem SQL ou publicação automática |
| Ação e resultado | “O que foi feito e o que realmente mudou?” | Distinguir atividade, encaminhamento, resposta e resultado verificado |
| Retirada | Solicitar revisão/retirada conforme o fluxo disponível | Caminho e responsável identificáveis; não presumir exclusão imediata sem prova |

Texto proposto para orientar o **ensaio sintético**, não nova política publicada:
“Este ensaio usa exemplos inventados. Não envie fotos pessoais, contatos ou uma
localização real. Nada será publicado por este exercício. Você pode interromper
ou recusar qualquer etapa. Enviar um registro não significa confirmar um fato ou
autorizar publicação; revisão e devolutiva são etapas separadas.”

Manter P0/P1 como impedimento; registrar P2 para triagem. Três sessões consentidas
e concluídas são o requisito existente. Não marcar 3/3 a partir de testes DOM,
Playwright, fixtures ou da preparação deste documento.

## Fixtures preparadas, sem gravação no produto

| Fixture | Conteúdo mínimo | Restrição |
| --- | --- | --- |
| Calçada A | “Exemplo sintético de passagem interrompida”; rascunho privado | Sem pessoa, foto ou coordenada real; sem simular verificação de campo |
| Calçada B | Segundo exemplo independente para troca de ID | Autor distinto sintético; nunca reutilizar conta ou sessão real |
| Acervo | Item fictício para testar fonte, crédito e pendência editorial | Não converter material público encontrado em material licenciado |
| Rádio | WAV senoidal de 1 segundo gerado pelo harness existente | Teste de bytes/FFmpeg; não conta como episódio editorial real |
| Arte | Metadados de obra fictícia, sem arquivo de terceiro | Sem alegar consentimento, licença ou autorização de exibição |

O harness de rádio cria os usuários/objetos somente após `LAB_READY`; nesta rodada
isso não ocorreu. As fixtures não são conteúdo pronto para lançar a V1.

## Mínimo editorial a obter antes de qualquer publicação futura

Para **cada** recorte Acervo/Rádio/Arte: selecionar um item com fonte/autoria
identificada, prova de direitos ou autorização, crédito, contexto territorial,
revisão de privacidade, decisão editorial e vínculo cívico quando pertinente.
Rádio exige ainda escuta, consentimentos aplicáveis e transcrição/acessibilidade;
Acervo/Arte exigem derivada e descrição/alt text revisados. Guardar originais e
comprovações em seus locais privados canônicos. Não anexar provas privadas aqui.

Nenhum item real com esses requisitos foi fornecido/verificado neste ciclo:
**BLOCKED por curadoria e direitos**, a operar pela equipe editorial designada.
O formulário lógico de preparação é: item, fonte, autoria, autorização, recortes
permitidos, privacidade, acessibilidade, revisor, devolutiva e retirada. Campos
ausentes ficam pendentes, nunca preenchidos por suposição.

Critério de próxima entrega: a pessoa entende, contribui, conhece a exposição,
recebe retorno e consegue voltar; a equipe opera pela fila e distingue atividade
de resultado. Cada afirmação requer observação ou prova própria, não uma label.
