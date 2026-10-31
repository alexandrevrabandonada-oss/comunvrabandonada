import { describe, expect, it } from "vitest";
import {
  COMUN_MY_AREA_TASKS_PER_GROUP,
  comunAssignedActionHref,
  comunFollowedPautaHref,
  comunPublicPautaTaskStatus,
  groupComunMyAreaTasks,
} from "./comun-my-area-task-groups";

describe("SOC-D10.L/P2 — responsabilidades comprovadas", () => {
  it("não transforma tarefas públicas das pautas acompanhadas em compromissos", () => {
    const publicTask = {
      id: "t1",
      title: "Tarefa pública",
      owner_alias: "Outra pessoa",
      pauta_id: "p1",
      status: "in_progress",
    };
    const result = groupComunMyAreaTasks([publicTask], []);
    expect(result.commitments).toEqual([]);
    expect(result.hasCommitments).toBe(false);
    expect(result.followedPautaTasks).toEqual([publicTask]);
    expect(result.hasFollowedPautaTasks).toBe(true);
  });

  it("só classifica atribuições ativas recebidas do leitor autenticado como assumidas", () => {
    const assignment = { id: "a1", task: { title: "Mutirão assumido" } };
    const pauta = { id: "p1", title: "Outra tarefa com mesmo identificador" };
    const result = groupComunMyAreaTasks([pauta], [assignment]);
    expect(result.commitments).toEqual([assignment]);
    expect(result.followedPautaTasks).toEqual([pauta]);
    expect(result.hasCommitments).toBe(true);
  });

  it("não informa ausência de responsabilidade se o leitor estiver desabilitado", () => {
    const assignment = { id: "a1", task: { title: "Tarefa" } };
    const result = groupComunMyAreaTasks([], [assignment], false);
    expect(result.commitmentState).toBe("unavailable");
    expect(result.commitments).toEqual([]);
    expect(result.commitmentTotal).toBeNull();
    expect(result.hasCommitments).toBe(false);
    expect(groupComunMyAreaTasks([], []).commitmentState).toBe("empty");
    expect(groupComunMyAreaTasks([], [assignment]).commitmentState).toBe(
      "ready",
    );
  });

  it("mantém grupos vazios e limites de apresentação independentes", () => {
    const empty = groupComunMyAreaTasks([], []);
    expect(empty.hasCommitments).toBe(false);
    expect(empty.hasFollowedPautaTasks).toBe(false);
    const publicTasks = Array.from({ length: 9 }, (_, i) => ({
      id: `p${i}`,
    }));
    const assignments = Array.from({ length: 8 }, (_, i) => ({
      id: `a${i}`,
    }));
    const result = groupComunMyAreaTasks(publicTasks, assignments);
    expect(result.commitments).toHaveLength(COMUN_MY_AREA_TASKS_PER_GROUP);
    expect(result.commitmentTotal).toBe(8);
    expect(result.followedPautaTaskTotal).toBe(9);
    expect(result.followedPautaTasks).toHaveLength(
      COMUN_MY_AREA_TASKS_PER_GROUP,
    );
  });

  it("só aceita slug de pauta interno e controlado para retorno", () => {
    expect(comunFollowedPautaHref("calcadas-em-circulacao")).toBe(
      "/comun/pautas/calcadas-em-circulacao",
    );
    expect(comunAssignedActionHref("mutirao-do-bairro")).toBe(
      "/comun/acoes/mutirao-do-bairro",
    );
    for (const value of [
      null,
      undefined,
      "",
      "../admin",
      "/comun/conta",
      "a?token=segredo",
      "a#hash",
      "https://exemplo.org",
      "a".repeat(97),
    ]) {
      expect(comunFollowedPautaHref(value)).toBeNull();
      expect(comunAssignedActionHref(value)).toBeNull();
    }
  });

  it("exibe estado de pauta sem confundi-lo com aceite da pessoa", () => {
    expect(comunPublicPautaTaskStatus("open")).toBe("Aberta na pauta");
    expect(comunPublicPautaTaskStatus("in_progress")).toBe(
      "Em andamento na pauta",
    );
    expect(comunPublicPautaTaskStatus("blocked")).toBe("Bloqueada na pauta");
    expect(comunPublicPautaTaskStatus("unexpected")).toBe(
      "Situação a verificar na pauta",
    );
  });
});
