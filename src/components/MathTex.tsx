"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

export default function MathTex({
  tex,
  block = false,
  className = "",
  title,
}: {
  tex: string;
  block?: boolean;
  className?: string;
  title?: string;
}) {
  let html = "";
  try {
    html = katex.renderToString(tex, {
      displayMode: block,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    html = `<code>${tex}</code>`;
  }
  return (
    <span
      dir="ltr"
      title={title}
      className={`inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
