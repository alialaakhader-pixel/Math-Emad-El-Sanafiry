import type { Metadata } from "next";
import GuestClient from "@/components/GuestClient";
import { liveConfigured } from "@/lib/live";

export const metadata: Metadata = { title: "دعوة لحصة مباشرة | منصة مهندس فارس عماد", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function GuestPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  return <GuestClient code={typeof c === "string" ? c : ""} configured={liveConfigured()}/>;
}
