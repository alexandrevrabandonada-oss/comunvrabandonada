import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // No URL is submitted for indexing while the integral product is a pilot.
  // A future launch release must supply an explicit public-content allowlist.
  return [];
}
