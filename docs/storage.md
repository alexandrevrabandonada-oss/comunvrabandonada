# Storage do COMUN

## Buckets de anexos

Buckets esperados:

- `comun-report-attachments`
- `comun-public-safe-attachments`

Configuracao:

- privado;
- leitura publica bloqueada;
- upload feito por Server Action com `SUPABASE_SERVICE_ROLE_KEY`;
- imagens nao sao publicadas automaticamente;
- admin visualiza por signed URL temporaria.

Uso:

- `comun-report-attachments`: arquivo original enviado no relato. Nunca publicar por padrao.
- `comun-public-safe-attachments`: versao manualmente redigida/blurada e aprovada. Tambem fica em bucket privado.
- exibicao publica futura deve passar por controle server-side e signed URL curta apenas da versao segura.

## Criar ou validar bucket

Com `.env.local` configurado:

```bash
npm run storage:setup
```

O script:

- usa a service role apenas no servidor/local;
- cria o bucket se ele nao existir;
- ajusta o bucket para privado se necessario;
- nao imprime segredos.

## Regras operacionais

- Nunca colocar `SUPABASE_SERVICE_ROLE_KEY` no client.
- Nunca transformar o bucket em publico.
- Fotos enviadas por relato ficam privadas ate curadoria.
- Publicacao futura de imagem deve exigir aprovacao explicita no admin e versao segura separada.
- `public_approved=true` so deve existir quando `review_status='public_ready'` e `public_storage_path` apontar para `comun-public-safe-attachments`.
- Se uma imagem tiver rosto, placa, documento, endereco completo ou dado pessoal, tratar como sensivel.
