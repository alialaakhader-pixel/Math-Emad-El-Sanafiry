"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export default function CalcAi({ seed }: { seed: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  async function ask() {
    const question = q.trim();
    if (question.length < 3) { setError("اكتب مسألتك أولاً."); return; }
    setBusy(true); setError(""); setAnswer("");
    try {
      let full = question;
      try {
        const cand = (question.match(/[0-9ie+\-*\/^().\sa-z]{3,}/gi) || []).map(x => x.trim()).filter(x => /[\d]|\bi\b/.test(x) && /[+\-*\/^]/.test(x)).sort((a, b) => b.length - a.length)[0];
        if (cand && /^[0-9ie+\-*\/^().\sa-z]+$/i.test(cand) && !/[a-hj-z]{2,}/i.test(cand.replace(/\b(sqrt|abs|exp|log|sin|cos|tan|pi)\b/gi, ""))) {
          const mj = await import("mathjs");
          const v = mj.evaluate(cand.replace(/\s+/g, ""));
          const ok = typeof v === "number" ? Number.isFinite(v) : v && typeof v === "object" && "re" in v && Number.isFinite(v.re) && Number.isFinite(v.im);
          if (ok) full = `${question}\n\n[قيمة محسوبة بدقة بآلة حاسبة، اعتمد عليها ولا تغيّرها: ${cand.replace(/\s+/g, "")} = ${mj.format(v, { precision: 10 })}. اشرح خطوات الوصول إليها. للأس المركب استخدم z^w = e^(w·ln z) مع ln z = ln|z| + i·arg(z).]`;
        }
      } catch { /* fall back to the plain question */ }
      const r = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: full.slice(0, 1900) }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setError(r.status === 401 ? "سجّل دخولك أولاً لتستخدم Ellool AI." : d.error || "تعذر الحصول على إجابة الآن.");
      else setAnswer(String(d.answer || ""));
    } catch { setError("تعذر الاتصال. حاول مرة أخرى."); }
    setBusy(false);
  }
  return <div className="calc-ai">
    <button type="button" className="calc-ai-toggle" aria-expanded={open} onClick={() => { setOpen(!open); if (!open && !q && seed.trim()) setQ(`اشرح لي خطوات حل: ${seed.trim()}`); }}><Sparkles size={16}/> اسأل Ellool AI</button>
    {open && <div className="calc-ai-box">
      <textarea className="input" rows={3} value={q} onChange={e => setQ(e.target.value)} placeholder="اكتب مسألتك أو عملية الآلة، مثل: (1+i)^(2-i) أو احسب نهاية sin(x)/x" maxLength={1500} dir="auto"/>
      <button type="button" className="btn btn-primary" onClick={ask} disabled={busy}>{busy ? "Ellool AI بيفكر..." : "اشرح لي"}</button>
      {error && <p className="err">{error}</p>}
      {answer && <div className="calc-ai-answer"><span className="ai-badge" style={{ position: "static", display: "inline-block", marginBottom: 8 }}>Ellool AI</span><div style={{ whiteSpace: "pre-wrap" }}>{answer}</div></div>}
    </div>}
  </div>;
}
