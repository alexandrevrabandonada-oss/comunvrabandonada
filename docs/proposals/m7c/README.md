# SOC-D10.M7.C — Fundação candidata dos Núcleos Permanentes

**Proposta executável somente em laboratório.** `nucleus-candidate.sql` fica fora
de `supabase/migrations` e de `supabase/local-migrations`. Não há rota do produto,
flag, migration registrada, persistência remota ou inscrição real neste incremento.
O roadmap continua sendo `docs/comun-product-objective-and-roadmap.md`.

## Modelo e responsabilidade de autorização

Comunidade e seus vínculos continuam canônicos. `nuclei` referencia a comunidade,
mas não deriva núcleo de grupo de trabalho, acompanhamento, papel, curso ou ação.
As dez tabelas privadas representam finalidade/regras, consentimento, pedido,
autoridade de revisão específica, decisão, matrícula, mandato, oferta de suplência,
decisão independente da suplência e eventos mínimos. Não duplicam ações, tarefas,
Escola, pautas, encontros ou memória.

Cada pedido usa um consentimento novo e exclusivo, identificado por núcleo,
comunidade e titular, com versão de regras e hash da finalidade exata apresentados.
O banco recusa versões/digests antigos na solicitação; poderes dependem também de
coincidirem com a finalidade e as regras correntes. O aviso é a sequência UTF-8 definida em
`lib/community-nucleus-contract.ts`, unida com LF e sem LF final; teste calcula
SHA-256, em vez de apenas verificar seu formato. A evidência afirmativa é imutável;
revogação acrescenta horário e encerra poderes. Ela não prova por si só base legal
ou compreensão humana. Matrícula só nasce de decisão independente aprovada;
FKs compostas, checks e trigger verificam a cadeia. `left`/`revoked` não voltam a
`active`; reingresso exige consentimento, pedido, revisão e matrícula novos.

Uma autoridade de revisão é específica para pedido, titular, núcleo e comunidade,
tem início, término, revogação e referência mínima ao fundamento revisado.
**Não existe API para criar essa autoridade ou um núcleo.** A administração sintética
do laboratório é bootstrap explícito; a legitimidade e o procedimento de concessão
em ambiente real ainda dependem de revisão humana. Papel comunitário não a substitui.
O design TypeScript de leitura exige evidência do mesmo instante da operação;
não autoriza cache de poderes ou uso de provas fornecidas pelo cliente.

Mandatos têm oferta distinta do aceite pessoal, duração máxima candidata de 90
dias, início/fim, devolução e revogação. Um mandato expirado, futuro, revogado, sem
aceite ou ligado a matrícula/consentimento/vínculo inativos não concede poder.
A suplência é ofertada pelo titular vigente a outra matrícula no mesmo escopo;
o aceite da candidata só permite revisão. A decisão exige revisor diferente de
candidata e proponente. Mesmo aprovação não cria mandato nem transfere tarefas,
documentos ou acesso: um novo mandato e aceite seriam operação separada futura.

## RLS, minimização e fronteiras privilegiadas

Todas as dez tabelas têm ENABLE/FORCE RLS. `anon` e `service_role` não recebem
USAGE, SELECT, DML ou EXECUTE neste schema candidato. `authenticated` só recebe
SELECT dos recibos próprios e colunas mínimas; revisores recebem apenas o pedido
específico enquanto a autorização, perfil e vínculo estiverem vigentes. Não há
SELECT cliente para núcleos, autoridades, decisões ou lista de integrantes.
Recibos próprios sobrevivem à saída comunitária/organizativa, mas são negados
a perfil suspenso. Colunas de terceiros, como ator de auditoria e proponente,
não entram nos grants de recibo. SELECT `*` nessas tabelas minimizadas é recusado.

DML cliente é sempre negado. Funções de operação são SECURITY DEFINER com
`search_path=''`, nomes qualificados, identidade `auth.uid()`, estado atual e
escopo validados no PostgreSQL. EXECUTE público é revogado antes do commit;
somente funções explicitamente revisadas recebem grant autenticado. Helpers
arbitrários que poderiam ler vínculos alheios permanecem sem EXECUTE cliente.
Uma operação negada não distingue ID inexistente de ID alheio por `no_data_found`.
Não se usa `user_metadata`, nem se confia em um `userId` recebido do formulário.

O owner/superuser ainda pode contornar RLS, alterar DDL e fabricar evidência.
O laboratório usa essa capacidade apenas para fixtures e concessão/revogação
controladas. Nenhuma prova elimina esse limite de confiança. Uma futura integração
server-side deve preferir sessão do titular, revalidar `getUser`, minimizar DTOs
e impedir que um serviço com bypass reutilize recibo de outra pessoa. Não ampliar
grants de `service_role` para fazer uma rota passar. O schema privado não deverá
ser adicionado aos schemas Data API em ambiente real sem decisão específica.

## Ensaio reproduzível

```powershell
node scripts/organization/rehearse-organizational-cycle.mjs --run-disposable --with-nucleus-model --output <diretorio-novo>
```

O mesmo owner cria GoTrue, PostgreSQL, PostgREST e rede interna sem portas. A/B são
as protagonistas e C é uma revisora sintética independente para provar a suplência.
Sessões são emitidas e verificadas pelo Auth real; chamadas ao schema candidato
passam pelo PostgREST e RLS reais. Só no laboratório o schema é exposto no PostgREST.
Não se confunde isso com rota Next/SSR M7 ou produto disponível a pessoas reais.

O modo M6 `--with-next-http --with-browser` permanece obrigatório no workflow de PR;
o M7.C acrescenta seus casos e hashes ao mesmo artefato sanitizado. A prova M7.C é
separada da Mesa M6 no navegador. O laboratório remove o schema candidato, apaga
as contas e verifica ausência de containers, volume e rede próprios; não usa prune.
O resultado/fonte SHA e os limites constam no JSON, inclusive nas falhas.

### Concorrência como pré-requisito M7.D

O mesmo harness agora envia chamadas HTTP autenticadas concorrentes por duas
revisoras válidas ao mesmo pedido. Exige uma única decisão, matrícula e auditoria
de aprovação; a transação perdedora não pode deixar efeitos parciais. Dois aceites
do mesmo mandato também devem gerar uma única transição e auditoria. Por fim,
saída e aceite de outra oferta disputam a execução: ambas as ordens são legítimas,
mas após o commit da saída nenhum dos mandatos concede poderes, nem aceita novo
aceite. Um recibo histórico `active` não equivale a poder vigente.

O caso de revogação administrativa segura um lock da autoridade, inicia uma
revisão HTTP com a sessão já emitida e comprova no PostgreSQL que ela está
aguardando. Revoga a autoridade e faz commit antes de liberar a revisão. Exige
negação sem decisão/matrícula/auditoria parcial, perda de leitura do pedido pela
revisora revogada e recuperação por outra revisora explicitamente autorizada.
O observador renova o snapshot de estatísticas dentro da transação; falhar em
comprovar a espera é FAIL de instrumentação, não prova de falha de autorização.
O SQL original passou esse caso e não foi alterado para essa prova.

Isso testa operações reais no laboratório mínimo; não demonstra stress, todas as
intercalações possíveis, revogação de toda espécie de vínculo ou compatibilidade
com o schema integral. Não concede o portão de backend M7.D.

### Prova estrutural após reset canônico

`verify-nucleus-full-schema.mjs --run-disposable-ci --output <json>` só admite o
runner GitHub hospedado, seu próprio workspace e o container Supabase local
identificado. Não aceita URL externa, porta/banco alternativos ou parâmetros de
conexão adicionais. O workflow Coherence executa-o depois do reset existente;
exige igualdade entre todas as versões registradas e todos os arquivos canônicos,
incluindo os nomes históricos de 12 dígitos. Confere bytes das migrations, da
candidata e do próprio verificador contra o HEAD da PR, preservando também o SHA
de integração do checkout. Não reaplica migrations, altera seu histórico ou
reutiliza o snapshot divergente do PC.

Somente nesse banco descartável e após confirmar ausência do schema candidato,
aplica a proposta, exige dez tabelas com FORCE RLS e constraints validadas, remove
o schema e comprova ausência. O artefato distingue compatibilidade DDL de prova
Auth/RLS e de experiência humana; o ciclo A/B/C mínimo continua independente.
Preparação ou testes dos guardas não equivalem a PASS desse ensaio: seu JSON do
SHA próprio e a limpeza são necessários. O script recusa execução no PC e em
runner compartilhado/self-hosted.

### Auth A/B/C sobre o schema integral

Com `--with-auth-cycle`, o verificador chama `rehearse-full-schema-auth.mjs`
antes de remover a candidata. O Auth do Supabase do runner cria três contas
sintéticas confirmadas administrativamente, faz login por senha e verifica as
sessões por `getUser`. Não são convites, verificação humana de email ou aceite UX.
Um PostgREST auxiliar usa a mesma imagem imutável, conexão autenticadora e
verificação JWT do PostgREST local. Somente esse container adicional expõe a
candidata; sua porta é ligada a loopback. A configuração da API existente não muda.

Um gateway loopback encaminha Auth para o serviço real e as operações de dados
para a API auxiliar. A mesma matriz de 13 casos M7 percorre HTTP, JWT, funções SQL
e RLS reais sobre todas as migrations. Comunidades, perfis e vínculos são fixtures
explícitas do laboratório; concessão administrativa a revisores não demonstra
legitimidade política ou autosserviço no produto. Ofertas, aceites, revogações,
concorrência, saída e recibos continuam separados. O perfil integral usa `paused`,
um estado legal do schema; isso não prova banimento/suspensão da conta no Auth.

O resultado registra cada cenário e exige ausência do schema, comunidades,
perfis, contas e container próprios, além do gateway encerrado. Cada etapa de
limpeza é tentada mesmo se outra falhar. O ciclo mínimo e esta prova integral têm
escopos separados; a segunda não inclui UI/Next organizativo, tarefas canônicas
M6 no schema integral, moderação ou tratamento humano de ingresso. Só o artefato
real do SHA pode certificar o novo modo; código preparado não é PASS.

## Estratégia de migração e reversão para revisão

1. Revisar finalidade, retenção dos recibos, exclusão de conta, pessoas legítimas
   para revisão, procedimento de recurso e base de tratamento de dados sensíveis.
2. Revisar DDL/grants/definers com o schema integral. Hoje os FKs de usuário são
   RESTRICT: a política de exclusão/anomização é uma decisão pendente, não esconder
   esse bloqueio sob CASCADE. Provar concorrência e troca de autoridade em staging
   descartável antes de qualquer integração.
3. Só com autorização específica gerar migration pela ferramenta canônica,
   forward-only, sem copiar automaticamente este arquivo para o deploy. Sem backfill
   por inferência, sem matrícula inicial, sem bootstrap automático de revisores.
4. Rollback de liberação: fechar operações/rotas e revogar grants em mudança
   descendente revisada, preservar os recibos e a trilha; nunca DROP remoto para
   retornar versão. O `DROP SCHEMA` do harness é exclusivo do banco descartável.
5. Portão M7.D: backend autenticado com a candidata aprovada e ensaio de UI móvel,
   acessível, revogação/URLs conhecidas/cache e limpeza. Só depois ensaio humano e
   eventual liberação independente. Nada neste documento concede esses portões.

## Texto de experiência a ensaiar, sem rota funcional

"Você pode acompanhar esta comunidade e colaborar em atividades sem entrar em
um núcleo. Se quiser uma participação continuada, conheça a finalidade, as regras,
o tempo esperado e quem revisará seu pedido."

O futuro formulário deve exibir o núcleo específico e o aviso antes de um controle
de aceite **desmarcado**, oferecendo "Enviar pedido para revisão" e "Agora não".
Mandato: "Recebi uma proposta" antes de "Aceitar responsabilidade" ou "Recusar".
Suplência: "Meu aceite ainda será revisado; não recebo tarefas ou arquivos de outra
pessoa automaticamente". Saída: "Pausar ou sair encerra os poderes; meus recibos
mínimos permanecem privados". Cada superfície deve manter contexto de comunidade,
Mesa, ações e formação voluntária. Não há ranking, recrutamento obrigatório,
notificação real ou divulgação automática de vínculo neste incremento.
