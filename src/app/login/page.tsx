import Link from "next/link";
import type { Metadata } from "next";
import AuthLayout, { FormMessage } from "@/components/AuthLayout";
import { loginAction } from "@/lib/actions";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "تسجيل الدخول إلى منصة مستر عماد السنافيري للرياضيات.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthLayout
      title="أهلاً بعودتك"
      subtitle="سجّل دخولك لمتابعة محاضراتك، حل الواجبات، وأداء الاختبارات من لوحة الطالب."
      footer={
        <p>
          ليس لديك حساب؟{" "}
          <Link href="/register" className="text-accent underline underline-offset-8">
            أنشئ حساباً مجانياً
          </Link>
        </p>
      }
    >
      <FormMessage error={params.error} msg={params.msg} />

      <form action={loginAction} className="grid gap-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink-soft">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            dir="ltr"
            placeholder="student@example.com"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink-soft">
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            dir="ltr"
            placeholder="••••••••"
            className="field"
          />
        </div>

        <button type="submit" className="btn btn-primary w-full py-4">
          تسجيل الدخول
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[0.82rem] leading-[1.95] text-ink-faint">
        تسجيل الدخول عبر Google غير مفعّل على هذه النسخة — يتطلب إضافة بيانات OAuth لمزوّد Google في
        متغيرات البيئة على الخادم.
      </div>
    </AuthLayout>
  );
}
