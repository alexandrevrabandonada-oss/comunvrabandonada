# Deploy Checklist

- Rodar `npm run smoke:popular-map` e confirmar cleanup.
- Confirmar RLS das tabelas `comun_territorial_*`, localização privada e atribuições com fonte.

Este checklist e uma rotina de release. Ele nao faz parte da rotina diaria de desenvolvimento nem de um tijolo comum.

- História Oral: validar RLS, original e termo privados, gate de consentimento, transcrição pública separada, embargo, retirada e ausência de URLs assinadas no HTML.

Por padrao, tijolos comuns sao local-first:

- nao rodar `vercel deploy`, `npx vercel deploy` ou `npx vercel deploy --prod`;
- nao rodar smokes com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`;
- nao executar qualquer teste contra producao sem pedido explicito.

Para desenvolvimento comum, use somente checks locais:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run verify:local`
- servidor local
- smokes contra `http://localhost:<porta>` ou `http://127.0.0.1:<porta>`

## Release candidate local

Antes de qualquer release real, rode a RC local com Supabase local/Docker:

1. `npx supabase start`
2. `npx supabase db reset --local`
3. `npm run storage:setup`
4. iniciar Next local com `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
5. `npm run verify:rc-local`

Esse comando e local-only. Ele nao executa deploy, nao usa Vercel e aborta se `NEXT_PUBLIC_SITE_URL` apontar para fora de `localhost` ou `127.0.0.1`.

Validacao de release pode tocar producao somente quando houver autorizacao explicita e `ALLOW_PRODUCTION_CHECKS=1`. Sem essa variavel, os smokes HTTP abortam quando `NEXT_PUBLIC_SITE_URL` aponta para producao.

Todo relatorio novo deve declarar:

- ambiente usado;
- se houve deploy;
- se houve check em producao;
- se o tijolo foi local-only.

## Antes do deploy

- [ ] Supabase migration aplicada
- [ ] Seeds presentes
- [ ] `.env.local` local funcionando
- [ ] RC local `npm run verify:rc-local` passa contra `http://localhost:3000`
- [ ] `npm run verify:local` passa localmente
- [ ] `npm run smoke:comun` passa
- [ ] `npm run smoke:admin-auth` passa
- [ ] `npm run smoke:no-leak-http -- --path /comun/pautas/<slug> --required "<public_text>" --forbidden "<segredo-ficticio>"` passa
- [ ] `npm run smoke:protocol-follow` passa
- [ ] `npm run smoke:protocol-rate-limit` passa
- [ ] `npm run storage:setup` confirma bucket privado
- [ ] `npm run smoke:quick-report` passa
- [ ] `npm run smoke:attachment-curation` passa
- [ ] `npm run smoke:attachments-queue` passa
- [ ] `npm run smoke:attachments-ops` passa
- [ ] `npm run smoke:official-protocol` passa
- [ ] `npm run smoke:official-protocols-admin` passa
- [ ] `npm run smoke:official-protocols-metrics` passa
- [ ] `npm run smoke:pauta-spaces` passa
- [ ] `npm run smoke:pauta-contribution-safety` passa
- [ ] `npm run smoke:pauta-editorial-quality` passa
- [ ] `npm run smoke:pauta-dossier-draft` passa
- [ ] `npm run smoke:pauta-dossier-publication` passa
- [ ] `npm run smoke:pauta-dossier-double-review` passa
- [ ] `npm run smoke:pauta-dossier-review-queue` passa
- [ ] `npm run smoke:pauta-dossier-review-ops` passa
- [ ] `npm run smoke:admin-notifications` passa
- [ ] `npm run smoke:reviewer-identity` passa
- [ ] `npm run smoke:admin-team` passa
- [ ] `npm run smoke:dossier-publication-snapshots` passa
- [ ] GitHub sem segredos
- [ ] Vercel conectado ao GitHub

## Na Vercel

- [ ] importar projeto do GitHub
- [ ] configurar env vars
- [ ] configurar `COMUN_LOOKUP_HASH_SALT` com valor sensivel e aleatorio
- [ ] confirmar bucket privado `comun-report-attachments`
- [ ] confirmar bucket privado `comun-public-safe-attachments`
- [ ] criar usuario admin no Supabase Auth
- [ ] rodar `npm run bootstrap:admin -- --email email@exemplo.com`
- [ ] confirmar framework Next.js
- [ ] build command padrao
- [ ] deploy

## Depois do deploy

- [ ] confirmar que houve autorizacao explicita para validar producao
- [ ] configurar `ALLOW_PRODUCTION_CHECKS=1` apenas durante a validacao de release
- [ ] configurar `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app` apenas durante a validacao de release
- [ ] abrir `/comun`
- [ ] abrir `/comun/relatar`
- [ ] enviar relato real de teste
- [ ] abrir `/comun/admin`
- [ ] confirmar redirect para `/comun/admin/login` sem sessao
- [ ] fazer login com usuario da allowlist
- [ ] revisar relato
- [ ] criar `public_text` sanitizado
- [ ] publicar
- [ ] abrir pagina publica da pauta
- [ ] confirmar que `public_text` aparece
- [ ] confirmar que `raw_text`, `private_contact` e `internal_notes` nao aparecem
- [ ] rodar smoke HTTP de nao vazamento para a pauta publicada
- [ ] confirmar evento em `/comun/admin/auditoria`
- [ ] conferir indicadores em `/comun/admin/observabilidade`
- [ ] enviar relato rapido com foto/localizacao em celular real
- [ ] confirmar que foto e localizacao aparecem apenas no admin
- [ ] marcar anexo como precisa de blur/redacao
- [ ] subir versao publica segura e confirmar que original nao aparece publicamente
- [ ] abrir `/comun/admin/anexos`
- [ ] confirmar filtros pending, needs_redaction, rejected, public_ready e approved_private
- [ ] confirmar que a fila nao mostra `storage_path` completo nem signed URL fora do admin
- [ ] abrir `/comun/protocolo-popular`
- [ ] abrir `/comun/acompanhar/<protocolo>/ouvidoria`
- [ ] confirmar que texto de Ouvidoria nao contem `raw_text`, contato privado ou notas internas
- [ ] informar protocolo oficial fake e confirmar acompanhamento publico
- [ ] registrar resposta fake e confirmar que `response_text` nao aparece publicamente
- [ ] abrir `/comun/admin/protocolos-oficiais`
- [ ] confirmar filtros de status, comunidade, pauta, canal, numero, resposta e vencidos
- [ ] confirmar metricas de tempo medio, acumulados por pauta/comunidade/canal e possiveis dossies
- [ ] registrar resumo publico seguro e confirmar que aparece no acompanhamento
- [ ] marcar resolvido/nao resolvido sem expor resposta completa
- [ ] sair e confirmar que admin volta a exigir login
- [ ] abrir `/comun/pautas`
- [ ] criar pauta social em `/comun/admin/pautas`
- [ ] enviar contribuicao publica e confirmar que fica pendente
- [ ] confirmar desafio leve e limite de envio excessivo em contribuicoes de pauta
- [ ] abrir `/comun/admin/pautas/contribuicoes` e revisar fila global
- [ ] aprovar contribuicao e confirmar que aparece publicamente
- [ ] criar tarefa e confirmar que aparece publicamente sem contato privado
- [ ] editar sintese publica da pauta e confirmar historico de versao
- [ ] criar evidencia candidate e confirmar que nao aparece publicamente
- [ ] aprovar evidencia `public_safe` e confirmar que aparece publicamente
- [ ] criar evidencia `private_only` e confirmar que nao aparece publicamente
- [ ] criar rascunho em `/comun/admin/pautas/<id>` no bloco `Dossie da pauta`
- [ ] abrir `/comun/admin/dossies/<id>` e editar sintese, demandas e proximos passos
- [ ] abrir preview admin e confirmar que notas internas nao aparecem
- [ ] preparar versao publica revisada do dossie
- [ ] confirmar que nao existe publicacao automatica antes de aprovar
- [ ] registrar revisao factual aprovada
- [ ] registrar revisao editorial aprovada por revisor diferente
- [ ] confirmar que publicar sem dupla revisao distinta e bloqueado
- [ ] abrir `/comun/admin/dossies/revisoes`
- [ ] confirmar filtros de pendente factual, pendente editorial, bloqueados, ajustes, rejeitados e prontos
- [ ] publicar dossie aprovado e abrir `/comun/dossies/<slug>`
- [ ] confirmar que a publicacao criou snapshot e que edicao posterior do draft nao muda a rota publica
- [ ] publicar nova versao e confirmar snapshot anterior `superseded`
- [ ] despublicar com motivo obrigatorio
- [ ] fazer rollback para snapshot anterior seguro
- [ ] despublicar e confirmar que `/comun/dossies/<slug>` deixa de aparecer
- [ ] testar no celular via 4G/5G
- [ ] testar link vindo do Instagram/WhatsApp

# Acervo vivo / R2

- [ ] Criar buckets R2 distintos para originais privados e versões públicas.
- [ ] Configurar CORS de upload somente para domínios administrativos previstos.
- [ ] Configurar `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_ORIGINALS`, `R2_BUCKET_PUBLIC` e `R2_PUBLIC_BASE_URL` somente no servidor Vercel.
- [ ] Confirmar que o bucket de originais não tem leitura pública.
- [ ] Aplicar `20260714144416_archive_foundation.sql` e conferir RLS/grants.
- [ ] Rodar `npm run smoke:archive-foundation` local e em produção.
- [ ] Confirmar que HTML público não contém `object_key`, URL assinada, `editorial_notes` ou `permission_reference`.
- [ ] Rodar `npm run backup:archive-manifest` e copiar o manifest para mídia de backup.

# Ativacao R2 (Sprint 20.1)

- [ ] Criar os buckets privado e publico conforme `docs/acervo-r2-configuracao.md`.
- [ ] Configurar as sete variaveis `R2_*` em Preview e Production na Vercel.
- [ ] Aplicar CORS restrito aos dominios reais e ao localhost somente em desenvolvimento.
- [ ] Confirmar que apenas o bucket publico possui dominio publico.
- [ ] Executar o healthcheck em `/comun/admin/acervo/storage`.
- [ ] Executar `RUN_REAL_R2_SMOKE=true npm run smoke:r2-real` e confirmar cleanup 404.
- [ ] Executar `npm run audit:r2-orphans` em dry-run.
- [ ] Validar CSP report-only e `next/image` em Preview antes da promocao.

# Fotografias historicas (Sprint 21)

- [ ] migration aplicada e lintada;
- [ ] testes unitarios e smoke historico real aprovados;
- [ ] original somente no bucket privado;
- [ ] derivados WebP sem EXIF confirmados;
- [ ] sugestao permanece pending e despublicacao retorna 404;
- [ ] URL `r2.dev` registrada como temporaria ate dominio proprio.
# Gate do Acervo

- Executar a verificação descartável server-side.
- Confirmar resultado `passed`, cleanup concluído e ausência de fixtures.
- Rodar `npm run smoke:production-verification-page`.
# Gate musical

- Aplicar a migração de artistas e discografias.
- Confirmar RLS e ausência de grants públicos nas tabelas especializadas.
- Rodar `smoke:local-music-archive` e verificar que áudio é rejeitado.
- Conferir listagens e detalhes em desktop e mobile, sem dados privados.
- Rodar `smoke:music-curation`, validar histórico sanitizado, redirect privado bloqueado e filtros paginados.
# História Oral — piloto editorial

- [ ] migração aplicada e RLS/revogações confirmadas;
- [ ] smoke editorial executado somente com fixture e cleanup confirmado;
- [ ] original privado, checksum e backup validados;
- [ ] retirada, expiração e renovação validadas;
- [ ] gate humano registrado separadamente; zero entrevista real declarada sem aprovação completa.

# Hub central

- [ ] relato → pauta → evidência → ação → tarefa → protocolo → resultado validado com fixture;
- [ ] home prioriza pautas e ações; Acervo aparece depois;
- [ ] busca retorna apenas campos públicos;
- [ ] Sala de Organização, entrada e calendário exigem admin;
- [ ] RLS_MATRIX_OK e cleanup sem fixtures.

# Observatórios Populares

- [ ] migration, RLS e grants service-role validados;
- [ ] payload fora do schema rejeitado e observação nasce pending;
- [ ] snapshots usam somente accepted, metodologia, período e amostra;
- [ ] exportações contêm apenas agregados approved_public;
- [ ] portal, mapa agregado, admin e `smoke:popular-observatory` aprovados;
- [ ] fixtures e contatos privados removidos no cleanup.
# Arte dos Territórios

- Confirmar reset duplo, RLS, não vazamento, Playwright/axe, storage escolhido e cleanup.
- Bloquear release se original, termo, contato, localização privada, notes, object key ou Auth ID aparecerem no HTML.
