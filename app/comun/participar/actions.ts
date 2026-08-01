"use server";
import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
export async function submitParticipation(f: FormData) {
  if (String(f.get("company_website") ?? "").trim())
    redirect("/comun/participar?status=recebido");
  const contact = String(f.get("contact_private") ?? "").trim(),
    consent = f.get("consent_to_contact") === "on";
  if (!contact || !consent)
    throw new Error("Contato e autorização são obrigatórios.");
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  const { error } = await db.from("comun_hub_participation_interests").insert({
    territory_id: String(f.get("territory_id") ?? "") || null,
    themes: String(f.get("themes") ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    availability_private:
      String(f.get("availability_private") ?? "").slice(0, 500) || null,
    collaboration_types: f.getAll("collaboration_types").map(String),
    contact_private: contact.slice(0, 300),
    public_alias: String(f.get("public_alias") ?? "").slice(0, 100) || null,
    consent_to_contact: true,
  });
  if (error) throw new Error(error.message);
  redirect("/comun/participar?status=recebido");
}
