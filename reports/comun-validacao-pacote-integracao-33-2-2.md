# Validação do pacote de integração — Sprint 33.2.2

Status: não iniciada. A validação limpa exige um novo terceiro worktree baseado em `4ba631d`, sem junction e com `npm ci` dentro da própria raiz. Ela só será criada quando lint, typecheck, build, E2E, Axe, visual e performance do pacote estiverem verdes no isolado.

O terceiro worktree anterior não foi reutilizado por conter uma junction de `node_modules`; não foi alterado nem apagado. Nenhum commit foi aplicado no worktree principal.
