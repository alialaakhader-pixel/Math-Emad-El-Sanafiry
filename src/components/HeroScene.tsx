"use client";

import dynamic from "next/dynamic";

const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-[28px] border border-line bg-[radial-gradient(120%_90%_at_60%_20%,rgba(109,74,255,0.28),transparent_60%)]" />
  ),
});

export default function HeroScene({ className = "" }: { className?: string }) {
  return <Scene3D className={className} />;
}
