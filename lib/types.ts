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
  quick_report?: boolean;
  has_attachments?: boolean;
  photo_count?: number;
};

export type AdminReport = PublicReport & {
  raw_text: string;
  involved_entity: string | null;
  is_anonymous: boolean;
  can_publish_sanitized: boolean;
  accepts_contact: boolean;
  private_contact: string | null;
  internal_notes: string | null;
  quick_report: boolean;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_source: string | null;
  public_location_level: string;
  photo_count: number;
  has_attachments: boolean;
  source_channel: string | null;
};

export type AdminReportAttachment = {
  id: string;
  report_id: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  attachment_type: string;
  public_approved: boolean;
  created_at: string;
  signed_url?: string | null;
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
