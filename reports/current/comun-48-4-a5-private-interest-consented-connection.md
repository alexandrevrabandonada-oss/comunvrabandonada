# COMUN 48.4-A5 — Interesse privado e conexão consentida

Data: 16/08/2026
Baseline: `b3a7b549f3a8c79240916e0d3ebe9f03555be62e`

## Decisão

O A5 adiciona uma ponte privada, consentida e revogável entre uma pessoa e
uma organização da Feirinha. A ponte não é pedido, reserva, compra, contrato,
chat, pagamento, avaliação ou troca concluída.

- Oferta pública → **Tenho interesse**;
- Necessidade pública de organização → **Posso ajudar**;
- necessidade apenas territorial continua sem CTA de conexão;
- contato protegido só aparece para `editor` ou `facilitator` A2 ativo da
  mesma organização depois de `accepted`;
- rejeição ou retirada apaga o contato protegido, preservando o registro
  operacional e a mensagem;
- nenhuma relação social, acesso organizacional ou objeto econômico é criado
  automaticamente.

## Persistência e privacidade

- uma única migration forward-only:
  `20260816224228_comun_solidarity_private_connections.sql`;
- SHA-256 da migration:
  `96f69e28d39879896f47ee8074efaec8c7aa437086b6275fa4e1c4ee6c7b5167`;
- `public.comun_territorial_need_interests` foi reutilizada e estendida;
- somente o root ausente foi criado:
  `private.comun_solidarity_offer_interests`;
- `RLS` e `FORCE RLS` ativos, sem grants para `public`, `anon` ou
  `authenticated`;
- RPCs são `service_role` only;
- `request_id` e índices parciais impedem duplicidade;
- limites conjuntos: 10 pendentes e 20 novas conexões por 24 horas;
- cooldown de 24 horas após rejeição para o mesmo item;
- nenhum IP bruto é persistido.

## Consentimento

Versão: `comun.solidarity-contact-consent.v1`.

> Autorizo o COMUN a guardar este contato de forma privada e compartilhá-lo
> com pessoas com acesso ativo a esta organização somente se a organização
> aceitar esta conexão.

O consentimento vale apenas para uma conexão. Não autoriza divulgação
pública, marketing, preenchimento por dados de conta ou contato global.

## UX

- formulários de uma página, mobile-first;
- mensagem e contato ficam em `sessionStorage` antes do login;
- `returnTo` preserva o lugar exato, sem conteúdo na URL e sem autoenvio;
- a organização recebe mensagem e identificação pública segura, mas vê
  “Contato ainda protegido” enquanto a conexão está pendente;
- **Minha participação** recebe a seção contextual “Interesses e ajudas”, sem
  nova aba principal;
- retirada após aceitação explica que cópias feitas fora do COMUN não podem
  ser recolhidas automaticamente.

## Gates

- fonte pública A1 continua fail-closed;
- autoridade A2 é revalidada no banco a cada leitura e decisão;
- A5 depende somente de A1 + A2 e não depende de A3/A4;
- a flag é `COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED`;
- `launch_publicly=false` permanece preservado.

## Validação

- testes focais de contrato e segurança: verdes;
- `typecheck` e lint focal: verdes;
- o bootstrap completo do Supabase CLI 2.114.0 no Windows permaneceu
  bloqueado por `LegacyDbSetupError` dentro do container Realtime; como prova
  local equivalente, um PostgreSQL Supabase descartável recebeu todas as
  migrations e executou o cenário A5 com rollback integral, cobrindo
  consentimento, redaction, autoridades editor/facilitator, acessos
  pending/revoked/left, cross-org, mudança de subject, organização inelegível,
  cooldown, limites, legado `contacted`, RLS e zero propagação social;
- nenhuma escrita remota foi tentada; a mesma prova transacional Linux segue
  obrigatória no workflow descartável do PR antes do merge;
- preflight remoto é metadata-only, `BEGIN READ ONLY` e
  `businessContentRead=false`;
- merge, Wave 0, Wave 1, smoke Production e `businessWrites=0`: pendentes do
  fluxo exact-head.

## Débitos preservados

- pedidos, pagamentos, chat e avaliações continuam fora do produto;
- nenhuma notificação externa é enviada;
- nenhuma conexão sintética será criada em Production;
- A6 (autogestão de perfil) não foi iniciado.
