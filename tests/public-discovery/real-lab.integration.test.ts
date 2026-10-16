// Real local Auth/PostgREST/Postgres. Skipped without the guarded owned-runner launcher.
import { expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { randomUUID } from "node:crypto";
const holder = vi.hoisted(() => ({
  client: null as ReturnType<typeof createClient<any>> | null,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: () => holder.client,
}));
import { readPublicArchiveItems } from "@/lib/archive";
import { archiveDiscovery } from "@/lib/comun-public-discovery";
it.skipIf(process.env.COMUN_DISCOVERY_VERIFIED_LAB !== "LOOPBACK_OWNED")(
  "real issued A/B sessions, public reader, withdrawal and exact cleanup",
  async () => {
    const api = process.env.COMUN_DISCOVERY_API!,
      dburl = process.env.COMUN_DISCOVERY_DB!;
    const guard = () => {
      if (
        process.env.COMUN_DISCOVERY_VERIFIED_LAB !== "LOOPBACK_OWNED" ||
        api !== "http://127.0.0.1:55431" ||
        new URL(dburl).hostname !== "127.0.0.1" ||
        new URL(dburl).port !== "55432"
      )
        throw Error("LAB_DESTINATION_REFUSED");
    };
    guard();
    const service = createClient(api, process.env.COMUN_DISCOVERY_SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    holder.client = service;
    const anonymous = () =>
      createClient(api, process.env.COMUN_DISCOVERY_ANON!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    const db = new Client({ connectionString: dburl });
    await db.connect();
    const users: string[] = [];
    const ids = Array.from({ length: 5 }, () => randomUUID());
    const prefix = `discovery-lab-${randomUUID().replaceAll("-", "")}`;
    try {
      const identities = [];
      for (const label of ["a", "b"]) {
        const password = randomUUID();
        const email = `${prefix}-${label}@example.invalid`;
        guard();
        const made = await service.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        expect(made.error).toBeNull();
        expect(made.data.user).toBeTruthy();
        users.push(made.data.user!.id);
        const client = anonymous();
        guard();
        const signed = await client.auth.signInWithPassword({
          email,
          password,
        });
        expect(signed.error).toBeNull();
        expect(signed.data.session?.access_token).toBeTruthy();
        expect((await client.auth.getUser()).data.user?.id).toBe(
          made.data.user!.id,
        );
        identities.push(client);
      }
      expect(users[0]).not.toBe(users[1]);
      for (const client of [anonymous(), ...identities]) {
        guard();
        const refused = await client.rpc(
          "comun_relata_collective_entity_server_create",
          {
            p_request_id: randomUUID(),
            p_actor_user_id: users[0],
            p_public_name: "Not authorized",
            p_entity_type: "collective",
          },
        );
        expect(refused.error?.code).toBe("42501");
      }
      for (const [i, status, visibility] of [
        [0, "published", "public"],
        [1, "draft", "public"],
        [2, "published", "private"],
        [3, "unpublished", "public"],
        [4, "published", "public"],
      ] as const) {
        guard();
        await db.query(
          "insert into public.comun_archive_items(id,slug,item_type,title,summary,credits,rights_status,status,visibility,published_at) values($1,$2,'photograph','Memória do laboratório','Uma memória local.','Acervo local',$3,$4,$5,now())",
          [
            ids[i],
            `${prefix}-${i}`,
            i === 4 ? "restricted" : "licensed",
            status,
            visibility,
          ],
        );
      }
      const read = await readPublicArchiveItems({
        q: "Memória do laboratório",
      });
      expect(read.state).toBe("ready");
      const projected = archiveDiscovery(read);
      expect(
        projected.items.filter((i) => i.path.includes(prefix)),
      ).toHaveLength(1);
      expect(projected.items[0].path).toContain(`${prefix}-0`);
      expect(JSON.stringify(projected)).not.toMatch(
        /example.invalid|object_key|user_id/,
      );
      guard();
      await db.query(
        "update public.comun_archive_items set status='unpublished' where id=$1",
        [ids[0]],
      );
      expect(
        archiveDiscovery(
          await readPublicArchiveItems({ q: "Memória do laboratório" }),
        ).items.filter((i) => i.path.includes(prefix)),
      ).toHaveLength(0);
      for (const client of identities) {
        guard();
        expect((await client.auth.signOut()).error).toBeNull();
        expect((await client.auth.getUser()).data.user).toBeNull();
      }
    } finally {
      guard();
      await db.query(
        "delete from public.comun_archive_items where id=any($1::uuid[])",
        [ids],
      );
      expect(
        Number(
          (
            await db.query(
              "select count(*) from public.comun_archive_items where id=any($1::uuid[])",
              [ids],
            )
          ).rows[0].count,
        ),
      ).toBe(0);
      for (const id of users) {
        guard();
        expect((await service.auth.admin.deleteUser(id)).error).toBeNull();
      }
      expect(
        Number(
          (
            await db.query(
              "select count(*) from auth.users where id=any($1::uuid[])",
              [users],
            )
          ).rows[0].count,
        ),
      ).toBe(0);
      await db.end();
      holder.client = null;
    }
  },
  120000,
);
