# Tijolo 47.3 — Comunidades completas

Resultado: `COMUN_IDENTITY_COMMUNITIES_GREEN`

## Causa-raiz

O fluxo anterior tratava `join` como autoaprovação:

- mudava imediatamente o vínculo para `member`;
- preenchia `joined_at`;
- registrava `membership_approved` com a própria pessoa como ator;
- não criava fila de revisão;
- não oferecia cockpit para papéis e grupos.

## Correção

- `Acompanhar` continua sendo autoatendimento e não concede papel;
- `Solicitar entrada como membro` preserva o estado `following`;
- a solicitação vira item pendente na fila editorial existente;
- solicitações repetidas reutilizam a operação aberta;
- a pessoa recebe confirmação pela Inbox;
- coordenadores ativos recebem aviso agregado;
- a decisão administrativa é idempotente e bloqueia vínculo suspenso ou operação encerrada;
- aprovação muda o vínculo para `member` e registra auditoria;
- rejeição mantém a pessoa como seguidora;
- papéis são concedidos separadamente, somente a membros ativos e por administrador;
- revogação do papel não remove o vínculo comunitário;
- grupos de trabalho só aceitam membros ativos da mesma comunidade;
- entradas e saídas de grupo geram auditoria e Inbox.

## Superfície administrativa

`/comun/admin/comunidades`

- fila de solicitações;
- prazo indicativo de 48 horas;
- aprovação ou encerramento;
- membros e papéis ativos;
- concessão, revisão e revogação de papéis;
- criação de grupos de trabalho;
- entrada e saída de membros em grupos.

## Auditoria

O workflow diário mede apenas contagens sanitizadas:

- comunidades ativas;
- vínculos por estado;
- papéis ativos;
- grupos por estado;
- solicitações abertas;
- autoaprovações históricas que exigem reconciliação.

O artifact não contém nomes, IDs, e-mails, mensagens privadas ou secrets.

## Fronteira

- nenhuma migration;
- nenhuma alteração de RLS;
- nenhuma promoção automática de seguidor para membro;
- nenhuma concessão automática de papel;
- nenhum envio externo ou escrita em Storage;
- toda escrita sintética do ensaio remoto ocorreu em uma única transação
  privada, integralmente revertida;
- zero linhas sintéticas permaneceram no postflight.

## Fechamento da evidência

- primeiro run remoto controlado: `30567012604`;
- SHA funcional ensaiado: `413d6be7dfecb4d02d1f87277a224745bdbd3376`;
- artifact:
  `comun-identity-communities-eba0205ebcb740dd09a82ea74d2106d48043db64-30567012604`;
- resultado do artifact: `COMUN_IDENTITY_COMMUNITIES_GREEN`;
- 14 verificações positivas e negativas verdes;
- autoaprovações históricas encontradas: `0`;
- autoaprovação no fluxo atual: bloqueada;
- repetição da mesma decisão: idempotente;
- visitante, membro comum e membro de outra comunidade: sem escalada;
- aprovação por ator autorizado diferente: comprovada;
- Inbox de solicitante e coordenação: comprovada;
- papel temporário e revogação imediata: comprovados;
- fixture privada: invisível na superfície pública;
- scanner independente: sem conexão, segredo, e-mail, UUID bruto ou dado
  pessoal.

O domínio `identity_communities` passa a `green`. O gate terminal
`launch_publicly` continua fechado.
