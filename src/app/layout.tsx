import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "katex/dist/katex.min.css";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import LazyCalculator from "@/components/LazyCalculator";

export const metadata: Metadata = {
  title: { default: "منصة مهندس فارس عماد للرياضيات | Eng. Fares Emad Math Platform", template: "%s | منصة مهندس فارس عماد" },
  description: "منصة مهندس فارس عماد للرياضيات: محاضرات منظمة، اختبارات، ومعمل رياضيات تفاعلي في تجربة تعلم عربية واضحة.",
  applicationName: "أكاديمية مهندس فارس عماد للرياضيات | Eng. Fares Emad Math Academy",
  openGraph: { type: "website", locale: "ar_EG", title: "منصة مهندس فارس عماد للرياضيات", description: "تعلم الرياضيات خطوة بخطوة، واستكشفها بطريقتك." },
  robots: { index: true, follow: true },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#090e20" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl" data-theme="dark"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Cairo:wght@800;900&display=swap"/>
  </head><body><AnimatedBackground/>{children}<LazyCalculator/></body></html>;
}
