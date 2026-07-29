const publicMediaBase = process.env.R2_PUBLIC_BASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const requestedDistDir = process.env.COMUN_NEXT_DIST_DIR;
if (requestedDistDir && (!/^\.next-[a-z0-9-]+$/i.test(requestedDistDir) || requestedDistDir.includes("..") || requestedDistDir.includes("/") || requestedDistDir.includes("\\"))) {
  throw new Error("COMUN_NEXT_DIST_DIR deve ser um diretório .next- interno e seguro");
}
const remotePatterns = [];
if (publicMediaBase) {
  try {
    const url = new URL(publicMediaBase);
    remotePatterns.push({
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/$/, "")}/**`,
    });
  } catch {
    /* build remains safe while R2 is not configured */
  }
}
if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    /* build remains safe while Supabase is not configured */
  }
}
const hcaptchaSources = "https://hcaptcha.com https://*.hcaptcha.com";
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${hcaptchaSources}`,
  `style-src 'self' 'unsafe-inline' ${hcaptchaSources}`,
  `img-src 'self' data: blob: ${publicMediaBase || ""} ${supabaseUrl || ""} ${hcaptchaSources}`.trim(),
  `connect-src 'self' ${supabaseUrl || ""} ${hcaptchaSources}`.trim(),
  `frame-src 'self' ${hcaptchaSources}`,
  "font-src 'self' data:",
  "media-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: requestedDistDir || ".next",
  experimental: { serverActions: { bodySizeLimit: "31mb" } },
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  images: { remotePatterns },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
