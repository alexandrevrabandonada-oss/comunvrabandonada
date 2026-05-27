# Estado COMUN Sprint 8.1 - deploy, mobile e confirmacao

Data: 2026-05-27

## Objetivo do tijolo

Publicar os ajustes de UX do Sprint 8, melhorar a pagina de confirmacao do relato e validar o dominio publicado sem abrir novas features.

## O que mudou na confirmacao

Arquivos criados/alterados:

- [app/comun/relatar/confirmacao/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/confirmacao/page.tsx>)
- [app/comun/relatar/confirmacao/copy-protocol-button.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/confirmacao/copy-protocol-button.tsx>)
- [components/comun-shell.tsx](</C:/Projetos/COMUM VR ABANDONADA/components/comun-shell.tsx>)

Melhorias aplicadas:

1. Titulo principal claro:
   - `Seu relato foi recebido.`

2. Bloco de protocolo COMUN:
   - protocolo em destaque;
   - botao `Copiar protocolo`;
   - texto de orientacao para guardar o numero.

3. Bloco `O que acontece agora?`:
   - a equipe revisa o relato;
   - versao sanitizada pode ser publicada se houver autorizacao;
   - dados pessoais e contato privado nao sao publicados;
   - o relato pode virar pauta, dossie, post ou encaminhamento.

4. Bloco honesto sobre acompanhamento:
   - informa que o acompanhamento por protocolo ainda nao foi liberado;
   - orienta a guardar o numero e acompanhar as pautas publicas.

5. Bloco `Proximas acoes`:
   - `Enviar outro relato`
   - `Ver comunidades`
   - `Ver pautas em acompanhamento`
   - `Entender seguranca`

## Status do CTA mobile

O CTA fixo `Enviar relato` continua ativo no shell publico.

Ajuste fino aplicado:

- `main` com `pb-28` no shell publico;
- area fixa com `safe-area-inset-bottom` para evitar choque com navegacao do aparelho.

Status:

- o CTA continua visivel;
- na validacao headless mobile nao cobriu o bloco principal da confirmacao;
- o CTA ainda precisa de passada manual em aparelho real Android para confirmar conforto de uso no fim do scroll.

## Status do deploy

Deploy de producao executado com:

```bash
npx vercel deploy --prod --yes
```

Resultado:

- deploy concluido
- alias de producao confirmado

URL publica:

- [https://comunvrabandonada.vercel.app](https://comunvrabandonada.vercel.app)

Deploy inspecionado:

- build Next.js passou em producao
- rota `/comun/relatar/confirmacao` publicada com sucesso

## Status dos smokes locais

Validado localmente:

- `npm run verify`: passou
- `npm run smoke:comun`: passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:4020 npm run smoke:admin-auth`: passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:4020 npm run smoke:no-leak-http`: passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:4020 npm run smoke:public-ui`: passou

## Status dos smokes em producao

Validado com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`:

- `npm run smoke:comun`: passou
- `npm run smoke:admin-auth`: passou
- `npm run smoke:no-leak-http`: passou
- `npm run smoke:public-ui`: passou

## Validacao no dominio publicado

Rotas checadas com status `200`:

- `/comun`
- `/comun/relatar`
- `/comun/relatar/confirmacao?protocolo=COMUN-TESTE`
- `/comun/comunidades`
- `/comun/c/trabalho`
- `/comun/pautas/trabalho-burnout-volta-redonda`
- `/comun/dossies`
- `/comun/seguranca`

Protecao validada:

- `/comun/admin` continua exigindo login via `smoke:admin-auth`

## Prints / descricao dos testes

Capturas headless em viewport mobile `390x844` no dominio publicado mostraram:

1. `/comun`
   - CTA principal `Enviar relato agora` visivel;
   - CTA fixo `Enviar relato` presente no rodape.

2. `/comun/relatar/confirmacao?protocolo=COMUN-TESTE`
   - protocolo `COMUN-TESTE` em destaque;
   - botao `Copiar protocolo` visivel;
   - bloco `O que acontece agora?` legivel;
   - CTA fixo no rodape sem cobrir o bloco principal acima da dobra capturada.

## Status do teste em celular real

Checklist registrado para execucao manual:

1. Abrir `/comun` no celular por 4G/5G.
2. Confirmar CTA `Enviar relato` visivel.
3. Confirmar que o CTA nao cobre conteudo importante.
4. Abrir `/comun/relatar`.
5. Preencher relato curto de teste.
6. Confirmar que o formulario e tocavel e legivel.
7. Chegar na confirmacao.
8. Confirmar que protocolo e proximos passos estao claros.
9. Abrir link pelo WhatsApp.
10. Abrir link pelo Instagram.
11. Testar em pelo menos um celular Android.

Status:

- checklist registrado: sim
- execucao em aparelho real neste ciclo: pendente

## Problemas encontrados

1. Nenhum problema novo de deploy ou de vazamento apareceu em producao.
2. O ponto restante continua operacional:
   - falta o teste em celular real fora do ambiente local.

## Riscos restantes

1. O CTA fixo mobile esta tecnicamente seguro nas validacoes automatizadas, mas ainda precisa da passada real em Android.
2. O acompanhamento por protocolo segue inexistente; a pagina agora comunica isso de forma honesta, mas o recurso ainda e futuro.
3. A validacao visual em navegador comum foi feita por checagem HTTP e captura headless, nao por interacao manual completa no browser do usuario.

## Proximo tijolo recomendado

Implementar o acompanhamento por protocolo de forma publica e segura, com consulta limitada por numero de protocolo e sem expor dados internos ou contato privado.
