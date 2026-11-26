import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { grades } from "@/db/schema";
import AuthLayout, { FormMessage } from "@/components/AuthLayout";
import { registerAction } from "@/lib/actions";

export const metadata: Metadata = {
  title: "إنشاء حساب",
  description: "أنشئ حسابك في منصة مستر عماد السنافيري للرياضيات.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>;
}) {
  const params = await searchParams;
  const gradeRows = await db
    .select({
      id: grades.id,
      name: grades.name,
      stage: grades.stage,
      sortOrder: grades.sortOrder,
    })
    .from(grades)
    .orderBy(grades.sortOrder);

  return (
    <AuthLayout
      title="أنشئ حسابك في المنصة"
      subtitle="حساب واحد يمنحك لوحة الطالب، متابعة التقدّم، الاختبارات والواجبات، وإدارة اشتراكك."
      footer={
        <p>
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-accent underline underline-offset-8">
            تسجيل الدخول
          </Link>
        </p>
      }
    >
      <FormMessage error={params.error} msg={params.msg} />

      <form action={registerAction} className="grid gap-5">
        <div>
          <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-ink-soft">
            الاسم الكامل
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="الاسم الثلاثي"
            className="field"
          />
        </div>

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
            minLength={8}
            autoComplete="new-password"
            dir="ltr"
            placeholder="8 أحرف على الأقل وتحتوي رقماً"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="gradeId" className="mb-2 block text-sm font-medium text-ink-soft">
            الصف الدراسي (اختياري — يمكن تغييره لاحقاً)
          </label>
          <select id="gradeId" name="gradeId" className="field" defaultValue="">
            <option value="">لم أحدد بعد</option>
            {gradeRows.map((grade) => (
              <option key={grade.id} value={String(grade.id)}>
                {grade.stage} — {grade.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-primary w-full py-4">
          إنشاء الحساب
        </button>

        <p className="text-[0.78rem] leading-[1.9] text-ink-faint">
          بإنشائك الحساب فأنت توافق على استخدام المنصة لأغراض تعليمية، وعلى حماية بياناتك وفق سياسة
          المنصة.
        </p>
      </form>
    </AuthLayout>
  );
}
