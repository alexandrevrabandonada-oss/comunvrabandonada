import { communities as seedCommunities, dossiers as seedDossiers, getCommunity as getSeedCommunity, getDossier as getSeedDossier, getIssue as getSeedIssue, issues as seedIssues } from "@/lib/seed-data";
import { createPublicSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Community, Dossier, Issue } from "@/lib/types";

type CommunityRow = {
  slug: string;
  name: string;
  short_description: string;
  full_description: string;
  main_cta: string;
  icon: string | null;
  accent: string | null;
  is_active: boolean;
};

type IssueRow = {
  slug: string;
  community_slug: string;
  title: string;
  summary: string;
  status: Issue["status"];
  timeline: string[] | null;
  useful_materials: string[] | null;
  next_steps: string | null;
};

type DossierRow = {
  slug: string;
  issue_slug: string | null;
  title: string;
  executive_summary: string;
  context_text: string | null;
  timeline: string[] | null;
  patterns: string[] | null;
  sources: string[] | null;
  forwarding_log: string[] | null;
  status: Dossier["status"];
};

function mapCommunity(row: CommunityRow): Community {
  return {
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    mainCta: row.main_cta,
    icon: row.icon ?? "CM",
    accent: row.accent ?? "yellow",
  };
}

function mapIssue(row: IssueRow): Issue {
  return {
    slug: row.slug,
    communitySlug: row.community_slug,
    title: row.title,
    summary: row.summary,
    status: row.status,
    timeline: row.timeline ?? [],
    usefulMaterials: row.useful_materials ?? [],
    nextSteps: row.next_steps ?? "",
  };
}

function mapDossier(row: DossierRow): Dossier {
  return {
    slug: row.slug,
    issueSlug: row.issue_slug ?? "",
    title: row.title,
    executiveSummary: row.executive_summary,
    contextText: row.context_text ?? "",
    timeline: row.timeline ?? [],
    patterns: row.patterns ?? [],
    relatedReports: [],
    sources: row.sources ?? [],
    forwardingLog: row.forwarding_log ?? [],
    openQuestions: [],
    status: row.status,
  };
}

export async function listCommunities() {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return seedCommunities;

  const { data, error } = await supabase
    .from("comun_communities")
    .select("slug, name, short_description, full_description, main_cta, icon, accent, is_active")
    .eq("is_active", true)
    .order("name");

  if (error || !data) return seedCommunities;
  return data.map((row) => mapCommunity(row as CommunityRow));
}

export async function getCommunity(slug: string) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return getSeedCommunity(slug);

  const { data, error } = await supabase
    .from("comun_communities")
    .select("slug, name, short_description, full_description, main_cta, icon, accent, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) return getSeedCommunity(slug);
  return mapCommunity(data as CommunityRow);
}

export async function listIssues(filters?: { communitySlug?: string }) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return filters?.communitySlug ? seedIssues.filter((issue) => issue.communitySlug === filters.communitySlug) : seedIssues;
  }

  let query = supabase
    .from("comun_issues")
    .select("slug, community_slug, title, summary, status, timeline, useful_materials, next_steps")
    .order("created_at");

  if (filters?.communitySlug) query = query.eq("community_slug", filters.communitySlug);

  const { data, error } = await query;
  if (error || !data) {
    return filters?.communitySlug ? seedIssues.filter((issue) => issue.communitySlug === filters.communitySlug) : seedIssues;
  }

  return data.map((row) => mapIssue(row as IssueRow));
}

export async function getIssue(slug: string) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return getSeedIssue(slug);

  const { data, error } = await supabase
    .from("comun_issues")
    .select("slug, community_slug, title, summary, status, timeline, useful_materials, next_steps")
    .eq("slug", slug)
    .single();

  if (error || !data) return getSeedIssue(slug);
  return mapIssue(data as IssueRow);
}

export async function listDossiers() {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return seedDossiers;

  const { data, error } = await supabase
    .from("comun_dossiers")
    .select("slug, issue_slug, title, executive_summary, context_text, timeline, patterns, sources, forwarding_log, status")
    .in("status", ["draft", "published"])
    .order("created_at");

  if (error || !data) return seedDossiers;

  const mapped = data.map((row) => mapDossier(row as DossierRow));
  const published = mapped.filter((dossier) => dossier.status === "published");

  if (!published.length) return seedDossiers;

  const merged = [...published];
  for (const seedDossier of seedDossiers) {
    if (!merged.some((item) => item.slug === seedDossier.slug)) {
      merged.push(seedDossier);
    }
  }

  return merged;
}

export async function getDossier(slug: string) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return getSeedDossier(slug);

  const { data, error } = await supabase
    .from("comun_dossiers")
    .select("slug, issue_slug, title, executive_summary, context_text, timeline, patterns, sources, forwarding_log, status")
    .eq("slug", slug)
    .single();

  if (error || !data) return getSeedDossier(slug);

  const mapped = mapDossier(data as DossierRow);
  if (mapped.status !== "published") {
    return getSeedDossier(slug);
  }

  return mapped;
}

export async function listAdminIssues() {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return seedIssues;

  const { data, error } = await supabase
    .from("comun_issues")
    .select("slug, community_slug, title, summary, status, timeline, useful_materials, next_steps")
    .order("created_at");

  if (error || !data) return seedIssues;
  return data.map((row) => mapIssue(row as IssueRow));
}
