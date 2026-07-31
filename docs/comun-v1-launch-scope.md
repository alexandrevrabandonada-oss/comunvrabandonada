# COMUN V1 — escopo entregável antes do lançamento integral

## Princípio

A V1 não precisa realizar toda a visão futura do COMUN. Precisa entregar um ciclo social completo, seguro e compreensível: descobrir uma pauta, participar, acompanhar a decisão, ver a ação e preservar o resultado na memória coletiva.

O lançamento integral só acontece depois que os dez domínios do programa de entregabilidade estiverem verdes. Diagnóstico, correções reversíveis, testes, branches, PRs, merges e deployments comuns avançam sem gates humanos intermediários. A única autorização humana terminal é `launch_publicly`.

## Dentro da V1

1. **Núcleo público** — home, exploração, busca, territórios, comunidades e navegação mobile.
2. **Identidade e comunidades** — conta, vínculo, preferências, solicitação moderada, papéis, grupos e Inbox.
3. **Pautas vivas** — relato, roda, síntese, tarefa, ação, protocolo, resposta, resultado e memória.
4. **Miniapp completo** — Mapa das Calçadas operando como referência do motor reutilizável.
5. **Acervo** — item, fonte, autoria, direitos, curadoria, busca e ligação com pautas.
6. **Rádio comunitária** — episódio ou boletim publicável, áudio acessível, transcrição e vínculo territorial.
7. **Arte territorial** — contribuição, autorização, derivadas e exposição relacionada às pautas.
8. **Operação interna** — filas, responsabilidades, notificações, SLA, incidentes e auditoria.
9. **Qualidade e segurança** — RLS, retenção, backup, restore, PWA, acessibilidade, performance e recuperação.
10. **Governança e conteúdo** — onboarding, ajuda, normas comunitárias, política editorial, privacidade, termos e contato.

Acervo Vivo, Rádio Comunitária e Arte dos Territórios compartilham a raiz
`comun_archive_items`. O contrato operacional e os gates estão documentados
em [`comun-cultural-deliverability.md`](./comun-cultural-deliverability.md).
Código e fixtures não bastam para promover `archive_radio_art`: conteúdo real
com direitos, autorização editorial e smoke público precisa existir nos três
recortes. Na ausência dessa prova, o estado máximo é
`COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL`.

## Fora da V1

- feed algorítmico infinito;
- chat em tempo real;
- aplicativo nativo separado da PWA;
- monetização, anúncios ou marketplace;
- recomendação por perfil comportamental;
- publicação autônoma por IA;
- dezenas de miniapps simultâneos;
- streaming de rádio 24 horas antes de existir operação editorial;
- gamificação competitiva por pontos ou popularidade;
- federação entre instâncias;
- infraestrutura própria quando Supabase e Vercel atendem com segurança ao piloto inicial.

Esses itens podem entrar depois, desde que nasçam de necessidade social comprovada e não atrasem a entrega do ciclo central.

## Ordem dos tijolos

- **47.1** Programa de entregabilidade, painel e auditoria única.
- **47.2** Núcleo público sem placeholders e jornada de descoberta.
- **47.3** Comunidades completas: solicitação moderada, papéis, grupos e Inbox.
- **47.4** Esteira política completa da pauta ao resultado.
- **47.5** Fechamento do motor de miniapps e conclusão do piloto de calçadas.
- **47.6** Acervo, rádio e arte em recortes mínimos reais.
- **47.7** Central operacional unificada.
- **47.8** Segurança, backup, restore, retenção e resposta a incidentes.
- **47.9** Acessibilidade, PWA, performance e matriz de dispositivos.
- **47.10** Conteúdo, ajuda, governança e preparação editorial.
- **47.11** Ensaio fechado, estabilidade de 72 horas e go/no-go final.

## Critério de entregabilidade

A plataforma está entregável quando:

- todas as jornadas centrais têm começo, meio e fim;
- nenhuma superfície pública contém fixtures, placeholders ou promessas falsas;
- uma pessoa entende o que acontece depois que participa;
- a equipe consegue moderar e responder sem usar SQL manual;
- falhas deixam evidência sanitizada e recuperável;
- backup e restore foram realmente ensaiados;
- a plataforma funciona em celular popular, conexão ruim, teclado e leitor de tela;
- conteúdo inicial suficiente evita uma cidade vazia;
- existe uma rotina operacional sustentável;
- o ensaio fechado não encontra blockers P0 ou P1.

## Regra de lançamento

O gate `launch_publicly` só pode aparecer quando a auditoria retornar:

`COMUN_V1_DELIVERABILITY_READY_FOR_FINAL_HUMAN_GATE`

Até lá, o domínio integral permanece em preparação, embora módulos já autorizados possam operar em piloto restrito.

## Contrato do ciclo político

O Tijolo 47.4 conecta as fontes canônicas já existentes por uma máquina de
estados auditável. Decisão não é inferida de reação; tarefa concluída não é
resultado; resposta não é resolução; memória só é publicada depois de resultado
verificado. A migration é aditiva e a ativação permanece sob
`COMUN_COLLECTIVE_ACTIONS_V1`.

O domínio `pauta_action_cycle` está `green` desde o Tijolo 47.4. A promoção foi
baseada cumulativamente em schema e RLS remotos exatos, ensaio autenticado
privado com rollback, protocolo e resposta sintéticos vinculados, atividade
separada de resultado, postflight sanitizado e ativação escopada de
`COMUN_COLLECTIVE_ACTIONS_V1`. O gate integral `launch_publicly` não foi
acionado.

O domínio `identity_communities` está `green` desde o fechamento da evidência
do Tijolo 47.3. A promoção exigiu ensaio remoto privado e transacional de
solicitação moderada, autoaprovação bloqueada, decisão idempotente, papéis e
grupos escopados à comunidade, Inbox conectada, revogação imediata e
postflight sem resíduos. Nenhum e-mail externo foi enviado e o gate
`launch_publicly` permanece fechado.

O Tijolo 47.5 extraiu o contrato executável do motor de miniapps e conectou o
Mapa das Calçadas à definição canônica. A janela territorial
`calcadas-vr-piloto-01` permanece ativa até `2026-08-06T03:00:00.000Z`; por
isso `miniapps` continua `in_progress`. O estado técnico é
`COMUN_MINIAPPS_READY_FOR_PILOT_CLOSEOUT`, sem promoção antecipada e sem acionar
`launch_publicly`.

O domínio `operations` está `green` desde o Tijolo 47.7. A Central preserva as
fontes canônicas dos nove domínios, mantém apenas projeção sanitizada e
reconstruível, oferece recortes cotidianos por cuidado, SLA e responsabilidade
e não cria decisão política. A promoção exigiu migration aditiva, RLS remoto
nas três tabelas, zero grant público de escrita, sincronização idempotente,
ensaio privado transacional com rollback, postflight sem duplicidades ou
órfãos e proteção visual da superfície administrativa em cinco viewports. O
gate `launch_publicly` continua fechado.
