# Fidelity ledger — Tijolo 47.9A4

Comparação visual realizada no mesmo passe entre os conceitos aceitos em
`reports/assets/47.9a4/` e screenshots Playwright da implementação mobile a
390 × 844. Os conceitos orientam composição; não são fontes de conteúdo.

| Ponto                      | Conceito                                                        | Implementação inspecionada                                                                   | Decisão                                                                           |
| -------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1. App bar                 | título e contexto substituem marca genérica                     | Territórios, pauta e Acervo exibem nome/contexto e retorno                                   | fiel; marca COMUN não ocupa o contexto interno                                    |
| 2. Hierarquia              | título compacto, estado e próxima ação antes de módulos         | `ComunEntityHeader` e bloco de próxima ação abrem pauta e Acervo                             | fiel, com escala menor para 320 px e zoom                                         |
| 3. Relações                | trilha narrativa e rail horizontal finito                       | chips com tipo textual, ícone, foco e flag preservada                                        | fiel; relações ausentes não são desenhadas                                        |
| 4. Matéria visual          | preto, amarelo, papel aquecido e assimetria funcional           | `surface-action`, `surface-memory`, cards de ferramenta e empty state usam tokens semânticos | fiel; textura pictórica do conceito não foi adicionada para preservar performance |
| 5. Contagens               | métricas agrupadas e escopo explícito                           | pauta separa contribuições/protocolos/tarefas de registros do miniapp                        | fiel e mais explícito; zeros não foram substituídos                               |
| 6. Estado vazio            | ausência explicada com CTA e rotas relacionadas                 | Territórios e Acervo têm ação primária e alternativas sem conteúdo sintético                 | fiel; implementação usa dados reais/ausência real                                 |
| 7. Cultura                 | busca, campanha, contribuição e categorias no primeiro percurso | Acervo usa progressive disclosure e separa campanha de publicação editorial                  | fiel; módulos sem publicação aparecem como estado acionável                       |
| 8. Contraste               | ferramenta em papel com texto escuro e ação amarela             | inspeção encontrou título herdando branco; CSS foi corrigido para `--comun-color-ink`        | ajustado após comparação                                                          |
| 9. Offline                 | status visível sem esconder o contexto                          | banner passou de overlay fixo para bloco inline após a app bar no V2                         | ajustado após comparação; título e CTA deixaram de ficar encobertos               |
| 10. Diferenças deliberadas | conceito de pauta mostra território, comunidade e resultados    | fallback editorial local mostra apenas Calçadas, única relação comprovada                    | diferença obrigatória para não inventar vínculos                                  |

Conclusão visual: a direção “Brutalismo Cívico Expressivo” foi preservada em
ação, estado e contraste; superfícies e relações ganharam hierarquia contextual.
Não se declara sistema definitivo, migração integral ou validação humana.
