import type { MetadataRoute } from "next";
import {
  COMUN_CANONICAL_ORIGIN,
  COMUN_PRIVATE_CRAWL_PATHS,
} from "@/lib/comun-indexing-policy";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Crawlers must reach public pages to observe their noindex directive.
      allow: "/",
      disallow: [...COMUN_PRIVATE_CRAWL_PATHS],
    },
    sitemap: `${COMUN_CANONICAL_ORIGIN}/sitemap.xml`,
  };
}
