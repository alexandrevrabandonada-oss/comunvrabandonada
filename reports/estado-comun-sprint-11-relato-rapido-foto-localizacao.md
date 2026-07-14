# Estado COMUN Sprint 11 - relato rapido com foto e localizacao

Data: 2026-05-28

## Objetivo

Criar o modo `Relato rapido` no formulario publico, com suporte inicial a foto privada e localizacao aproximada/interna, mantendo o fluxo detalhado existente.

Experiencia alvo:

- viu um problema;
- tirou foto;
- informou localizacao aproximada;
- escolheu categoria;
- enviou sem login.

## Migration criada

- [supabase/migrations/202605280001_quick_report_photo_location.sql](</C:/Projetos/COMUM VR ABANDONADA/supabase/migrations/202605280001_quick_report_photo_location.sql>)

Status:

- aplicada no Supabase remoto;
- sem gravar senha do banco em arquivo versionado;
- `comun_reports` recebeu campos de relato rapido, localizacao e anexos;
- `comun_report_attachments` criada com RLS.

## Campos novos

Em `comun_reports`:

- `quick_report`
- `latitude`
- `longitude`
- `location_accuracy`
- `location_source`
- `public_location_level`
- `photo_count`
- `has_attachments`
- `source_channel`

Tabela nova:

- `comun_report_attachments`

Campos principais:

- `report_id`
- `storage_bucket`
- `storage_path`
- `original_filename`
- `mime_type`
- `size_bytes`
- `attachment_type`
- `public_approved`
- `created_at`

Regra:

- `public_approved` fica `false` por padrao;
- anexo nao e publico por padrao;
- leitura publica por RLS bloqueada.

## Storage/bucket

Bucket:

- `comun-report-attachments`

Status:

- criado como privado via `npm run storage:setup`;
- upload feito por Server Action com service role;
- admin ve anexos por signed URL temporaria;
- bucket nao deve ser publico.

Documentacao criada:

- [docs/storage.md](</C:/Projetos/COMUM VR ABANDONADA/docs/storage.md>)

## Modo rapido

Arquivo principal:

- [app/comun/relatar/report-form.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/report-form.tsx>)

Mudancas:

- adicionada alternancia `Relato rapido` / `Relato detalhado`;
- fluxo detalhado continua disponivel;
- modo rapido pede categoria, foto opcional, localizacao, descricao curta, anonimato, autorizacao de publicacao sanitizada e contato opcional.

Categorias rapidas:

- Buraco ou calcada
- Lixo ou entulho
- Poluicao ou po preto
- Iluminacao
- Transporte
- Escola
- Saude
- Trabalho
- Outro

Mapeamento inicial:

- buraco/calcada -> `cidade`
- lixo/entulho -> `cidade`
- poluicao/po preto -> `meio-ambiente`
- iluminacao -> `cidade`
- transporte -> `cidade`
- escola -> `escolas`
- saude -> `saude`
- trabalho -> `trabalho`
- outro -> `cidade`

## Backend

Arquivo:

- [app/actions.ts](</C:/Projetos/COMUM VR ABANDONADA/app/actions.ts>)

Mudancas:

- `submitReport` agora aceita `quick_report`;
- relato rapido aceita descricao minima de 8 caracteres;
- relato detalhado mantem minimo de 20 caracteres;
- gera protocolo igual ao fluxo existente;
- salva localizacao internamente quando fornecida;
- salva foto em bucket privado quando enviada;
- cria registro em `comun_report_attachments`;
- se upload falhar, relato nao e perdido: registra nota interna e zera marcadores de anexo.

## Localizacao

UI:

- botao `Usar minha localizacao aproximada`;
- usa `navigator.geolocation` no client;
- salva latitude/longitude arredondadas a 5 casas no input interno;
- permite local manual quando a pessoa nega permissao.

Seguranca:

- latitude/longitude nao entram na view publica;
- pagina publica de acompanhamento nao mostra coordenadas;
- publicacao deve usar local aproximado ou sanitizado.

## Foto/upload

UI:

- `input type=file accept=image/* capture=environment`;
- texto orienta que foto ajuda, mas fica privada para curadoria.

Backend:

- bucket privado `comun-report-attachments`;
- path por protocolo;
- attachment registrado com `public_approved=false`;
- signed URL temporaria somente no admin.

## Admin

Arquivos:

- [app/comun/admin/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/page.tsx>)
- [app/comun/admin/relatos/[id]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/relatos/[id]/page.tsx>)
- [lib/reports.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/reports.ts>)

Mudancas:

- inbox mostra badges `Relato rapido` e `Com foto`;
- filtros `Relato rapido` e `Foto`;
- revisao mostra localizacao interna;
- revisao lista anexos privados;
- admin abre imagem por signed URL temporaria;
- aviso explicito: `Anexo privado. Nao publicar sem revisao.`

## Confirmacao

Arquivo:

- [app/comun/relatar/confirmacao/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/confirmacao/page.tsx>)

Mudanca:

- quando `modo=rapido`, informa que foto/localizacao ficam internas para curadoria;
- protocolo e link de acompanhamento foram mantidos.

## Seguranca

Arquivo:

- [app/comun/seguranca/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/seguranca/page.tsx>)

Atualizacoes:

- foto nao e publica automaticamente;
- localizacao precisa fica interna;
- contato privado nunca e publicado;
- relato bruto continua interno.

## Smokes locais

Rodados:

- `npm run lint`: passou
- `npm run typecheck`: passou
- `npm run build`: passou
- `npm run verify`: passou
- `npm run smoke:comun`: passou
- `npm run smoke:admin-auth`: passou
- `npm run smoke:no-leak-http`: passou
- `npm run smoke:public-ui`: passou
- `npm run smoke:protocol-follow`: passou
- `npm run smoke:protocol-rate-limit`: passou
- `npm run smoke:quick-report`: passou

Novo smoke:

- [scripts/smoke-comun-quick-report.mjs](</C:/Projetos/COMUM VR ABANDONADA/scripts/smoke-comun-quick-report.mjs>)

Cobertura:

- insere relato rapido sem foto com localizacao fake;
- confirma `quick_report=true`;
- confirma latitude/longitude internas;
- confirma que `comun_public_reports` nao expoe localizacao precisa;
- confirma que acompanhamento publico nao vaza raw/location;
- valida bucket privado quando configurado;
- faz upload de imagem pequena;
- confirma attachment privado;
- limpa relato e anexo.

## Deploy

Commit:

- `feat: adiciona relato rapido com foto e localizacao`

Deploy:

- feito com `npx vercel deploy --prod --yes`;
- build Vercel passou;
- producao alias atualizada.

URL publica:

- [https://comunvrabandonada.vercel.app](https://comunvrabandonada.vercel.app)

## Smokes em producao

Rodados com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`:

- `npm run smoke:admin-auth`: passou
- `npm run smoke:no-leak-http`: passou
- `npm run smoke:public-ui`: passou
- `npm run smoke:protocol-follow`: passou
- `npm run smoke:protocol-rate-limit`: passou
- `npm run smoke:quick-report`: passou

## Teste em celular real

Status:

- pendente neste ambiente, por depender de aparelho fisico Android/4G/5G e permissao real de camera/localizacao.

Roteiro obrigatorio:

1. abrir `/comun` no Android por 4G/5G;
2. tocar em `Enviar relato`;
3. escolher `Relato rapido`;
4. tirar foto com camera;
5. permitir localizacao;
6. preencher descricao curta;
7. enviar;
8. copiar protocolo;
9. abrir acompanhamento;
10. entrar no admin;
11. conferir foto/localizacao internas;
12. confirmar que nada disso apareceu publicamente sem curadoria.

## Riscos restantes

1. Teste em celular fisico ainda precisa ser executado e registrado.
2. O upload aceita imagens comuns e bucket privado, mas ainda nao ha pipeline de redacao/blur para imagem.
3. Localizacao precisa fica interna; antes de qualquer mapa publico, sera necessario definir politica de agregacao e reducao de precisao.
4. Se o bucket privado for alterado manualmente para publico, o risco aumenta. O checklist de deploy agora inclui validacao com `npm run storage:setup`.

## Proximo tijolo recomendado

Criar curadoria de anexos no admin: aprovar/reprovar foto, marcar necessidade de blur/redacao, gerar versao publica segura e nunca publicar o arquivo original por padrao.
