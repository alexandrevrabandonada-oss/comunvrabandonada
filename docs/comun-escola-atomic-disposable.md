# Escola — ensaio atômico em schema canônico descartável

Esta entrega prepara e ensaia um instalador **somente descartável**. Não inclui
comando de promoção remota, não altera manifesto ou migration, e não autoriza
escrita de schema Production. Base: #525 integrado em `092a4afa`.

O workflow usa a mesma versão pinada de CLI e identidade de contêineres do
ensaio Auth existente. Antes do reset, exclui apenas os bytes fixados da Escola
no checkout efêmero do CI; depois restaura o arquivo para a instalação revisada.
Não usa secrets remotos nem execução em push/main ou workflow_dispatch.

O instalador valida os hashes do pacote, exige confirmação e destino local
`127.0.0.1:55432/postgres`, recusa credenciais remotas e executa em transação
SERIALIZABLE com advisory lock. Schema, histórico da migration e ledger usam
uma única transação; somente os BEGIN/COMMIT externos dos bytes revisados são
removidos. Nenhum db push abrangente é utilizado.

O ensaio captura PRE em read-only; injeta falhas após schema, histórico e ledger;
exige PRE preservado nos três casos; instala uma vez; confere POST e ledger;
e recusa replay, verificando que POST permaneceu igual. O diff canônico retira
somente objetos pertencentes à Escola e a sua versão de histórico: mudanças
em outros objetos, mesmo que façam referência à Escola, continuam detectáveis.

São produzidos fingerprints canônicos v2 e runner, hashes do ledger e SHA de
origem, sem payload de pessoas ou strings de conexão. O escopo v2 existente
cobre objetos públicos, políticas de Storage, buckets de configuração e
triggers de Auth ligados ao aplicativo; não é inventário integral de schemas
privados nem certificado de capacidade de backup do provedor. O ledger usa
fingerprints runner, seguindo a convenção existente.

O POST verifica seis tabelas com RLS, quatro funções invoker, zero findings
bloqueantes do scanner existente e preservação dos outros domínios nesse escopo.
Contagens editoriais e ausência de registros privados são consultadas apenas
no banco descartável. O ensaio Auth/API real existente segue distinto e precisa
ser considerado na revisão; esta prova não o substitui.

PASS local: 16 testes Node de pacote, replay/parcial, integridade de PRE e
recusa de destinos/credenciais; execução SQL canônica local NOT_RUN, sem Docker.
A prova real depende do novo CI e não é presumida pelo código do harness.

Continuam pendentes: baseline Production identificado e allowlisted, comparação
PRE/POST com esse baseline, plano/capacidade real de recuperação e autorização
específica da escrita. Recuperação pós-COMMIT não é DROP automático: manter a
flag desligada, interromper operação e preservar qualquer dado real. O artefato
deste ensaio mantém `promotionReady=false` e `remotePromotionAllowed=false`.
