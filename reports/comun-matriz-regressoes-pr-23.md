# Matriz das regressões da PR #23

As 28 ocorrências eram repetições por viewport de seis contratos que mudaram. A contagem abaixo preserva a cardinalidade da execução original.

| Suíte | Teste / ocorrências | Esperava | UI atual | Classificação | Decisão |
|---|---:|---|---|---|---|
| Miniapp integral | jornada, 5 | “Calçadas de Volta Redonda” / “Mapa das Calçadas” | `Mapa comunitário`, app bar `Calçadas` e navegação nomeada | C. LINGUAGEM ALTERADA | Assertar heading e região semântica atuais. |
| Miniapp integral | deep links, 5 | `Contexto do processo` sempre visível | contexto curto e voltar no mobile; conteúdo principal no desktop | A/E. ASSERT OBSOLETO / TESTE FRÁGIL | Validar app bar, voltar, bottom nav e `main` conforme viewport. Declarar setup/teardown próprio para não depender de fixtures residuais. |
| Experiência integral | jornada autenticada, 5 | heading antigo e captura em quatro passos com `Continuar` | captura rápida em uma tela: foto → ponto → condição → envio | A/C. ASSERT OBSOLETO / LINGUAGEM ALTERADA | Manter toda a persistência/moderação e trocar somente o contrato de interação. |
| PWA | shell, 3 | logotipo desktop “COMUN VR ABANDONADA” visível | entrada `Início` e bottom nav do shell app-like | A. ASSERT OBSOLETO | Validar navegação principal, SW, Axe, manifest, offline e exclusões de cache. |
| Comunidades | vínculo, 5 | blocos “Nas suas comunidades” na Home e seção padrão na Minha área | acompanhamento concentrado em `Minha área?secao=acompanhando` | D. DESCOBERTA | Testar destino canônico explícito e permanência de propósito, preferências, inbox e saída. |
| Primeiro piloto | jornada, 5 | bloco na Home e formulário antigo paginado | Minha área canônica e captura rápida em uma tela | A/D. ASSERT OBSOLETO / DESCOBERTA | Usar Início/Minha área/Participar/Caixa e manter toda a jornada autenticada. |

## Regressões reais encontradas

Uma fragilidade real de isolamento foi encontrada: a suíte do miniapp referenciava slugs de uma demonstração externa sem `globalSetup`/`globalTeardown`, produzindo 404 depois de um cleanup correto. A correção é de infraestrutura de teste, não de produto. Até este ponto não foi comprovada perda funcional que exija restaurar hero, breadcrumb longo, overlay ou formulário paginado.
