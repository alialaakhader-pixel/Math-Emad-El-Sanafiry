"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpLeft, Menu, Moon, Sun, X } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="منصة مستر عماد السنافيري - الرئيسية">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 56 56" fill="none"><defs><linearGradient id="lg1" x1="6" y1="4" x2="50" y2="52"><stop stopColor="#A88CFF"/><stop offset=".55" stopColor="#668DFF"/><stop offset="1" stopColor="#7DE2F0"/></linearGradient><linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#d9e4ff"/></linearGradient></defs><path d="M28 3l21.5 12.4v25.2L28 53 6.500 40.600V15.400z" fill="url(#lg1)"/><path d="M28 3l21.5 12.4v25.2L28 53 6.500 40.600V15.400z" stroke="rgba(255,255,255,.55)" strokeWidth="1.500"/><path d="M16 18h24M22 18c-3.500 8-3.500 14.500 0 20M34 18c3.500 8 3.500 14.500 0 20M15 36h26" stroke="url(#lg2)" strokeWidth="3.200" strokeLinecap="round"/><circle cx="43" cy="11" r="3.200" fill="#FFD36B"/></svg></span>
    {!compact && <span className="brand-copy"><strong>مستر عماد السنافيري</strong><small>أكاديمية الرياضيات</small></span>}
  </Link>;
}

type Me = { id: string; name: string; role: string; hasAvatar: boolean };
export default function SiteHeader({ user: userProp }: { user?: { name: string; role: string } | null }) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [avatarKey, setAvatarKey] = useState(0);
  useEffect(() => { fetch("/api/me").then(r => r.json()).then(d => setMe(d.user ?? null)).catch(() => {}); }, []);
  const user: { name: string; role: string } | null | undefined = me === undefined ? userProp : me;
  async function logout() { try { await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); } finally { window.location.href = "/"; } }
  function pickPhoto(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = async () => {
      const S = 160, c = document.createElement("canvas"); c.width = S; c.height = S; const m = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S); URL.revokeObjectURL(url);
      const r = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar: c.toDataURL("image/jpeg", 0.75) }) });
      if (r.ok) { setAvatarKey(k => k + 1); setMe(x => x ? { ...x, hasAvatar: true } : x); }
    };
    img.src = url;
  }
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const pathname = usePathname();
  useEffect(() => {
    const stored = localStorage.getItem("emad-theme");
    const next = stored === "light" ? "light" : "dark";
    setTheme(next); document.documentElement.dataset.theme = next;
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("emad-theme", next);
  }
  const links = [{ href: "/#about", label: "عن المنصة" }, { href: "/#stages", label: "المراحل الدراسية" }, { href: "/#lectures", label: "المحاضرات" }, { href: "/exams", label: "الامتحانات" }, { href: "/lab", label: "معمل الرياضيات" }, { href: "/forum", label: "المنتدى" }, ...(user?.role === "teacher" ? [{ href: "/admin", label: "لوحة المدرس" }] : user?.role === "staff" ? [{ href: "/team", label: "لوحة الفريق" }] : [])];
  return <header className="site-header">
    <div className="header-inner container-wide">
      <Brand />
      <nav className="desktop-nav" aria-label="التنقل الرئيسي">{links.filter(l => l.href !== "/admin" && l.href !== "/team").map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      <div className="header-actions">
        {(user?.role === "teacher" || user?.role === "staff") && <Link className="teacher-pill" href={user.role === "teacher" ? "/admin" : "/team"}><span aria-hidden="true">🎓</span> {user.role === "teacher" ? "لوحة المدرس" : "لوحة الفريق"}</Link>}
        <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"} title={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}>{theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}</button>
        {user ? (user.role === "student" ? <Link className="header-login" href="/dashboard">لوحتي</Link> : null) : <Link className="header-login" href="/auth?mode=login">تسجيل الدخول</Link>}
        {user && <button type="button" className="header-login" style={{ whiteSpace: "nowrap" }} onClick={logout}>خروج</button>}
        {(!user || user.role === "student") && <Link className="btn btn-primary header-cta" href={user ? (user.role === "teacher" ? "/admin" : user.role === "staff" ? "/team" : "/dashboard") : "/auth?mode=register"}>{user ? (user.role === "teacher" ? "لوحة المدرس" : "اذهب إلى حسابك") : "ابدأ التعلم"}<ArrowUpLeft size={17}/></Link>}
        <button className="icon-button mobile-menu-toggle" type="button" aria-label={open ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
      </div>
    </div>
    {open && <nav className="mobile-nav" aria-label="قائمة الهاتف">
      {me && <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 4px 12px", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
        <label style={{ cursor: "pointer", position: "relative" }} title="تغيير الصورة الشخصية">
          <span style={{ display: "grid", placeItems: "center", width: 52, height: 52, borderRadius: "50%", overflow: "hidden", border: "2px solid #f97316", background: "rgba(255,255,255,.12)", fontWeight: 800 }}>
            {me.hasAvatar ? <img key={avatarKey} src={`/api/avatar/${me.id}?v=${avatarKey}`} alt="" width={52} height={52} style={{ objectFit: "cover" }}/> : (me.name.trim()[0] || "؟")}</span>
          <input type="file" accept="image/*" hidden onChange={e => pickPhoto(e.target.files?.[0])}/></label>
        <div><strong>{me.name}</strong><div style={{ fontSize: 12, opacity: .7 }}>اضغط الدائرة لتغيير الصورة</div></div></div>}
      {links.filter(l => l.href !== "/admin" && l.href !== "/team").map(link => <Link onClick={() => setOpen(false)} key={link.href} href={link.href}>{link.label}</Link>)}
      {user?.role === "teacher" && <Link className="teacher-pill" style={{ color: "#2a1300" }} onClick={() => setOpen(false)} href="/admin"><span aria-hidden="true">🎓</span> لوحة المدرس</Link>}
      {user?.role === "staff" && <Link className="teacher-pill" style={{ color: "#2a1300" }} onClick={() => setOpen(false)} href="/team"><span aria-hidden="true">🎓</span> لوحة الفريق</Link>}
      {user?.role === "student" && <Link onClick={() => setOpen(false)} href="/dashboard">لوحتي</Link>}
      {user ? <button type="button" className="btn btn-outline" onClick={logout}>تسجيل الخروج</button> : <><Link onClick={() => setOpen(false)} href="/auth?mode=login">تسجيل الدخول</Link><Link className="btn btn-primary" onClick={() => setOpen(false)} href="/auth?mode=register">ابدأ التعلم <ArrowUpLeft size={16}/></Link></>}
    </nav>}
  </header>;
}
