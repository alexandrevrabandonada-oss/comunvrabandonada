# Upload direto privado — Sprint 39.1

## Implementado

O navegador comprime a imagem, cria a sessão quando necessário, recebe autorização limitada a um único caminho privado e envia diretamente ao Supabase Storage. A Server Action transporta apenas metadados e autorização; não transporta os bytes da fotografia.

O ticket privado expira em 10 minutos e passa por `awaiting_upload`, `uploaded`, `confirmed`, `upload_failed` ou `abandoned`. A confirmação verifica usuário, prazo, existência do objeto, assinatura mágica, MIME, dimensões e tamanho antes de criar o registro `under_review`, a foto privada e a mensagem na Inbox. O caminho contém `auth.uid` e UUID da autorização. Nenhuma service-role key chega ao cliente.

`npm run cleanup:comun-sidewalk-uploads` remove objetos expirados somente no Supabase local e marca os tickets como abandonados.

Validação E2E móvel: aprovada em 360×800, incluindo upload, confirmação e redirecionamento. Nenhum original ou object key apareceu no HTML público.
