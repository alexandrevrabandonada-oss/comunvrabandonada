# Tijolo 32 - Release candidate

Decisao: `RC_LOCAL_PASS`

## Escopo validado

- Relato publico e view sanitizada.
- Admin auth sem sessao.
- Nao vazamento HTTP.
- Relato rapido.
- Curadoria de anexos.
- Protocolos oficiais.
- Pautas, contribuicoes, evidencias e historico editorial.
- Rascunho, revisao, fila e operacao de dossies.
- Notificacoes internas.
- Identidade real e matriz de equipe admin.
- Publicacao por snapshots, despublicacao e rollback.
- Pagina publica, indice, navegacao e destaques de dossies.
- Hardening RLS e matriz RLS.

## Comando de RC

```bash
npm run verify:rc-local
```

## Condicoes para manter RC valida

- Rodar somente contra Supabase local/autorizado.
- Manter `NEXT_PUBLIC_SITE_URL=http://localhost:3000` ou `http://127.0.0.1:<porta>`.
- Nao executar deploy junto da RC local.
- Rodar validacao de producao apenas em etapa de release explicitamente autorizada.
