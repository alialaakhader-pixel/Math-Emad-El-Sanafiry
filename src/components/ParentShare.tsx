"use client";
import { useState } from "react";
import { Copy, Printer, Send } from "lucide-react";

export default function ParentShare({ id, name, phone, existing }: { id: string; name: string; phone: string | null; existing: string | null }) {
  const [token, setToken] = useState(existing); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  async function ensure() {
    if (token) return token; setBusy(true);
    const r = await fetch("/api/admin/parent-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); const d = await r.json(); setBusy(false);
    if (!r.ok) { setMsg(d.error || "حصلت مشكلة."); return null; } setToken(d.token); return d.token as string;
  }
  const url = (t: string) => `${location.origin}/parent/${t}`;
  const text = (t: string) => `تقرير تقدّم ${name} على منصة مهندس فارس عماد:\n${url(t)}`;
  async function copy() { const t = await ensure(); if (!t) return; await navigator.clipboard.writeText(text(t)); setMsg("اتنسخ. ابعته لولي الأمر."); }
  async function wa() {
    const t = await ensure(); if (!t) return;
    const p = phone ? (phone.replace(/\D/g, "").replace(/^0/, "20")) : "";
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(text(t))}`, "_blank");
  }
  return <section className="panel no-print" style={{ marginTop: 16 }}><h2>تقرير ولي الأمر</h2>
    <p className="small" style={{ marginTop: -8 }}>رابط للقراءة فقط بيعرض تقدّم {name}. {phone ? <>رقم ولي الأمر: <span dir="ltr">{phone}</span></> : "مفيش رقم ولي أمر متسجل، هتختار جهة الاتصال بنفسك."}</p>
    <div className="form-actions"><button className="btn btn-primary" disabled={busy} onClick={wa}><Send size={15}/> ابعت واتساب</button><button className="btn btn-outline" disabled={busy} onClick={copy}><Copy size={15}/> انسخ الرابط</button><button className="btn btn-outline" onClick={() => window.print()}><Printer size={15}/> اطبع التقرير</button></div>
    {msg && <div className="message info" role="status">{msg}</div>}
  </section>;
}
