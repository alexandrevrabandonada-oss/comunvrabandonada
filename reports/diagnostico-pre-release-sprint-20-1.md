# Diagnostico pre-release — Sprint 20.1

Data: 2026-07-14  
Branch: `codex/comun-admin-auth-remote`  
Base auditada: `8f99186` (`feat: consolida portal e atualiza plataforma`)

## Estado inicial

O worktree estava limpo. A base ja continha Next.js 16.2.10, React 19.2.7 e a fundacao do Acervo Vivo. Foram excluidos do escopo arquivos de ambiente, dependencias, saidas de build, logs, backups e metadados locais da Vercel.

## Diagnostico

- Docker 29.2.1 disponivel; Supabase local iniciado com sucesso.
- Matriz local de RLS executada sem falhas.
- As sete variaveis R2 requeridas nao estao configuradas no ambiente local; nenhum nome de bucket, chave, token ou URL assinada foi registrado.
- A CLI Vercel possui sessao valida, mas deploy e smoke de producao dependem primeiro da configuracao externa do R2.
- A implementacao anterior emitia upload assinado sem confirmacao por `HEAD`, nao possuia healthcheck operacional, auditoria de orfaos nem smoke real protegido por flag.

## Plano de commits

1. endurecer o adapter R2 e confirmar uploads reais;
2. adicionar saude operacional, smoke e auditoria segura;
3. ajustar imagens, CSP, documentacao e relatorios;
4. executar gates e registrar bloqueios externos com honestidade.
