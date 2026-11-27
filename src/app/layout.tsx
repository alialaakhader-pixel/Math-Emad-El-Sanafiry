import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "katex/dist/katex.min.css";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import FloatingCalculator from "@/components/FloatingCalculator";

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
  return <html lang="ar" dir="rtl" data-theme="dark"><body><AnimatedBackground/>{children}<FloatingCalculator/></body></html>;
}
