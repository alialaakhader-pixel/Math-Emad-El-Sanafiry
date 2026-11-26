"use client";
import { useState } from "react";
export default function TeacherGate() {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/teacher-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (r.ok && j.ok) { window.location.href = j.redirect || "/admin"; return; }
      setErr(j.error || "كلمة المرور غير صحيحة.");
    } catch { setErr("تعذر الاتصال. حاول مرة أخرى."); }
    setBusy(false);
  }
  return (
    <main dir="rtl" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, padding: 24, borderRadius: 20, background: "rgba(255,255,255,.08)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,.2)", display: "grid", gap: 14 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: "center" }}>🎓 دخول المدرس</h1>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="كلمة المرور" autoFocus autoComplete="current-password" style={{ padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,.3)", background: "rgba(0,0,0,.25)", color: "inherit", fontSize: 16 }} />
        {err && <p style={{ color: "#ff8a8a", textAlign: "center" }}>{err}</p>}
        <button disabled={busy || !pw} style={{ padding: 14, borderRadius: 12, background: "#f97316", color: "#fff", fontWeight: 800, fontSize: 16, border: 0 }}>{busy ? "..." : "دخول"}</button>
      </form>
    </main>
  );
}
