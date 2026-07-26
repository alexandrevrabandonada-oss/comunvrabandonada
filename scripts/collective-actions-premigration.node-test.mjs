import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("collective actions routes fail closed before querying absent tables", () => {
  const index = read("app/comun/acoes/page.tsx");
  const detail = read("app/comun/acoes/[slug]/page.tsx");
  const member = read("app/comun/minha-participacao/page.tsx");
  const actions = read("app/comun/acoes/actions.ts");
  const adminActions = read("app/comun/admin/acoes/actions.ts");
  const adminProxy = read("lib/supabase/middleware.ts");
  assert.ok(
    index.indexOf("!previewFixtures && !release.enabled") <
      index.lastIndexOf("listPublicCollectiveActions"),
  );
  assert.ok(
    detail.indexOf("!previewFixtures && !release.enabled") <
      detail.lastIndexOf("getPublicCollectiveAction"),
  );
  assert.match(
    member,
    /collectiveActionsRelease\.enabled\s*\?\s*listMemberCollectiveActions/,
  );
  assert.ok(
    actions.indexOf("await requireCollectiveActionsRelease()") <
      actions.indexOf("comun_collective_actions"),
  );
  assert.ok(
    adminActions.indexOf("await requireCollectiveActionsRelease()") <
      adminActions.indexOf("comun_collective_actions"),
  );
  assert.match(adminProxy, /pathname === "\/comun\/admin\/acoes"/);
  assert.match(adminProxy, /process\.env\.VERCEL_ENV === "preview"/);
  assert.match(
    adminProxy,
    /COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES === "enabled"/,
  );
  assert.ok(
    adminProxy.indexOf(
      "if (isCollectiveActionsPreviewAdmin) return response;",
    ) < adminProxy.indexOf("supabase.auth.getUser"),
  );
  console.log("COMUN_COLLECTIVE_ACTIONS_PREMIGRATION_COMPAT_GREEN");
});
