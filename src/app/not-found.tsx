import Link from "next/link";
import { ArrowUpLeft, Compass } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
export default function NotFound() { return <div className="app-page"><SiteHeader/><main className="app-container" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}><div className="empty-featured" style={{ width: "min(650px,100%)", minHeight: 350 }}><span className="empty-icon"><Compass size={31}/></span><span className="section-kicker"><span/> 404</span><h1 style={{ fontSize: 32, margin: "12px 0" }}>لم نجد هذه الصفحة</h1><p>قد يكون الرابط غير صحيح أو أزيل المحتوى. يمكنك العودة إلى البداية ومتابعة استكشاف المنصة.</p><Link className="btn btn-primary" href="/">العودة إلى الرئيسية <ArrowUpLeft size={16}/></Link></div></main></div>; }
