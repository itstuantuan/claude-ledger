import type { NextConfig } from "next";
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_API_MODE === "mock" &&
  process.env.ALLOW_LOCAL_MOCK_BUILD !== "true"
) {
  throw new Error(
    "Mock is disabled in production. Use real API mode, or explicitly allow a localhost-only preview.",
  );
}
const config: NextConfig = {
  devIndicators: false,
  output: "standalone",
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    const origin = process.env.DEV_API_ORIGIN?.replace(/\/$/, "");

    if (process.env.NODE_ENV !== "development" || !origin) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${origin}/api/v1/:path*`,
      },
    ];
  },
};
export default config;
