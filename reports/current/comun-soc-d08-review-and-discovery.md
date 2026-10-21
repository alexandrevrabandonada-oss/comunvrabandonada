# SOC-D08 — revisão crítica e preparação da descoberta contextual

Data: 15/10/2026. Revisão técnica pelo próprio agente, sem simular revisão humana
independente, aprovação editorial ou autorização de integração.

## Proveniência e escopo

- Revisado #549 head `5de169eb1c3b90f006a6b077a34879da691fc905`, tree
  `525a29b31a344c68b0f3d08a7f2ed4b155174d14`, contra base #546
  `d39656f4732f4c873e2236186f7b5e6713f1c211`.
- Main consultado: `8b0ba0d2c90295a6579e8e8808a9e765583e86c9`. #546 e #549
  continuam draft, nenhum review no #549. Não houve merge.
- Check-runs completos do head revisado: 13 SUCCESS, 42 SKIPPED, 1 FAILURE,
  zero PENDING. Única falha P1G 38666751346: migration pendente
  `20261006134804_comun_learning_r0.sql`. Dependência de CI não é defeito do
  formulário nem aprovação da integração. COST-02 SKIPPED não equivale a PASS.
- Run SOC-D08 38666751320: duas UI 50/50 e Auth/Postgres real PASS nesse SHA.
  Full Surface 38666751415 attempt 2: admin 35 PASS. Checkout merge ref
  `592bbf0b6912d3042db75671ddbe9245084ab015` tem a mesma tree do head,
  comprovada pela Git API. Falhas antigas SIGTRAP/porta/502 preservadas no
  relatório de continuidade; não apagadas por este resultado.
- Preview `dpl_GExTVbbpApibxZHRQEewu4T4g8pZ` READY e GitHub Preview deployment
  7081611910 success no head revisado. Esses resultados não certificam o novo
  commit de correção desta rodada; ele exige seus próprios checks/Preview.

## Achado material no #549

**R549-F01 / P2 — armazenamento recusado sem explicação inicial.**

Arquivo: `components/comun-solidarity-connection-form.tsx:453`.
`effectiveNotice` computava a explicação de storage indisponível/discard_failed,
mas o JSX mostrava somente `storageNotice`, inicialmente vazio. A pessoa via
Salvar desabilitado sem saber por quê; legado cuja remoção falha também não era
explicado inicialmente. Não demonstrou leitura de dados de outra pessoa.

Reprodução: login sintético → negar getter sessionStorage por addInitScript →
abrir o formulário real → procurar o aviso em role=status antes de digitar.
Nova assertion em `tests/solidarity-continuity/connection.spec.ts` falhou com
locator inexistente no build anterior; não houve mudança de timeout/asserção.
Trace anterior fora do Git: `review-storage-notice-before.zip`, SHA256
`0bad285c869f7f81c56a37e6c6bf6eff3da2c80bcf404a6eb6eea13737582ea3`.

Correção mínima: renderizar `effectiveNotice`. Mensagens explícitas de salvar,
recuperar e descartar mantêm precedência. Regressão adicional recusa remoção do
legado: ele permanece fisicamente no storage, mas seus campos não aparecem; o
aviso não promete apagamento. Nenhuma nova capacidade, storage, auth ou endpoint.

## Confronto com SOC-D01–SOC-D08

| Contrato                            | Código e evidência examinados                                                                       | Resultado e limite                                                                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recuperação voluntária              | draft v2 + botão Recuperar; estado inicial vazio e useSyncExternalStore                             | Sem recuperação automática. Contato/consentimento zerados na recuperação.                                                                                            |
| Identidade/item/origem              | owner hash do user validado + last_sign_in_at; subject kind/id/organização; handles stale na action | Contexto do objeto e login conferido. Origem de navegação é allowlist, não identidade ou permissão.                                                                  |
| Não persistir contato/consentimento | serializer com 8 campos allowlisted em comun-solidarity-connection-draft.ts                         | Contact/consent nunca entram no v2; mensagem pode conter texto sensível, com aviso explícito.                                                                        |
| Retenção e legado                   | TTL de 30 minutos, nova checagem no recover, descarte v1 sem interpretar conteúdo                   | Expiração lógica, não prova de apagamento físico quando storage nega operações; sem promessa de limpeza garantida.                                                   |
| Storage parcial/recusado            | getters/read/write/remove protegidos; revisão F01                                                   | F01 corrigido, inclusive aviso antes de digitar. Sem falso salvamento.                                                                                               |
| Sair real e troca de conta          | Conta/action logoutCommunity, ComunLogoutCleanup, BroadcastChannel opaco, revalidação servidor      | Browser usa componentes/actions reais com transporte controlado. Canal não concede autoridade; servidor recusa formulário stale sem canal.                           |
| Login/retorno                       | solidarityConnectionHref/ReturnHref, communityLoginHref                                             | Só slugs/experiência/origem allowlisted. A página A1 auditada não oferece filtros persistidos além de experiência; não inventar preservação de filtros inexistentes. |
| Publicação e elegibilidade          | página e create action reconsultam getPublicSolidarityOrganizationDetail; RPC canônica              | Despublicado/inelegível recusado; não se confia no snapshot do browser.                                                                                              |
| Replay e permissões                 | ações reais + casos browser + SQL A5 canônico                                                       | Replay/limites/escopo/redaction cobertos. SQL A5 é sequencial; não anunciar corrida sincronizada entre conexões independentes.                                       |
| Acompanhar/aceitar/recusar/retirar  | card real Minha Participação e ações/RPCs existentes                                                | Sem compra, reserva ou entrega prometida. Contato protegido depende do estado autorizado.                                                                            |
| Teclado/foco/feedback               | labels, role=status/alert, refs de foco, controles nativos e Axe nos cenários existentes            | F01 melhora explicação para tecnologia assistiva; leitor de tela humano/usuários reais NOT_RUN.                                                                      |
| Saída e autonomia                   | sem autoenvio/autovínculo, consentimento atual, retirar e Sair explícitos                           | Preserva SOC-D01–D08; nenhuma recompensa, pressão de permanência ou relação política automática.                                                                     |

Não encontrei outro defeito material reproduzido no diff revisado. Isso não é
certificação universal de segurança. A revisão inclui alterações de runtime,
DTOs, navegação, testes, fixture isolada, pin do Playwright e preflight TLS.

### O que os testes realmente provam

- Browser: páginas/componentes/actions reais; fixture substitui projeção pública e
  transporte Supabase por mundo sintético. Não é E2E com Auth/Storage/RLS reais.
- Prova separada: runner reutiliza SQL A5 canônico no Postgres descartável e
  cria dois usuários reais do Auth, testa signIn/getUser/signOut e recusa de
  chamada authenticated à bridge. Esses usuários não são a sessão controlada do
  browser; não apresentar os dois domínios como um único E2E integrado.
- Contratos Vitest de actions mockam sessão e RPC; verificam fronteira/ator,
  não substituem SQL ou teste humano. Não usei mocks como prova de Production.
- Na correção local: red browser antes do fix; 6/6 browser focais depois,
  52 Vitest em 5 arquivos, ESLint focal, TypeScript, build de fixture e
  diff --check PASS. Local Playwright 1.61.1 do node_modules compartilhado,
  Windows; não substitui o runner limpo pinado 1.64.1 do novo SHA.
- Aparelhos reais, Safari/Firefox, leitor de tela humano, troca física de
  janelas, compreensão, operação Production: NOT_RUN.

## Inventário das fontes — código versus ambiente

Inspeção de código apenas; nenhuma consulta a tabela privada. GET público sem
cookie/token nas seis rotas, em 15/10/2026 13:40 UTC, todas HTTP 200. Não executei
RPC de negócio, inscrição, gravação ou fixture real. A resposta pública não
certifica schema/flags/quantidade de linhas nem a versão servida do PR.
Resumo local sanitizado `public-discovery-observation-20261015.json`, SHA256
`d80f798a540aa4c1316e85b3935e6fef67b356f5d0da11e6ac2b8bd63c497096`.

| Fonte/rotas e consultas existentes                                                                                                                       | Publicação, autoria/data/direitos e retirada                                                                                                                                                                                                                                                                                                                                      | Vazio/falha, destino e risco para descoberta                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acervo: /comun/acervo, /comun/acervo/[slug]; lib/archive.ts listPublicArchiveItems/getPublicArchiveItem, archiveItemHref                                 | published + public + published_at, readiness exclui smoke/fixture; source_name, credits, approximate_date/publication date, rights_status/license_text. Assets somente public_safe/aprovados/direitos aceitos. Obra territorial tem gate de consentimento/safety e rota própria. Retirada/direitos: /comun/acervo/direitos-e-remocao; detalhe reconsulta ou 404/redireciona obra. | HTTP mostrou nenhum item editorial nesse recorte; nenhuma publicação individual confirmada. Falha de consulta pode colapsar em array vazio, portanto não comprova banco vazio. Evitar spread de assets/nomes originais para novo DTO. Catálogo e identificação colaborativa são fontes distintas, não chamar identificação de obra publicada. |
| Rádio: /comun/radio e /comun/radio/episodios/[slug]; lib/radio.ts listPublicRadio/getPublicEpisode                                                       | Programa/episódio publicados; raiz Acervo pública/publicada, consentimentos vigentes, direitos de música, safety, asset público e transcript ou exceção documentada. Créditos, published_at/recorded_at, licenças no detalhe. Retirada/consentimento: /comun/radio/direitos-e-consentimento.                                                                                      | HTTP mostrou nenhum episódio publicado. Lista não fornece todos os créditos; novo cartão precisa de metadados públicos do detalhe, não inferências. Falha de eligibility suprime episódios; erros das consultas base ainda podem virar vazio. Não incluir originais, contato, consentimentos ou safety rows no DTO.                           |
| Feirinha: /comun/cooperativas e /comun/cooperativas/[slug]; getPublicSolidarityEconomyDirectory + projector em lib/comun-solidarity-economy.ts           | Flags A1/governança/A5 preservadas. Organizações/territórios públicos, estado e verificação allowlisted. Oferta published/reviewed/published_at/valid_until; necessidade public/open ou partially_met, organização elegível quando vinculada. Origem é organização pública, não autor pessoal inventado. Expiração/despublicação retira da projeção.                              | Nenhuma oferta individual elegível confirmada no HTML público; não inferir se flag, ausência ou indisponibilidade. Directory distingue unavailable de ready e falha fechado. Card de interesse/ajuda depende de #549 e #546; apresentação pública não autoriza contato, contrato ou anúncio individual.                                       |
| Comunidades: /comun/comunidades → /comun/c/[slug]; listCommunities em lib/comun-data.ts + community-experience                                           | Leitura is_active, descrições/ícones; textos e ordem editorial vêm também de catálogo estático. Não há licença/data de atividade/autoria humana comprovada pelo catálogo. Desativação deve prevalecer na fonte canônica.                                                                                                                                                          | HTTP mostrou 4 cartões, mas o helper retorna seed se cliente/consulta falhar. Não é prova de quatro comunidades em operação nem de agenda real. Não consumir esse fallback para preencher descoberta. Datas nextActivity do catálogo não são confirmação de evento.                                                                           |
| Atividades/ações: /comun/acoes → /comun/acoes/[slug]; release guard + listPublicCollectiveActionsCanonical (legado usa collective-actions)               | Flag + ledger/schema/guard; DTO público com estado, território, datas, objetivo/participação. Detalhe e relações revalidados; ação encerrada/retirada não vira convite aberto. Autor/responsável só se público declarado, sem atribuição presumida.                                                                                                                               | HTTP mostra operação não liberada. Não usar listPublicActions legado para contornar release guard nem exibir fixtures como agenda. Datas e resultado precisam de contexto; nenhuma atividade individual confirmada nesta inspeção.                                                                                                            |
| Território: /comun/territorios e /comun/territorios/[slug]; listPublicTerritories/getPublicTerritory, central-hub + perfil territorial quando habilitado | visibility public e não archived; informações públicas e relações filtradas. Data/fonte/limites variam por informação; perfil territorial tem flag própria. Não inferir localização pessoal nem verificação científica da presença num catálogo.                                                                                                                                  | HTTP mostra cadastro territorial em preparação. Helpers básicos podem colapsar falha em vazio. Pode servir de contexto público, não de notícia ou oferta fictícia; nenhum território individual ativo confirmado por esse GET.                                                                                                                |

### Riscos de descoberta, fora do diff #549

**DISC-R01 (P2, bloqueia inclusão dessa fonte):** fallback seed de listCommunities
em ausência/erro pode parecer atividade real. Reproduzível pelo ramo `if (error ||
!data) return seedCommunities`; não criei falha em Production para demonstrá-lo.
É fato de código, não incidente de exposição observado nem regressão do #549.

**DISC-R02 (P2, requisito de read model):** Acervo/Rádio/território podem colapsar
indisponibilidade em vazio. Não basta Promise.allSettled em volta de um helper
que já suprime o erro. Antes de uma área agregada, a leitura precisa fornecer
estado tipado ready/empty/unavailable, conservando todos os gates existentes.
Não mudei esses helpers nesta correção para não converter revisão em refatoração
transversal sem amostra pública elegível.

## Próximo incremento único — SOC-D09

**PLANEJADO / especificação revisável, não implementado.** Pequena seção
“Para conhecer com calma” em /comun/explorar, antes da grade de módulos existente.
Até 2 itens por categoria Acervo/Rádio/Feirinha, no máximo 6, sem paginação,
ranking, popularidade, telemetria nova, geolocalização ou exigência de login.
Cultivar apreciação/uso autônomo; não converter cultura ou oferta em tarefa.

Reutilizar leitores e gates públicos existentes, componentes de cartão/shell e
helpers de experiência; DTO server-only explicitamente allowlisted com tipo,
slug/href local, título, resumo, crédito/fonte pública, data com seu significado,
território público opcional, direitos/limite e validade quando aplicável. Não
transportar sessão, contatos, IDs privados, filenames, originais ou query livre.
Sem schema, feed, chat, seguidores, coleções, publicação ou indexação novos.

Categoria vazia é omitida; se tudo estiver vazio/indisponível, não criar área
ornamental. A grade existente permanece. Falha de uma fonte não derruba outras
nem é chamada de ausência de comunidade. Fontes independentes com estados
explícitos; sem fallback seed. Conservar a ordem de fonte explicada/editorial,
sem chamar isso de validação humana nova. Item é revalidado no clique; retirado
produz indisponível/404 com saída para módulo/Explorar, nunca versão em cache.
Links preservam experiência/contexto público allowlisted e Voltar; sem salvar
histórico privado automaticamente.

Critérios de aceite da futura implementação:

1. Ao menos um item real elegível confirmado por leitura pública autorizada,
   com título/resumo, fonte/crédito e significado da data/direitos suficientes;
   sem inventar autor, licença, data ou validação. Ausência desses elementos
   bloqueia a fonte; decisão editorial não é presumida nem atribuída a alguém.
2. Readers distinguem ready/empty/unavailable; uma falha não impede item de outra
   fonte. Testes negativos de retirada, expiração, privado, rascunho, seed e
   exceção de consulta; nenhum contacto/token/private ID no HTML/DTO.
3. Ler/escutar/consultar → abrir detalhe real → retornar ao mesmo contexto,
   sem login obrigatório, convite coletivo automático ou escrita de negócio.
4. Browser em 390x844 e desktop: teclado/foco, nomes acessíveis, sem overflow,
   link direto, vazio, fonte indisponível e retirada entre lista/detalhe.
   Mocks/fixtures verificam comportamento, não publicação real/RLS/humano.
5. pilot_noindex/flags/release guards intactos; gates/Preview do SHA exato.

Motivo de não implementar agora: nenhuma amostra de cultura/oferta elegível foi
confirmada na superfície pública, estados de fonte ainda ambíguos e as CTAs
Feirinha dependem dos candidatos bloqueados. Implementar outra pilha produziria
uma área invisível ou dependeria de conteúdo inventado. Capacidade de leitura
pública não depende da migration Escola; integrar #549 e comprovar amostra são
dependências separadas. Sem nova pilha ou outro roadmap.

## Escola e ordem de integração

Autoridade consultada: #542 head `921351c36f0593c118508b66e108fb11ace0e2c7`
e seu checkpoint (não o checkpoint antigo da main). Source Subject “Confirm
Email Change” resolvido por HUMAN_READ_SOURCE, captura preservada; não perguntar
novamente. Bloqueio atual LAB_EXCLUSIVE_REAL_KEYS_NOT_LOCATED, recibo da stack
não emitido, CAPTCHA positivo e cinco fluxos SMTP/Auth NOT_RUN, Gmail 0/6.
Backup real continua stale. Encontrar chave não satisfaz recuperação/permit.

Próxima operação já prevista, sem executar nesta rodada: disponibilizar por canal
local protegido somente a configuração CAPTCHA real exclusiva do laboratório e
hostname já autorizado/loopback; preparar stack/SMTP pelo harness do #542,
validar recibo/config sem valores públicos, parar para desafio humano real.
Não criar recurso, segredo, túnel ou nova conta; não usar credencial Production.
Depois fluxos locais reais/MIME/sessão/recusa cruzada e lote Gmail nominal nos
limites consumidos; só então renovar backup/restaurar destino isolado aprovado,
recibo completo <=1h e PRE read-only <=5min. Avaliação do executor atômico já
existente para única migration fixada; COMMIT incerto exige leitura, não replay.
Nenhuma dessas operações foi executada ou autorizada de novo por esta revisão.

Quando elegível: resolver release Escola na sua frente e provar os seis
preflights #523/pendências derivadas; reconciliar #546 com main vivo, todos os
gates aplicáveis/Preview/review, merge normal somente autorizado e pós-merge
SHA servido/deploy automático/smokes não mutáveis/Quality/Core/Civic. Só após
certificar essa integração, reconciliar #549 com main, obter checks/review e
Preview exatos (sem transferir PASS entre SHAs) e certificar seu pós-merge.
Flags continuam iguais; merge não certifica operação comunitária nem publicação.
SOC-D09 continua planejamento até cumprir seus próprios critérios. Sem migração,
RLS/grants, secrets, planos de serviço, flags, indexação ou dados de negócio alterados.
