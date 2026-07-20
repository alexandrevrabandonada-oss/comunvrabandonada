# Pacote de pressão popular — Sprint 37

Status: **IMPLEMENTADO E VALIDADO EM UNIDADE; E2E INTEGRAL PENDENTE**.

- página pública local em `/comun/calcadas/pressao/[id]`;
- Markdown para download;
- JSON com `schemaVersion: 1.0`;
- projeção construída somente com campos públicos selecionados;
- verificador recursivo bloqueia chaves de contato, membro, autoria, conteúdo privado, original, object key, URL assinada, consentimento e IDs técnicos privados;
- teste positivo e testes negativos de vazamento aprovados.

O pacote ainda precisa ser criado pela jornada operacional fixture e percorrido no E2E. Por isso o marcador abaixo permanece retido.

`COMUN_SIDEWALK_PRESSURE_PACKAGE_SANITIZED_OK` não emitido.
