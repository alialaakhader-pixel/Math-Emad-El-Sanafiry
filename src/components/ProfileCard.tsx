"use client";
import { useState } from "react";
export default function ProfileCard({ name, avatar: a0, parentPhone: p0 }: { name: string; avatar?: string | null; parentPhone?: string | null }) {
  const [avatar, setAvatar] = useState(a0 || ""); const [phone, setPhone] = useState(p0 || ""); const [msg, setMsg] = useState(""); const [saved, setSaved] = useState(!!p0);
  async function post(body: object) {
    const r = await fetch("/api/student", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json(); setMsg(j.message || j.error || ""); return r.ok;
  }
  function pick(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = async () => {
      const S = 160, c = document.createElement("canvas"); c.width = S; c.height = S;
      const m = Math.min(img.width, img.height), ctx = c.getContext("2d")!;
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      const d = c.toDataURL("image/jpeg", 0.75); URL.revokeObjectURL(url);
      if (await post({ action: "setAvatar", avatar: d })) setAvatar(d);
    };
    img.src = url;
  }
  return <div className="student-id-card" style={{ flexWrap: "wrap", gap: 14, alignItems: "center" }}>
    <label style={{ cursor: "pointer", textAlign: "center" }}>
      <span style={{ display: "grid", placeItems: "center", width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,.12)", border: "2px solid #f97316", fontSize: 28, fontWeight: 800 }}>
        {avatar ? <img src={avatar} alt="" width={72} height={72} style={{ objectFit: "cover" }}/> : (name.trim()[0] || "👤")}
      </span>
      <small>{avatar ? "تغيير الصورة" : "إضافة صورة"}</small>
      <input type="file" accept="image/*" hidden onChange={e => pick(e.target.files?.[0])}/>
    </label>
    <div style={{ flex: 1, minWidth: 200 }}>
      <small>رقم ولي الأمر {saved ? "" : "(مطلوب)"}</small>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input className="input" dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" value={phone} onChange={e => { setPhone(e.target.value); setSaved(false); }} style={{ flex: 1 }}/>
        <button type="button" className="inline-action" onClick={async () => { if (await post({ action: "setParentPhone", phone })) setSaved(true); }}>حفظ</button>
      </div>
      {msg && <small>{msg}</small>}
    </div>
  </div>;
}
