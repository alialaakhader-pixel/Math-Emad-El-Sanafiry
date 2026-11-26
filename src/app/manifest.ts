import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "منصة مستر عماد السنافيري للرياضيات", short_name: "مستر عماد", description: "تعلّم الرياضيات خطوة بخطوة: محاضرات، امتحانات، آلة حاسبة متطورة ومساعد ذكي.",
    start_url: "/dashboard", display: "standalone", dir: "rtl", lang: "ar", background_color: "#090e20", theme_color: "#090e20",
    icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
