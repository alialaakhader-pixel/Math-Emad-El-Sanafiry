"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpLeft, Menu, Moon, Sun, X } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="منصة مستر عماد السنافيري - الرئيسية">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 44 44" fill="none"><path d="M9 13h26M17 13c-3 9-3 16 1 19m11-19c3 9 3 16-1 19M8 31h28" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/><circle cx="33" cy="8" r="2" fill="#76E1F0"/></svg></span>
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
  const links = [{ href: "/#about", label: "عن المنصة" }, { href: "/#stages", label: "المراحل الدراسية" }, { href: "/#lectures", label: "المحاضرات" }, { href: "/lab", label: "معمل الرياضيات" }];
  return <header className="site-header">
    <div className="header-inner container-wide">
      <Brand />
      <nav className="desktop-nav" aria-label="التنقل الرئيسي">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      <div className="header-actions">
        <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"} title={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}>{theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}</button>
        {user ? <Link className="header-login" href={user.role === "teacher" ? "/admin" : "/dashboard"}>لوحتي</Link> : <Link className="header-login" href="/auth?mode=login">تسجيل الدخول</Link>}
        <Link className="btn btn-primary header-cta" href={user ? (user.role === "teacher" ? "/admin" : "/dashboard") : "/auth?mode=register"}>{user ? "اذهب إلى حسابك" : "ابدأ التعلم"}<ArrowUpLeft size={17}/></Link>
        <button className="icon-button mobile-menu-toggle" type="button" aria-label={open ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
      </div>
    </div>
    {open && <nav className="mobile-nav" aria-label="قائمة الهاتف">{links.map(link => <Link onClick={() => setOpen(false)} key={link.href} href={link.href}>{link.label}</Link>)}<Link onClick={() => setOpen(false)} href={user ? (user.role === "teacher" ? "/admin" : "/dashboard") : "/auth?mode=login"}>{user ? "لوحة التحكم" : "تسجيل الدخول"}</Link><Link className="btn btn-primary" onClick={() => setOpen(false)} href={user ? "/dashboard" : "/auth?mode=register"}>ابدأ التعلم <ArrowUpLeft size={16}/></Link></nav>}
  </header>;
}
