import type { ComunShellMode } from "./comun-shell-contract";

export type ComunSurfaceTone = "dark" | "light";

export type ComunLayoutSurfaceContract = {
  tone: ComunSurfaceTone;
  page: "base" | "paper" | "tool" | "operation";
  text: "paper" | "ink";
  secondary: "paper-muted" | "ink-muted";
  action: "yellow" | "rust";
};

export const COMUN_LAYOUT_SURFACE_CONTRACTS: Record<
  ComunShellMode,
  ComunLayoutSurfaceContract
> = {
  public_web: {
    tone: "dark",
    page: "base",
    text: "paper",
    secondary: "paper-muted",
    action: "yellow",
  },
  member_root: {
    tone: "light",
    page: "paper",
    text: "ink",
    secondary: "ink-muted",
    action: "rust",
  },
  member_nested: {
    tone: "light",
    page: "paper",
    text: "ink",
    secondary: "ink-muted",
    action: "rust",
  },
  auth: {
    tone: "light",
    page: "paper",
    text: "ink",
    secondary: "ink-muted",
    action: "rust",
  },
  institutional: {
    tone: "light",
    page: "paper",
    text: "ink",
    secondary: "ink-muted",
    action: "rust",
  },
  immersive: {
    tone: "light",
    page: "tool",
    text: "ink",
    secondary: "ink-muted",
    action: "rust",
  },
  admin: {
    tone: "dark",
    page: "operation",
    text: "paper",
    secondary: "paper-muted",
    action: "yellow",
  },
};

export const COMUN_SEMANTIC_LAYOUT_TOKENS = [
  "--comun-text-primary",
  "--comun-text-secondary",
  "--comun-text-muted",
  "--comun-text-action",
  "--comun-surface-page",
  "--comun-surface-card",
  "--comun-bottom-nav-effective-height",
] as const;
