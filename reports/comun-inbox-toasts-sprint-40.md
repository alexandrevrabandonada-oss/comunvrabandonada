# Inbox, mensagens transitórias e PWA — Sprint 40

## Auditoria

O texto “Criar histórico do transporte” não existe no código do aplicativo e nenhum publisher de toast correspondente foi encontrado. A evidência visual é compatível com uma sobreposição externa ao DOM do COMUN. Não foi criada regra artificial para esse texto.

Os eventos persistidos da Inbox passam por projeção contextual com `sourceLabel`, `entityType`, referência de pauta, `destination`, `significance` e `createdAt`. O domínio é inferido do tipo existente, sem migration e sem duplicar eventos. Transporte não é classificado como Calçadas.

## PWA

O convite de instalação:

- ocupa fluxo normal, sem cobrir conteúdo;
- não aparece no mapa nem na captura;
- não compete com atualização do service worker;
- respeita recusa por 30 dias;
- possui ação de fechamento clara.

Nenhum evento antigo é republicado por esta mudança.
