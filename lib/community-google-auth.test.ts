import { describe, expect, it } from "vitest";
import {
  googleAuthErrorHref,
  googleCallbackUrl,
  googleProfileAccess,
  isGoogleAuthEnabled,
  suggestedCommunityName,
  trustedCommunityOrigin,
  trustedCommunityOrigins,
} from "./community-google-auth";

describe("community Google Auth contract", () => {
  it("keeps the feature opt-in and exposes no provider when disabled", () => {
    expect(isGoogleAuthEnabled({})).toBe(false);
    expect(isGoogleAuthEnabled({ COMUN_GOOGLE_AUTH_ENABLED: "enabled" })).toBe(true);
    expect(googleAuthErrorHref()).toBe("/comun/entrar?erro=google");
  });

  it("allowlists production, loopback and preview origins", () => {
    const origins = trustedCommunityOrigins({
      VERCEL_ENV: "preview",
      VERCEL_URL: "comun-preview.vercel.app",
      NEXT_PUBLIC_SITE_URL: "https://comunsocial.online",
    });
    expect(origins).toContain("https://comunsocial.online");
    expect(origins).toContain("https://comun-preview.vercel.app");
    expect(origins).not.toContain("https://evil.example");
  });

  it("builds a PKCE callback with only an internal return route", () => {
    const callback = googleCallbackUrl("https://evil.example/?next=/comun", {
      NEXT_PUBLIC_SITE_URL: "https://comunsocial.online",
    });
    expect(callback).toBe(
      "https://comunsocial.online/comun/auth/callback?returnTo=%2Fcomun%2Fminha-participacao",
    );
    expect(callback).not.toContain("evil.example");
  });

  it("pins Production and gives an explicitly allowlisted Preview precedence", () => {
    expect(
      trustedCommunityOrigin({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe("https://comunsocial.online");
    expect(
      trustedCommunityOrigin({
        VERCEL_ENV: "preview",
        VERCEL_URL: "comun-p1g-preview.vercel.app",
        NEXT_PUBLIC_SITE_URL: "https://comunsocial.online",
      }),
    ).toBe("https://comun-p1g-preview.vercel.app");
  });

  it("keeps blocked profiles out and routes only incomplete active profiles", () => {
    expect(googleProfileAccess(null)).toBe("denied");
    for (const status of [
      "suspended",
      "deactivation_requested",
      "deactivated",
      "archived",
    ]) {
      expect(
        googleProfileAccess({ status, onboarding_completed_at: null }),
      ).toBe("denied");
    }
    expect(
      googleProfileAccess({ status: "active", onboarding_completed_at: null }),
    ).toBe("complete_account");
    expect(
      googleProfileAccess({
        status: "active",
        onboarding_completed_at: "2026-08-09T00:00:00.000Z",
      }),
    ).toBe("active");
  });

  it("sanitizes a provider display-name suggestion without publishing it", () => {
    expect(
      suggestedCommunityName({ full_name: "  Ana\n Pessoa <script> " }),
    ).toBe("Ana Pessoa <script>");
    expect(suggestedCommunityName({ email: "private@example.com" })).toBe(
      "Pessoa participante",
    );
  });
});
