export type Community = {
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  mainCta: string;
  icon: string;
  accent: string;
};

export type Issue = {
  slug: string;
  communitySlug: string;
  title: string;
  summary: string;
  status: "receiving_reports" | "checking" | "became_post" | "preparing_dossier" | "forwarded" | "monitoring" | "archived";
  timeline: string[];
  usefulMaterials: string[];
  nextSteps: string;
};

export type Dossier = {
  slug: string;
  issueSlug: string;
  title: string;
  executiveSummary: string;
  contextText: string;
  timeline: string[];
  patterns: string[];
  relatedReports: Array<{
    protocol: string;
    title: string;
    publicText: string;
  }>;
  sources: string[];
  forwardingLog: string[];
  openQuestions: string[];
  status: "draft" | "published";
};

export type PublicReport = {
  id: string;
  protocol: string;
  community_slug: string;
  issue_slug: string | null;
  title: string | null;
  public_text: string | null;
  period_text: string | null;
  approximate_location: string | null;
  neighborhood: string | null;
  status: string;
  risk_level: string;
  created_at: string;
  published_at: string | null;
};

export type AdminReport = PublicReport & {
  raw_text: string;
  involved_entity: string | null;
  is_anonymous: boolean;
  can_publish_sanitized: boolean;
  accepts_contact: boolean;
  private_contact: string | null;
  internal_notes: string | null;
};

export type PublicProtocolStatus =
  | "received"
  | "under_review"
  | "needs_more_info"
  | "sanitized"
  | "published"
  | "linked_to_issue"
  | "archived"
  | "not_found"
  | "invalid"
  | "rate_limited";

export type PublicProtocolReport = {
  protocol: string;
  status: PublicProtocolStatus;
  community_slug: string | null;
  issue_slug: string | null;
  title: string | null;
  public_text: string | null;
  period_text: string | null;
  approximate_location: string | null;
  neighborhood: string | null;
  created_at: string | null;
  published_at: string | null;
  public_message: string;
  state_label: string;
  is_publicly_available: boolean;
  found: boolean;
};
