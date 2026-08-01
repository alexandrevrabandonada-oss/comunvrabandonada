# Conceito visual — Tijolo 47.9A2

Conceitos de trabalho para o piloto reversível `?experiencia=app-v2`. Eles não são UI embarcada: texto, controles, ícones e navegação permanecem nativos no código.

## Direção extraída

- **Tema:** Brutalismo Cívico Expressivo.
- **Fundo:** papel quente `#f4efe4` para tarefas e preto `#0b0b0a` para chrome/operação.
- **Ação:** amarelo `#f4c400`, concentrado em próxima ação, estado ativo e confirmação.
- **Tipografia:** grotesca firme; caixa normal para entidades, navegação, formulários e descrições; caixa alta apenas para status, eyebrow, botão e aviso.
- **Geometria:** controle 8 px; card 18 px; comunidade assimétrica; cultura/memória mais generosa; pill completa.
- **Container:** listas, trilhos e superfícies contextuais; não transformar toda seção em card genérico.
- **Movimento:** entrada curta de painel, expansão, aba e mudança de estado; nada contínuo.

## Arquivos

- `app-home-mobile.png`: Home autenticada, próxima ação, atalhos, acompanhamentos, painel Participar e cinco abas.
- `explore-cards-mobile.png`: busca/filtros e gramáticas distintas de comunidade e miniapp.
- `nested-admin-mobile.png`: pauta aninhada sem bottom nav e Central Operacional separada do shell de membro.

## Correções intencionais na implementação

O conceito de Explorar gerou rótulos divergentes na barra inferior (`Territórios`, `Atividades`, `Perfil`). Essa parte foi rejeitada. A implementação preserva exatamente `Início`, `Explorar`, `Participar`, `Caixa` e `Minha área`, conforme o contrato do produto. Métricas e datas ilustrativas também não foram transportadas como dados reais.

As imagens foram geradas com o caminho built-in de Image Gen a partir dos requisitos do 47.9A2 e inspecionadas em resolução original antes da implementação.
