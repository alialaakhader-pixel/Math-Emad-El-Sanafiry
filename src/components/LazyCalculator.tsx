"use client";
import dynamic from "next/dynamic";

// The floating calculator is a large client component (calc engine + panels) that most
// visitors never open, so it is loaded after the page is interactive instead of with it.
const FloatingCalculator = dynamic(() => import("./FloatingCalculator"), { ssr: false });

export default function LazyCalculator() {
  return <FloatingCalculator/>;
}
