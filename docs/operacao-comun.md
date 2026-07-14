# Operacao COMUN

## Regra local-first

Todo tijolo comum deve rodar localmente por padrao. Deploy e validacao em producao sao etapas de release, nao rotina diaria de desenvolvimento.

Permitido em tijolo comum:

- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- `npm run verify`;
- `npm run verify:local`;
- servidor local;
- smokes contra `http://localhost:<porta>` ou `http://127.0.0.1:<porta>`.

Proibido por padrao:

- `vercel deploy`;
- `npx vercel deploy`;
- `npx vercel deploy --prod`;
- smokes com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`;
- qualquer teste contra producao.

Checks em producao exigem pedido explicito e `ALLOW_PRODUCTION_CHECKS=1`. Os smokes HTTP abortam se detectarem a URL de producao sem essa variavel.

Relatorios futuros devem declarar ambiente usado, se houve deploy, se houve check em producao e se o tijolo foi local-only.

## Release candidate local

Use a RC local para validar o COMUN inteiro antes de qualquer deploy:

1. subir Supabase local com Docker;
2. resetar o banco com `npx supabase db reset --local`;
3. rodar `npm run storage:setup` para buckets privados locais;
4. iniciar Next em `http://localhost:3000`;
5. rodar `npm run verify:rc-local`.

A RC local valida lint, typecheck, build, matriz RLS e os smokes principais. Ela nao envia e-mail, WhatsApp, notificacao externa, deploy ou smoke contra producao.

## Rotina de curadoria

1. Entrar em `/comun/admin`.
2. Abrir relatos novos.
3. Ler relato bruto apenas internamente.
4. Remover nomes, CPF, telefone, endereco completo e dados de terceiros.
5. Escrever `public_text` como versao publica sanitizada.
6. Associar comunidade e pauta.
7. Definir risco.
8. Publicar apenas se houver autorizacao e texto sanitizado.
9. Arquivar relatos duplicados, inseguros ou fora de escopo.

## Cuidados

- Nunca publicar contato privado.
- Nunca copiar relato bruto para pagina publica.
- Nunca publicar foto recebida no relato rapido sem curadoria explicita.
- Nunca publicar latitude/longitude precisa. Use bairro/local aproximado ou texto sanitizado.
- Publicacao nao significa confirmacao automatica de todos os fatos.
- Casos de risco imediato devem ser orientados para canais formais adequados.
- Protocolo Popular nao substitui Ouvidoria oficial e nao envia demanda automaticamente.

## Relato rapido

O modo rapido serve para problemas vistos na rua: buraco, calcada, lixo, entulho, fumaca, iluminacao, transporte e situacoes parecidas.

Na curadoria:

1. verificar se a categoria rapida foi classificada corretamente;
2. conferir a foto por signed URL temporaria no admin;
3. tratar foto como privada ate decisao explicita;
4. usar localizacao precisa apenas como apoio interno;
5. publicar somente texto sanitizado e local aproximado quando fizer sentido.

## Curadoria de anexos

Fila operacional:

1. abrir `/comun/admin/anexos`;
2. revisar pendentes primeiro;
3. marcar blur/redacao quando houver rosto, placa, documento, uniforme, cracha, endereco, tela de celular ou crianca;
4. reprovar quando imagem for inutil, sensivel demais ou fora de escopo;
5. subir versao publica segura somente depois de edicao externa;
6. nunca publicar original.

Para cada foto recebida:

1. ver a miniatura/link temporario do original apenas internamente;
2. conferir protocolo, comunidade, pauta e data de envio;
3. escolher uma decisao: aprovado apenas interno, precisa blur/redacao, reprovado ou versao publica segura;
4. quando precisar publicar imagem, editar fora do sistema e subir a versao ja redigida/blurada;
5. confirmar que `public_approved` ficou verdadeiro somente com a versao segura.

O arquivo original permanece no bucket privado `comun-report-attachments`. A versao segura vai para `comun-public-safe-attachments`, que tambem e privado.

### Rotina diaria de anexos

1. Abrir `/comun/admin/anexos`.
2. Filtrar pendentes.
3. Priorizar pendentes ha mais de 72h.
4. Marcar blur/redacao quando houver rosto, placa, documento, crianca, cracha, endereco ou dado identificavel.
5. Reprovar foto inutil ou arriscada.
6. Subir versao segura apenas apos edicao externa.
7. Verificar auditoria.

### Rotina semanal de anexos

1. Revisar anexos `needs_redaction`.
2. Conferir se ha pendencias acumuladas.
3. Revisar reprovados antigos somente quando houver politica futura de limpeza.
4. Confirmar que signed URLs e originais nao foram compartilhados fora do admin.

## Protocolo Popular / Ouvidoria assistida

Rotina publica:

1. A pessoa abre `/comun/acompanhar/[protocolo]/ouvidoria`.
2. O COMUN gera texto com dados seguros do relato.
3. A pessoa copia o texto e abre o canal oficial.
4. A pessoa registra a demanda no canal oficial.
5. A pessoa informa no COMUN o numero oficial recebido.
6. A pessoa pode registrar resposta recebida, sabendo que a resposta completa nao aparece publicamente por padrao.

Rotina admin:

1. Abrir o relato no admin.
2. Revisar a secao `Protocolo oficial`.
3. Conferir canal, numero oficial, status e datas.
4. Se houver resposta, manter `response_text` privado.
5. Escrever `public_summary` apenas com resumo seguro.
6. Marcar resolvido/nao resolvido quando houver criterio.
7. Usar as metricas agregadas para identificar acumulados por pauta, comunidade e canal.

Limites:

- COMUN nao e Prefeitura nem Ouvidoria oficial.
- COMUN nao promete prazo ou resposta oficial.
- Texto gerado e assistente de redacao, nao protocolo oficial.
- Dados privados do relato nunca devem entrar no texto gerado.

### Rotina semanal de protocolos oficiais

1. Abrir `/comun/admin/protocolos-oficiais`.
2. Filtrar vencidos.
3. Olhar pautas recorrentes em `Inteligencia operacional`.
4. Revisar respostas sem resumo publico.
5. Cobrar retorno quando necessario, fora do COMUN e pelo canal oficial adequado.
6. Registrar resposta recebida sem publicar `response_text` completo.
7. Escrever `public_summary` apenas quando houver resumo seguro.
8. Marcar resolvido ou nao resolvido.
9. Selecionar pautas candidatas a dossie.

### Leitura para futuros dossies

O painel mostra possiveis dossies quando encontra:

- pauta com 3 ou mais protocolos;
- pauta com 2 ou mais vencidos;
- comunidade com 3 ou mais protocolos na mesma pauta;
- resposta oficial insatisfatoria;
- nao resolvidos acumulados.

Essa leitura e interna. Antes de qualquer publicacao, a equipe ainda precisa revisar evidencias, anonimizar trechos e decidir o recorte editorial.

## Pautas sociais

Rotina:

1. Abrir `/comun/admin/pautas`.
2. Criar pauta com titulo, comunidade, categoria e resumo.
3. Escrever sintese publica apenas com dados seguros.
4. Revisar contribuicoes pendentes em `/comun/admin/pautas/[id]`.
5. Aprovar somente contribuicoes sem dados pessoais de terceiros.
6. Criar tarefas publicas quando houver acao coletiva clara.
7. Usar a pauta como preparacao para dossie futuro, nao como feed generico.

### Fila global de contribuicoes

1. Abrir `/comun/admin/pautas/contribuicoes`.
2. Filtrar `pending`.
3. Priorizar `high` e `possible_abuse`.
4. Rejeitar ou arquivar contribuicao ofensiva, automatizada, repetida ou com dados pessoais.
5. Aprovar contribuicao segura e relevante.
6. Nunca copiar contato privado, hashes ou metadados tecnicos para sintese publica.

O limite de envio excessivo existe para reduzir abuso, mas a moderacao deve preservar participacao legitima e evitar bloqueios agressivos.

### Qualidade editorial de pauta

Antes de usar uma pauta como base de dossie:

1. Revisar sintese publica e proximo passo.
2. Conferir historico de versoes.
3. Preencher checklist editorial.
4. Criar evidencias a partir de contribuicoes aprovadas, relatos sanitizados, protocolos ou fontes manuais.
5. Aprovar apenas evidencias `public_safe`.
6. Manter evidencias `private_only` e notas internas fora da pagina publica.
7. Conferir se ha distincao entre fato, relato e proposta.

Nunca copiar para a pagina publica:

- contato privado de contribuicao;
- texto bruto de relato;
- notas internas;
- resposta oficial completa;
- signed URL ou storage path.

### Rotina semanal de dossies por pauta

1. Abrir `/comun/admin/dossies/revisoes`.
2. Filtrar pendentes de revisao factual.
3. Filtrar pendentes de revisao editorial.
4. Resolver bloqueados por mesmo revisor chamando outro revisor.
5. Revisar ajustes solicitados e rejeitados.
6. Abrir dossies prontos para publicacao.
7. Voltar para a pauta quando precisar aprovar novas evidencias.
8. Conferir se as evidencias incluidas sao `approved + public_safe`.
9. Resumir respostas oficiais usando apenas `public_summary`.
10. Editar sintese executiva, problema, comunidades, demandas e proximos passos.
11. Preparar a versao publica revisada a partir do rascunho.
12. Editar `public_title`, `public_summary`, `public_body` e `public_slug`.
13. Abrir o preview admin e procurar vazamentos de `raw_text`, `private_contact`, `response_text`, `internal_notes`, signed URL e `storage_path`.
14. Registrar revisao factual com checklist.
15. Registrar revisao editorial com outro revisor.
16. Pedir ajuste quando qualquer etapa encontrar problema.
17. Aprovar somente com checklist de seguranca marcado e dupla revisao concluida.
18. Preencher o checklist final de publicacao.
19. Publicar quando o status estiver `approved`; isso cria snapshot imutavel.
20. Comparar rascunho atual com snapshot ativo quando houver duvida.
21. Despublicar com motivo registrado se houver erro, risco ou necessidade de nova revisao.
22. Fazer rollback para snapshot anterior quando a versao anterior for a ultima segura.
23. Arquivar dossies sem recorte claro ou com risco editorial alto.

A rota publica usa somente o snapshot publico ativo. O rascunho interno, `public_version` antigo, notas de revisao, checklist de revisao, checklist final e `internal_notes` nao entram na pagina publica.

### Rotina de snapshots de publicacao

1. Abrir `/comun/admin/dossies/[id]`.
2. Conferir `Versao publica revisada`.
3. Salvar o checklist final.
4. Publicar e confirmar o item em `Historico de publicacao`.
5. Abrir `/comun/dossies/[slug]` localmente.
6. Editar o rascunho apenas se precisar preparar nova versao.
7. Publicar de novo para criar novo snapshot; o anterior deve ficar `superseded`.
8. Despublicar sempre com motivo.
9. Usar rollback somente para restaurar snapshot anterior seguro.

# Acervo vivo (Sprint 20)

O módulo `/comun/acervo` usa Supabase para metadados e Cloudflare R2 para binários. A administração fica em `/comun/admin/acervo` e `/comun/admin/acervo/colecoes`.

Fluxo: cadastrar metadados, enviar original privado, enviar versão pública separada, preencher alt text/créditos, aprovar o asset e publicar. Despublicar torna o item privado sem apagar o original. Direitos desconhecidos/restritos e uploads de áudio/vídeo são bloqueados.

Rotina semanal: `npm run backup:archive-manifest`. Consulte `docs/acervo-vivo.md`, `docs/acervo-storage.md`, `docs/acervo-direitos.md` e `docs/acervo-backup-local.md`.

# Rotina fotografica

Revisar `/comun/admin/acervo/contribuicoes` e `/comun/admin/acervo/sugestoes`. Antes de publicar, confirmar checksum, fonte, direitos, credito, alt text, derivado sem EXIF e original privado.
# Verificação do Acervo

Após mudanças em R2 ou Sharp, um administrador pode executar a fixture descartável em `/comun/admin/acervo/verificacao`. Respeitar o intervalo de uma hora e tratar imediatamente qualquer `cleanup_required`.
