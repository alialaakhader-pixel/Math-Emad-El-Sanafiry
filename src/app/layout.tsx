import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "katex/dist/katex.min.css";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import FloatingCalculator from "@/components/FloatingCalculator";

export const metadata: Metadata = {
  title: { default: "منصة مستر عماد السنافيري للرياضيات", template: "%s | منصة مستر عماد السنافيري" },
  description: "منصة مستر عماد السنافيري للرياضيات: محاضرات منظمة، اختبارات، ومعمل رياضيات تفاعلي في تجربة تعلم عربية واضحة.",
  applicationName: "أكاديمية مستر عماد السنافيري للرياضيات",
  openGraph: { type: "website", locale: "ar_EG", title: "منصة مستر عماد السنافيري للرياضيات", description: "تعلم الرياضيات خطوة بخطوة، واستكشفها بطريقتك." },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#090e20" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl" data-theme="dark"><body><AnimatedBackground/>{children}<FloatingCalculator/></body></html>;
}
