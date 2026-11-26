import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const site = (process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
  return [{ url: site, changeFrequency: "weekly", priority: 1 }, { url: `${site}/lab`, changeFrequency: "monthly", priority: .7 }];
}
