# Storage do COMUN

## Bucket de anexos

Bucket esperado:

- `comun-report-attachments`

Configuracao:

- privado;
- leitura publica bloqueada;
- upload feito por Server Action com `SUPABASE_SERVICE_ROLE_KEY`;
- imagens nao sao publicadas automaticamente;
- admin visualiza por signed URL temporaria.

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
- Publicacao futura de imagem deve exigir aprovacao explicita no admin.
- Se uma imagem tiver rosto, placa, documento, endereco completo ou dado pessoal, tratar como sensivel.
