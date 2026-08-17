# COMUN 48.4-A6 — Autogestão segura do perfil da organização

Data: 16/08/2026
Baseline: `5e0df370f934073b7d2fa654b05c8a6c875f312d`

## Decisão

O A6 permite que uma pessoa com acesso A2 `active`, no papel `editor` ou
`facilitator`, mantenha quatro informações cotidianas e reversíveis da
organização:

- `presentation_public`;
- `services_public`;
- `service_territory_public`;
- `public_contact_authorized`.

Nome, tipo, status, verificação, `last_verified_at`, contato privado,
proveniência e identidade territorial continuam protegidos. A edição não
representa propriedade, representação legal nem nova verificação pelo COMUN.

## Persistência e autorização

- uma única migration forward-only:
  `20260817012247_comun_solidarity_organization_profile_self_management.sql`;
- SHA-256: `fac14e1e950ef8b49c31397e948b373c50c808bc1d507ea226091dfb83851a08`;
- nenhuma nova entidade de negócio;
- o ledger privado A3
  `private.comun_solidarity_economic_content_events` é reutilizado;
- `subject_type=organization_profile` e
  `operation=organization_profile.edit` identificam a operação;
- snapshots `before_payload_private` e `after_payload_private` aceitam somente
  os quatro campos A6, raiz JSON object e até 8 KiB cada;
- eventos A3 anteriores permanecem válidos com payload `NULL`;
- a RPC é `SECURITY DEFINER`, `search_path=pg_catalog` e executável somente por
  `service_role`;
- o banco revalida acesso A2 ativo, papel allowlisted e todos os gates A1 da
  organização e do território;
- `request_id` preserva idempotência; `updated_at` implementa concorrência
  otimista; conflitos geram zero update e zero evento;
- limites: 10 edições em 10 minutos e 30 em 24 horas por pessoa, sem IP bruto.

## Normalização e safety

- apresentação opcional: 10–1.200 caracteres quando preenchida;
- serviços: um por linha, trim, remoção de vazios, deduplicação case-insensitive
  preservando a primeira forma, até 12 itens, 2–80 caracteres por item e até
  600 caracteres totais;
- território de atuação opcional: até 300 caracteres, sem geocoding;
- contato público opcional: até 200 caracteres;
- prosa pública reutiliza o safety determinístico A3 e bloqueia telefone,
  e-mail, CPF e segredos fora do campo apropriado;
- o contato público possui safety próprio: telefone/e-mail são permitidos,
  mas CPF, documentos, senha, token, chave privada e endereço residencial
  evidente falham fechados;
- contato novo não vazio exige confirmação explícita; contato inalterado não
  exige nova confirmação; remoção para `NULL` é imediata;
- não há fallback por `private_contact`, conta, Wallet, A5 ou Relata.

## Experiência

- rota contextual única:
  `/comun/cooperativas/[slug]/editar-perfil`;
- somente acesso A2 ativo vê **Editar perfil da organização**;
- uma tela, com identidade protegida em leitura e os quatro campos editáveis;
- draft fica em `sessionStorage`; login usa `returnTo`, sem conteúdo na URL e
  sem auto-submit;
- conflitos e limites possuem copy pública segura;
- o DTO A1 continua sendo a única projeção pública e nunca recebe ator,
  acesso, request id ou snapshots de auditoria;
- a flag `COMUN_SOLIDARITY_ORGANIZATION_PROFILE_SELF_EDIT_ENABLED` depende
  apenas de A1 + A2 e nasce fail-closed.

## Validação

- testes focais de normalização, flags, consentimento, contrato SQL, privacidade
  e ausência de propagação: verdes;
- `typecheck` e lint: verdes;
- o bootstrap local completo do Supabase CLI 2.114.0 no Windows encontrou
  `LegacyDbSetupError` no container Realtime antes da prova A6; a prova Linux
  descartável do PR é o gate transacional autoritativo;
- preflight remoto: pendente no PR, sempre metadata-only, `BEGIN READ ONLY` e
  `businessContentRead=false`;
- prova descartável: pendente no PR, com rollback integral;
- suíte completa, build, PR exact-head, Wave 0, Wave 1 e Production smoke:
  pendentes antes da promoção.

## Contratos preservados

- Offer, Need, Interest e Connection: zero propagação;
- Community, Pauta, Roda, Action, WorkGroup e memberships: zero propagação;
- A2 access não é promovido, criado ou revogado por edição de perfil;
- A1–A5 permanecem ativos e independentes;
- nenhum seller, owner, pedido, pagamento, chat, rating ou produtor individual;
- `COMUN_48_4_A1_INDIVIDUAL_PRODUCERS_DEFERRED_FIRST_CYCLE` preservado;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` preservado;
- `launch_publicly=false`.

## Estado terminal

O terminal A6 somente será registrado depois de merge exact-head, Wave 0,
Wave 1 e smoke Production com `businessWrites=0`.
