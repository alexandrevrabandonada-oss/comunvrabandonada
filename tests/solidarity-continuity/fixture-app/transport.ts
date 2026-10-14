// Test-only Auth/RPC transport. Actual components, actions and server DTO mapping run unchanged.
// This is NOT Auth/Postgres/RLS integration and never opens a database/network connection.
import { cookies } from "next/headers";
import { ids, world, organization } from "./world";
export function hasSupabaseConfig() {
  return false;
}
export function createPublicSupabaseClient() {
  return null;
}
export async function createSupabaseServerClient() {
  const store = await cookies();
  return {
    auth: {
      async getUser() {
        const id = store.get("soc-d08-user")?.value;
        return {
          data: {
            user: Object.values(ids)
              .slice(0, 3)
              .includes(id as string)
              ? {
                  id: id!,
                  last_sign_in_at: world().logins[id!],
                  email: "synthetic@example.invalid",
                }
              : null,
          },
          error: null,
        };
      },
      async signInWithPassword({
        email,
        password,
      }: {
        email: string;
        password: string;
      }) {
        const key = email.split("@")[0] as "a" | "b" | "editor";
        const id = ids[key];
        if (
          !id ||
          !email.endsWith("@example.invalid") ||
          password !== "synthetic-only-password"
        )
          return {
            data: { user: null },
            error: { message: "Invalid credentials" },
          };
        world().logins[id] = new Date(
          1_000_000 + ++world().signins * 1000,
        ).toISOString();
        store.set("soc-d08-user", id, {
          httpOnly: true,
          sameSite: "strict",
          path: "/",
        });
        return { data: { user: { id } }, error: null };
      },
      async signOut() {
        world().logouts++;
        if (world().logoutFails)
          return { error: { message: "synthetic Auth unavailable" } };
        store.delete("soc-d08-user");
        return { error: null };
      },
    },
  };
}
export function createServiceSupabaseClient() {
  return {
    from() {
      let user = "";
      const chain = {
        select() {
          return chain;
        },
        eq(_key: string, value: string) {
          user = value;
          return chain;
        },
        async maybeSingle() {
          return {
            data: {
              user_id: user,
              display_name: "Pessoa sintética",
              status: "active",
              profile_visibility: "private",
              onboarding_completed_at: "2026-01-01",
            },
            error: null,
          };
        },
      };
      return chain;
    },
    async rpc(name: string, p: Record<string, any>) {
      const w = world();
      const error = (code: string) => ({
        data: null,
        error: { message: code },
      });
      if (name.startsWith("comun_create_solidarity_")) {
        if (!w.published)
          return error("COMUN_SOLIDARITY_CONNECTION_SUBJECT_UNAVAILABLE");
        if (!w.eligible)
          return error("COMUN_SOLIDARITY_CONNECTION_ORGANIZATION_INELIGIBLE");
        const kind = p.p_offer_id ? "offer" : "need";
        const subject = p.p_offer_id ?? p.p_need_id;
        let row = w.rows.find((r) => r.request === p.p_request_id);
        if (
          row &&
          (row.member !== p.p_member_user_id || row.subject_id !== subject)
        )
          return error("COMUN_SOLIDARITY_CONNECTION_IDEMPOTENCY_CONFLICT");
        row ??= w.rows.find(
          (r) =>
            r.member === p.p_member_user_id &&
            r.subject_id === subject &&
            ["pending", "accepted"].includes(r.connection_state),
        );
        if (row)
          return {
            data: [
              { connection_state: row.connection_state, idempotent: true },
            ],
            error: null,
          };
        row = {
          request: p.p_request_id,
          member: p.p_member_user_id,
          interest_id: `a5000000-0000-4000-8000-${String(w.rows.length + 100).padStart(12, "0")}`,
          subject_kind: kind,
          subject_id: subject,
          subject_slug: kind === "offer" ? "oferta-lab" : "necessidade-lab",
          subject_title:
            kind === "offer"
              ? "Oferta sintética de livros"
              : "Ajuda sintética com livros",
          organization_slug: organization.slug,
          organization_name: organization.publicName,
          connection_state: "pending",
          message_private: p.p_message_private,
          contact_private: p.p_contact_private,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        w.rows.push(row);
        return {
          data: [{ connection_state: "pending", idempotent: false }],
          error: null,
        };
      }
      if (name === "comun_list_my_solidarity_connections_v1")
        return {
          data: w.rows.filter((r) => r.member === p.p_member_user_id),
          error: null,
        };
      if (
        name === "comun_review_solidarity_connection_v1" ||
        name === "comun_withdraw_solidarity_connection_v1"
      ) {
        const row = w.rows.find(
          (r) =>
            r.interest_id === p.p_interest_id &&
            r.subject_kind === p.p_subject_kind,
        );
        if (!row) return error("COMUN_SOLIDARITY_CONNECTION_FORBIDDEN");
        const review = name === "comun_review_solidarity_connection_v1";
        if (
          (review &&
            (p.p_actor_user_id !== ids.editor ||
              p.p_expected_organization_territory_id !== ids.org)) ||
          (!review && p.p_member_user_id !== row.member)
        )
          return error("COMUN_SOLIDARITY_CONNECTION_FORBIDDEN");
        row.connection_state = review
          ? p.p_decision === "accept"
            ? "accepted"
            : "rejected"
          : "withdrawn";
        if (row.connection_state !== "accepted") row.contact_private = null;
        return { data: null, error: null };
      }
      return error("UNSUPPORTED_SYNTHETIC_RPC");
    },
  };
}
