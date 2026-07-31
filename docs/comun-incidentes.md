# Resposta a incidentes do COMUN

Este é o runbook único. A Central Operacional recebe uma projeção sanitizada e
deduplicada; a evidência privada permanece no sistema responsável.

## Severidade

- **P0:** vazamento confirmado, controle administrativo comprometido,
  corrupção/perda ampla, original privado público ou credencial crítica
  exposta. Contenção imediata.
- **P1:** bypass de autorização, signed URL indevida, perda parcial, restore
  indisponível, retirada travada ou vulnerabilidade explorável. Responsável em
  até 4 h.
- **P2:** falha contida, alerta sem impacto confirmado, job degradado ou
  inconsistência recuperável. Responsável em até 24 h.

## Ciclo obrigatório

1. detectar sem copiar payload privado;
2. classificar P0/P1/P2;
3. conter (bloquear rota, revogar papel/sessão, despublicar, pausar job);
4. atribuir papel responsável e substituto;
5. preservar evidência com acesso restrito;
6. investigar a causa e o alcance;
7. corrigir com mudança pequena e auditável;
8. recuperar e executar smoke negativo;
9. comunicar somente estado, impacto agregado e próxima ação;
10. encerrar após postflight;
11. registrar retrospectiva;
12. criar ação preventiva com dono e prazo.

Comunicação e artifact nunca incluem dados pessoais, credenciais, IDs brutos,
object keys, localização, documento, URL privada ou detalhe explorável.

## Contenção por superfície

| Superfície                  | Contenção inicial                                            | Recuperação                                                      |
| --------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| RLS/grant/RPC               | revogar acesso ou segurar API; preservar consulta sanitizada | migration corretiva forward-only, persona negativa e advisors    |
| Signed URL/original público | despublicar/invalidar caminho e conter bucket                | revisar policy, nova derivada e teste HTTP negativo              |
| Credencial                  | remover exposição, invalidar artifact e iniciar dupla chave  | rotacionar sem interromper produção, revogar chave anterior      |
| Banco                       | parar mutations afetadas; não restaurar sobre produção       | restore isolado, integridade e plano de promoção                 |
| Storage                     | suspender limpeza/publicação no escopo                       | backup físico, restore sintético e reconciliação metadata/objeto |
| Auth/admin                  | revogar sessão e papel, usar substituto operacional          | reautenticar, revisar logs e menor privilégio                    |
| Migration/deployment        | interromper promoção e manter tráfego no artifact verde      | rollback transacional/Preview, forward fix e smoke               |
| Retirada urgente            | despublicar primeiro, preservar pedido em privado            | concluir remoção/anonimização com evidência sanitizada           |

O workflow cria um envelope sanitizado antes da primeira escrita e o finaliza
como `00-failure.json` se qualquer etapa falhar. Não há retry cego.
`launch_publicly` nunca é acionado por incidente ou recovery.
