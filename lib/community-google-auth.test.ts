import { describe, expect, it } from "vitest";
import {
  googleAuthErrorHref,
  googleCallbackUrl,
  isGoogleAuthEnabled,
  suggestedCommunityName,
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

  it("sanitizes a provider display-name suggestion without publishing it", () => {
    expect(
      suggestedCommunityName({ full_name: "  Ana\n Pessoa <script> " }),
    ).toBe("Ana Pessoa <script>");
    expect(suggestedCommunityName({ email: "private@example.com" })).toBe(
      "Pessoa participante",
    );
  });
});
