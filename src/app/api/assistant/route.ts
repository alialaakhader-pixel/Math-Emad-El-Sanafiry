import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `أنت "مساعد الرياضيات" داخل منصة مستر عماد السنافيري للرياضيات.
اشرح المسائل خطوة بخطوة باللغة العربية الفصحى المبسطة، واذكر القانون المستخدم في كل خطوة.
استخدم رموز LaTeX بين علامتَي دولار للمعادلات (مثال: $x^2+4=0$).
لا تعطِ إجابة نهائية كأنها مؤكدة إذا كانت المسألة ناقصة البيانات؛ اطلب التوضيح.
لا تخرج عن نطاق الرياضيات والتعلّم، وكن مختصراً وواضحاً.`;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول لاستخدام المساعد." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        reply:
          "المساعد الذكي غير مفعّل على هذه النسخة من المنصة. التفعيل يتطلب إضافة مفتاح OPENAI_API_KEY في متغيرات البيئة على الخادم.",
      },
      { status: 200 }
    );
  }

  let payload: { message?: string; history?: { role: string; content: string }[] };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "اكتب سؤالك أولاً." }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "السؤال طويل جداً." }, { status: 400 });
  }

  const history = Array.isArray(payload.history)
    ? payload.history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "تعذّر الاتصال بخدمة المساعد. حاول مرة أخرى لاحقاً." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ error: "لم يتمكن المساعد من توليد إجابة." }, { status: 502 });
    }

    return NextResponse.json({ configured: true, reply });
  } catch {
    return NextResponse.json({ error: "تعذّر الوصول إلى خدمة المساعد." }, { status: 502 });
  }
}
