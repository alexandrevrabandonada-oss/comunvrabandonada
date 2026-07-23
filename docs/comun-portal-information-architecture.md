# Arquitetura da informação do portal COMUN

## Modelo público

| Conceito    | Pergunta respondida                  | Fonte de verdade                                                             | Rota canônica                                                           |
| ----------- | ------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Território  | Onde acontece?                       | `comun_hub_territories`                                                      | `/comun/territorios/[slug]`                                             |
| Comunidade  | Quem se organiza?                    | `comun_communities`                                                          | `/comun/c/[slug]`                                                       |
| Pauta       | O quê e por quê?                     | `comun_pauta_spaces`                                                         | `/comun/pautas/[slug]`                                                  |
| Miniapp     | Como agir?                           | módulo da pauta + projeções do domínio                                       | `/comun/calcadas` para o miniapp ativo                                  |
| Prioridade  | O que avançar?                       | `comun_sidewalk_priorities`                                                  | `/comun/calcadas/prioridades?prioridade=[id]`                           |
| Mobilização | Quem faz o quê?                      | `comun_mobilization_actions`                                                 | `/comun/acoes/[slug]`                                                   |
| Resultado   | O que mudou?                         | `comun_hub_results`                                                          | `/comun/resultados?resultado=[slug]`                                    |
| Memória     | O que permanece?                     | memória do domínio ou item publicado do acervo                               | `/comun/pautas/[slug]/memoria/[memorySlug]` ou ficha canônica do acervo |
| Minha área  | Qual é minha relação com o processo? | projeção autenticada de contribuições, acompanhamentos, tarefas e resultados | `/comun/minha-participacao`                                             |
| Inbox       | O que exige minha atenção?           | `comun_member_inbox` com projeção contextual                                 | `/comun/caixa-de-entrada`                                               |

## Relação entre as portas

```text
Território (onde)
  → Comunidade (quem)
    → Pauta (o quê/por quê)
      → Miniapp (como agir)
        → Prioridade (o que avançar)
          → Mobilização (quem faz o quê)
            → Resultado (o que mudou)
              → Memória (o que permanece)

Minha área = relação da pessoa com qualquer etapa
Inbox = mudanças significativas que exigem atenção
```

`ComunContextTrail` apresenta esse vínculo sem incorporar uma superfície inteira dentro de outra. Cards e busca usam as mesmas rotas canônicas. A entrada histórica `/comun/busca`, as rotas `/comun/arte/*` e a antiga ficha de calçada sob a pauta são somente compatibilidade e devem redirecionar permanentemente.

## Regras de integridade

- Não há nova tabela, cópia ou entidade paralela nesta consolidação.
- Comunidade não é território; pauta não é comunidade; ferramenta não é pauta.
- Um miniapp pertence a uma pauta e sempre oferece retorno ao portal.
- Atividade, resposta, promessa, resultado e memória são estados semanticamente distintos.
- Minha área e Inbox agregam a mesma origem; não criam áreas pessoais por domínio.
- A busca usa correspondência editorial e contexto, nunca popularidade.
