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

export default function SiteHeader({ user }: { user?: { name: string; role: string } | null }) {
  const [open, setOpen] = useState(false);
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
  const links = [{ href: "/#about", label: "عن المنصة" }, { href: "/#stages", label: "المراحل الدراسية" }, { href: "/#lectures", label: "المحاضرات" }, { href: "/exams", label: "الامتحانات" }, { href: "/lab", label: "معمل الرياضيات" }, ...(user?.role === "teacher" ? [{ href: "/admin", label: "لوحة المدرس" }] : user?.role === "staff" ? [{ href: "/team", label: "لوحة الفريق" }] : [])];
  return <header className="site-header">
    <div className="header-inner container-wide">
      <Brand />
      <nav className="desktop-nav" aria-label="التنقل الرئيسي">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      <div className="header-actions">
        {(user?.role === "teacher" || user?.role === "staff") && <Link className="teacher-pill" href={user.role === "teacher" ? "/admin" : "/team"}><span aria-hidden="true">🎓</span> {user.role === "teacher" ? "لوحة المدرس" : "لوحة الفريق"}</Link>}
        <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"} title={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}>{theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}</button>
        {user ? <Link className="header-login" href={user.role === "teacher" ? "/admin" : user.role === "staff" ? "/team" : "/dashboard"}>{user.role === "teacher" ? "لوحة المدرس" : user.role === "staff" ? "لوحة الفريق" : "لوحتي"}</Link> : <Link className="header-login" href="/auth?mode=login">تسجيل الدخول</Link>}
        <Link className="btn btn-primary header-cta" href={user ? (user.role === "teacher" ? "/admin" : user.role === "staff" ? "/team" : "/dashboard") : "/auth?mode=register"}>{user ? (user.role === "teacher" ? "لوحة المدرس" : "اذهب إلى حسابك") : "ابدأ التعلم"}<ArrowUpLeft size={17}/></Link>
        <button className="icon-button mobile-menu-toggle" type="button" aria-label={open ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
      </div>
    </div>
    {open && <nav className="mobile-nav" aria-label="قائمة الهاتف">{links.map(link => <Link onClick={() => setOpen(false)} key={link.href} href={link.href}>{link.label}</Link>)}<Link onClick={() => setOpen(false)} href={user ? (user.role === "teacher" ? "/admin" : "/dashboard") : "/auth?mode=login"}>{user ? "لوحة التحكم" : "تسجيل الدخول"}</Link><Link className="btn btn-primary" onClick={() => setOpen(false)} href={user ? "/dashboard" : "/auth?mode=register"}>ابدأ التعلم <ArrowUpLeft size={16}/></Link></nav>}
  </header>;
}
