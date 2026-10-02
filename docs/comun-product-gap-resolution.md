# Resolução das lacunas do produto

Reconciliação de 01/10/2026, America/Sao_Paulo. Fonte de escopo:
[issue #95](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/issues/95)
e [programa V1](./comun-v1-launch-scope.md). Calçadas permanece o piloto;
Serviços Públicos não foi incorporado à V1. Nenhum domínio é promovido por este
documento, por um build verde ou pela presença de código.

## Pacotes técnicos

- #480 está em Production no commit `9820f0d`: comunidades sem agenda fictícia,
  ações abertas por fonte canônica, vocabulário público e preflights históricos
  somente de leitura. Qualidade, jornadas e grafo pós-publicação passaram.
- #481, head `430f8ec`, corrige o caminho restante de `public_status` nas Pautas
  Vivas e cabeçalhos. Preview READY, prova de renderização atual/legacy e CI
  principal passaram. A integração depende da conclusão dos checks ampliados.
- O pacote de indexação implementa robots, sitemap vazio e noindex durante a
  preparação, e deixa o auditor validar os corpos. Ainda exige revisão,
  integração e prova HTTP no SHA publicado para fechar os dois 404 em produção.

## Matriz dos achados históricos

| Frente               | Evidência disponível                                                 | Lacuna restante                                                       | Próxima ação verificável                                                                      |
| -------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Comunidades          | #480 retirou agenda estática e separou comunidade em preparação      | proveniência de todos os recortes e sinal do auditor                  | conferir DOM e fonte no mesmo SHA; não declarar todos os sinais falsos                        |
| Calçadas             | jornada pública e smokes técnicos existentes                         | closeout operacional e observação real                                | reconciliar o piloto existente, sem reiniciar janela ou contadores                            |
| Acervo               | contrato cultural e filtros publicáveis existentes                   | curadoria, derivadas e direitos por item                              | inventário read-only e primeiro recorte editorial real autorizado                             |
| Segurança pública    | navegação e conteúdo carregam; contrato antigo do auditor divergente | revisão de política e auditor sem falso positivo                      | conferir conteúdo acessível, contexto e proveniência do sinal                                 |
| robots.txt           | implementação e validador no pacote de indexação                     | revisão e HTTP no SHA publicado                                       | status 200 text/plain, diretivas e noindex confirmados                                        |
| sitemap.xml          | XML vazio de preparação e rejeição de URLs no contrato               | revisão e HTTP no SHA publicado                                       | 200 XML válido; manter não indexado até o lançamento autorizado                               |
| Miniapps             | contrato técnico e piloto de Calçadas existentes                     | fechamento de campo e SLA                                             | usar o closeout existente com evidência atual                                                 |
| Acervo/Rádio/Arte    | processamento e ensaios sintéticos não bastam                        | conteúdo real com direitos, áudio/transcrição e exposição autorizados | registrar a prova de cada recorte; não publicar fixtures                                      |
| Recuperação          | ensaios internos e runbook disponíveis                               | cópia durável independente, recuperação de Auth e Storage <24h        | comprovar capacidade efetiva do provedor e restore durável; não presumir contratação          |
| Qualidade            | checks automáticos, PWA e acessibilidade sintética                   | Android físico, segunda plataforma e assistiva real                   | executar [roteiro existente](./comun-quality-real-device-rehearsal.md), incluindo baixa visão |
| Governança           | normas, ajuda e proteções operacionais no repositório                | pessoas, substitutos, contato e conteúdo real confirmados             | preencher a operação real com o responsável, sem inventar nomes ou consentimentos             |
| Ensaio de lançamento | protocolo humano existente                                           | 3 sessões consentidas, estabilidade de 72h e P0/P1 encerrados         | reutilizar [gate humano](./gates/COMUN_HUMAN_GATE.md); nenhum resultado sintético conta       |

## Outros achados e limites

- O auditor ainda procura substrings no HTML completo: placeholder de input e
  explicação de fixtures podem gerar falsos positivos; texto só em script pode
  satisfazer um contrato. Resolver com conteúdo semântico e proveniência sem
  retirar a varredura de vazamento do payload.
- Feirinha e Rádio vazias pedem conteúdo real e autorização; não são resolvidas
  inserindo ofertas ou episódios fictícios.
- A busca possui fallback lexical; a prova semântica depende de capacidade real
  do provedor. A ausência dessa prova não autoriza prometer busca semântica.
- `Permissions-Policy` atualmente declara `camera=()`. A compatibilidade com o
  ensaio de captura precisa ser reconciliada em pacote próprio, preservando
  consentimento do navegador e o contexto em que a câmera é necessária.
- O aviso antigo de dependências vulneráveis exige advisories e análise de
  alcance atual. Não executar correção forçada nem afirmar exploração sem prova.

Os responsáveis funcionais são edição/direitos, operação/coordenação,
infraestrutura e observação de campo. Titulares e substitutos reais não são
deduzidos deste documento. As lacunas acima permanecem abertas enquanto a
evidência correspondente não existir.
