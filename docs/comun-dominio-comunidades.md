# Domínio persistente de comunidades

## Vínculos

- `following`: recebe apenas atualizações significativas escolhidas; não acessa áreas restritas e não possui papel.
- `member`: vínculo comunitário reconhecido; acessos seguem regras específicas, sem papel automático.
- `paused`: vínculo preservado, atualizações interrompidas.
- `left`: saída voluntária; histórico público e contribuições concluídas permanecem, acesso futuro é retirado.
- `suspended`: restrição administrativa distinta da saída; falha fechada nas áreas protegidas.

“Acompanhar” cria `following`. “Entrar” muda para `member` somente quando as regras permitem ou após aprovação. Nenhum dos dois atribui responsabilidade operacional.

## Papel e capacidade

Papel é uma atribuição server-side, auditada, revogável e limitada a uma comunidade. Papéis possíveis: `coordinator`, `facilitator`, `curator`, `community_editor` e `field_observer`. A interface cliente nunca envia ou escolhe papel. Capacidades são derivadas no servidor a partir do papel e do escopo; papel comunitário não concede administração global.

## Grupo de trabalho

Grupo é temporário e possui comunidade, pauta original, objetivo, ciclo, próxima ação, resultado esperado, estado e memória de encerramento. Tarefas continuam na tabela de tarefas da pauta e são apenas relacionadas ao grupo. Estados: `proposed`, `active`, `paused`, `completed`, `archived`. Não há chat próprio.

## Fontes de verdade

Comunidade reutiliza `comun_communities`; perfil usa `comun_member_profiles`; pauta, roda, tarefa, resultado e inbox permanecem em seus domínios atuais. Relações não copiam conteúdo. Arte, Rádio e Acervo continuam donos de mídia e metadados.
