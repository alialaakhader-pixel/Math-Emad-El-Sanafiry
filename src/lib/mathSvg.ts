// LaTeX -> self-contained SVG data URL using MathJax (Apache-2.0), self-hosted at /vendor/mathjax-tex-svg.js and loaded lazily on first formula.
type MJ = { tex2svg: (s: string, o?: object) => HTMLElement; startup?: { promise?: Promise<unknown> } };
let ctx: Promise<MJ> | null = null;
function load(): Promise<MJ> {
  if (ctx) return ctx;
  ctx = new Promise<MJ>((resolve, reject) => {
    const w = window as unknown as { MathJax?: MJ & Record<string, unknown> };
    if (w.MathJax?.tex2svg) return resolve(w.MathJax);
    (window as unknown as { MathJax: object }).MathJax = { startup: { typeset: false }, svg: { fontCache: "none" } };
    const sc = document.createElement("script"); sc.src = "/vendor/mathjax-tex-svg.js"; sc.async = true;
    sc.onload = () => { const m = (window as unknown as { MathJax: MJ }).MathJax; (m.startup?.promise || Promise.resolve()).then(() => resolve(m)); };
    sc.onerror = () => { ctx = null; reject(new Error("تعذر تحميل محرك المعادلات.")); };
    document.head.appendChild(sc);
  });
  return ctx;
}
export async function latexToSvg(latex: string, color = "#1e1e1e", scale = 2.4): Promise<{ dataURL: string; width: number; height: number }> {
  const mj = await load();
  const node = mj.tex2svg(latex, { display: false });
  const el = node.querySelector("svg"); if (!el) throw new Error("تعذر رسم المعادلة.");
  el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  let svg = el.outerHTML;
  const m = svg.match(/<svg[^>]*>/);
  if (!m) throw new Error("تعذر رسم المعادلة.");
  if (/merror|data-mjx-error/.test(svg)) throw new Error("المعادلة غير صحيحة.");
  const wEx = parseFloat((svg.match(/width="([\d.]+)ex"/) || [])[1] || "0"), hEx = parseFloat((svg.match(/height="([\d.]+)ex"/) || [])[1] || "0");
  if (!wEx || !hEx) throw new Error("تعذر قياس المعادلة.");
  const px = 8 * scale; const width = Math.round(wEx * px), height = Math.round(hEx * px);
  let head = m[0].replace(/width="[^"]*"/, `width="${width}"`).replace(/height="[^"]*"/, `height="${height}"`);
  if (!/xmlns=/.test(head)) head = head.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  svg = svg.replace(m[0], head).replace(/currentColor/g, color);
  const b64 = btoa(unescape(encodeURIComponent(svg)));
  return { dataURL: `data:image/svg+xml;base64,${b64}`, width, height };
}
