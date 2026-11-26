import Navbar from "@/components/Navbar";
import Hero from "@/components/landing/Hero";
import {
  Announcements,
  Faq,
  Features,
  FinalCta,
  Footer,
  HowToStart,
  LabBand,
  LatestLectures,
  Plans,
  Stages,
  Testimonials,
} from "@/components/landing/Sections";
import { getLandingData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getLandingData();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[100] focus:rounded-full focus:bg-[var(--surface-3)] focus:px-5 focus:py-3 focus:text-ink"
      >
        تخطي إلى المحتوى
      </a>
      <Navbar />
      <main id="main">
        <Hero data={data} />
        <Stages data={data} />
        <LatestLectures data={data} />
        <Features />
        <LabBand />
        <HowToStart />
        <Plans />
        <Announcements data={data} />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
