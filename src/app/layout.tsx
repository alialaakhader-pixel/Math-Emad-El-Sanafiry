import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sanafyry-math.vercel.app"),
  title: {
    default: "منصة مستر عماد السنافيري للرياضيات | Emad El Sanafyry Mathematics Academy",
    template: "%s | منصة مستر عماد السنافيري للرياضيات",
  },
  description:
    "منصة تعليمية عربية متخصصة في الرياضيات: محاضرات مرتبة حسب الصف والترم والوحدة، معمل تفاعلي لرسم الدوال والسبورة الهندسية، اختبارات وواجبات، ونظام اشتراكات محمي — بواجهة عربية RTL مصممة بدقة.",
  keywords: [
    "الرياضيات",
    "مستر عماد السنافيري",
    "منصة تعليمية",
    "محاضرات رياضيات",
    "امتحانات إلكترونية",
    "رسم الدوال",
    "الثانوية العامة",
  ],
  authors: [{ name: "Emad El Sanafyry" }],
  openGraph: {
    type: "website",
    locale: "ar_AR",
    siteName: "منصة مستر عماد السنافيري للرياضيات",
    title: "منصة مستر عماد السنافيري للرياضيات",
    description:
      "منظومة تعليمية متكاملة لتعليم الرياضيات: محتوى منظم، معمل تفاعلي، اختبارات، ونظام اشتراكات آمن.",
    images: [{ url: "/images/plate-hero.svg", width: 1536, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "منصة مستر عماد السنافيري للرياضيات",
    description: "منظومة تعليمية متكاملة لتعليم الرياضيات.",
    images: ["/images/plate-hero.svg"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#070b1c",
  width: "device-width",
  initialScale: 1,
};

const themeBootstrap = `
(function () {
  try {
    var t = localStorage.getItem('sanafyry-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    if (localStorage.getItem('sanafyry-reduced-motion') === 'true') {
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    }
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Tajawal:wght@400;500;700;800;900&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
