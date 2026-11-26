export default function AnimatedBackground() {
  const shapes = [
    ["s-circle", "8%", "12%", 120, 0], ["s-square", "86%", "18%", 90, 2], ["s-tri", "14%", "70%", 110, 4], ["s-ring", "78%", "74%", 150, 1],
    ["s-hex", "48%", "8%", 80, 3], ["s-circle", "62%", "52%", 60, 5], ["s-square", "30%", "40%", 54, 6], ["s-plus", "92%", "46%", 70, 2], ["s-tri", "70%", "90%", 64, 7], ["s-ring", "4%", "42%", 70, 3],
  ] as const;
  const sym = ["π", "∑", "∫", "√", "∞", "Δ", "θ", "x²"];
  return <div className="bg-shapes" aria-hidden="true">
    <div className="bg-orb bg-orb-a"/><div className="bg-orb bg-orb-b"/><div className="bg-orb bg-orb-c"/>
    {shapes.map(([c, l, t, s, d], i) => <span key={i} className={`bg-shape ${c}`} style={{ left: l, top: t, width: s, height: s, animationDelay: `${-d * 2.3}s`, animationDuration: `${18 + d * 2}s` }}/>)}
    {sym.map((m, i) => <span key={m} className="bg-sym" style={{ left: `${8 + i * 12}%`, animationDelay: `${-i * 3.1}s`, animationDuration: `${22 + i * 3}s` }}>{m}</span>)}
  </div>;
}
