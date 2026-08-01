import { describe, expect, it } from "vitest";
import {
  groupComunInbox,
  resolveComunInboxGroup,
} from "@/lib/comun-inbox-presentation";

describe("apresentação funcional da Caixa", () => {
  it("separa ação, decisão, resultado e encerrado sem inferência pessoal", () => {
    expect(
      resolveComunInboxGroup({ notification_type: "information_requested" }),
    ).toBe("action");
    expect(
      resolveComunInboxGroup({ notification_type: "official_response" }),
    ).toBe("decision");
    expect(
      resolveComunInboxGroup({ notification_type: "result_registered" }),
    ).toBe("result");
    expect(
      resolveComunInboxGroup({
        notification_type: "task_due",
        resolved_at: "2026-08-01",
      }),
    ).toBe("closed");
  });

  it("mantém a ordem funcional mesmo quando os dados chegam misturados", () => {
    const groups = groupComunInbox([
      { notification_type: "result_registered" },
      { notification_type: "radio_update" },
      { notification_type: "task_due" },
    ]);
    expect(groups.map((group) => group.group)).toEqual([
      "action",
      "update",
      "result",
    ]);
  });
});
