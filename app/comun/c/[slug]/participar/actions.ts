"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCommunitySession } from "@/lib/community-auth";
import { updateCommunityMembership } from "@/lib/community-membership";

export async function changeCommunityMembership(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const intent = String(formData.get("intent") ?? "follow") as
    | "follow"
    | "join"
    | "save"
    | "pause"
    | "resume"
    | "leave";
  if (
    !/^[a-z0-9-]{2,80}$/.test(slug) ||
    !["follow", "join", "save", "pause", "resume", "leave"].includes(
      intent,
    )
  )
    throw new Error("Ação comunitária inválida.");
  const { user } = await requireCommunitySession(`/comun/c/${slug}/participar`);
  await updateCommunityMembership({
    userId: user.id,
    slug,
    intent,
    collaboration: formData.getAll("collaboration").map(String),
    updates: formData.getAll("updates").map(String),
    requestMessage: String(formData.get("request_message") ?? "").slice(0, 800),
  });
  revalidatePath("/comun");
  revalidatePath("/comun/minha-participacao");
  revalidatePath("/comun/caixa-de-entrada");
  revalidatePath(`/comun/c/${slug}`);
  redirect(
    `/comun/c/${slug}/participar?status=${intent === "join" ? "requested" : intent}`,
  );
}
