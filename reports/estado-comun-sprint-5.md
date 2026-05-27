# Estado COMUN Sprint 5

Data: 2026-05-27

## Objetivo do tijolo

Fortalecer as paginas publicas de comunidades e pautas para expor apenas conteudo publico/sanitizado, com CTAs claros, estados vazios honestos e identidade visual coerente com o COMUN.

## Rotas cobertas

- `/comun/comunidades`
- `/comun/c/[slug]`
- `/comun/pautas/[slug]`

## O que mudou

### 1. Lista de comunidades

Arquivo alterado:

- [app/comun/comunidades/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/comunidades/page.tsx>)

Ajustes:

- reforco visual dos cards com icone/sigla da comunidade
- leitura mais clara da grade publica
- mantida a navegacao simples para cada comunidade

### 2. Pagina de comunidade

Arquivo alterado:

- [app/comun/c/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/c/[slug]/page.tsx>)

Ajustes:

- CTA principal fixado como `Enviar relato nesta comunidade`
- bloco de pautas relacionadas com estado vazio honesto
- bloco de relatos publicados usando apenas `public_text`
- bloco de materiais uteis basicos
- estado vazio honesto quando nao houver materiais ou relatos
- `revalidate = 0` para reduzir risco de pagina publica servindo dado antigo

### 3. Pagina de pauta

Arquivo alterado:

- [app/comun/pautas/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/pautas/[slug]/page.tsx>)

Ajustes:

- comunidade relacionada agora aparece com link
- CTA `Enviar relato parecido`
- CTA placeholder `Acompanhar pauta`
- linha do tempo, materiais uteis e proximos passos com fallback honesto
- relatos associados com card publico usando apenas conteudo sanitizado
- estado vazio honesto quando nao houver relato publicado
- `revalidate = 0` para reduzir risco de dado antigo
- filtro de relatos da pauta feito a partir do conjunto publico da comunidade, seguido de filtro por `issue_slug` na propria pagina

## Regras de seguranca mantidas

- so relatos publicados/publicos entram nas paginas
- o texto exibido vem de `public_text`
- `raw_text` nao aparece publicamente
- `private_contact` nao aparece publicamente
- nenhuma feature de comentario ou likes foi criada

## Verificacao

### Build e verificacao

Comando:

```bash
npm run verify
```

Resultado:

- `lint`: passou
- `typecheck`: passou
- `build`: passou

### Teste de paginas publicas

Validado em servidor local de producao (`next start`):

- `/comun/comunidades`: abriu corretamente
- `/comun/c/trabalho`: abriu corretamente e exibiu CTA, materiais uteis e relato publico sanitizado
- `/comun/pautas/falta-profissionais-escolas`: abriu corretamente e exibiu estado vazio honesto
- `/comun/pautas/trabalho-burnout-volta-redonda`: abriu corretamente, exibiu CTA e relato publico publicado, sem vazamento de texto bruto ou contato privado

### Observacao importante sobre frescor da pauta

Durante o teste com insercao de um relato publicado temporario, a pagina de comunidade refletiu o novo relato imediatamente, mas a pagina de pauta nao refletiu esse novo item na mesma janela de teste.

Mesmo assim:

- a pauta publicada exibiu relato publico valido
- nenhum dado sensivel vazou
- a pagina vazia funcionou

Conclusao pratica deste tijolo:

- a superficie publica esta correta do ponto de vista editorial e de seguranca
- ainda existe uma pendencia de consistencia/frescor para publicacoes novas por pauta, que merece um tijolo proprio

## Arquivos alterados

- [app/comun/comunidades/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/comunidades/page.tsx>)
- [app/comun/c/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/c/[slug]/page.tsx>)
- [app/comun/pautas/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/pautas/[slug]/page.tsx>)

## Riscos

1. A pagina de pauta ainda apresentou inconsistencia de atualizacao imediata para um relato publicado temporario criado durante o teste.
2. O modulo ja tem varias alteracoes locais preexistentes fora deste tijolo, o que exige cuidado antes de consolidar commits.
3. Ainda nao existe smoke dedicado que valide continuamente o frescor de relato novo por pauta.

## Proximos passos recomendados

1. Criar um tijolo especifico de consistencia/cache para relatos publicados por pauta.
2. Adicionar smoke HTTP dedicado para:
   - comunidade com relato publicado
   - pauta com relato publicado
   - pauta sem relato publicado
3. Refinar a navegacao de `Acompanhar pauta` quando houver estrategia clara de acompanhamento publico.
