"use client";

import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import MathTex from "@/components/MathTex";

type Message = { role: "user" | "assistant"; content: string };

function renderWithMath(text: string) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, index) => {
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      return <MathTex key={index} tex={part.slice(1, -1)} />;
    }
    return <span key={index}>{part}</span>;
  });
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history: messages.slice(-6) }),
      });
      const data = (await response.json()) as {
        reply?: string;
        error?: string;
        configured?: boolean;
      };

      if (!response.ok) {
        setStatus(data.error ?? "حدث خطأ غير متوقع.");
        if (response.status === 401) setDisabled(true);
        return;
      }
      if (data.configured === false) {
        setStatus(data.reply ?? "المساعد غير مفعّل.");
        setDisabled(true);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "" }]);
    } catch {
      setStatus("تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-[rgba(109,74,255,0.14)] text-accent">
            <Sparkles size={20} />
          </span>
          <div>
            <span className="plate-label">MATH ASSISTANT</span>
            <h3 className="mt-1 text-lg font-bold text-ink">المساعد الذكي للرياضيات</h3>
          </div>
        </div>
        <span className="chip">شرح خطوة بخطوة · يدعم LaTeX</span>
      </div>

      <div className="grid gap-4 p-5">
        <div className="max-h-[380px] min-h-[180px] overflow-y-auto rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface-3)_26%,transparent)] p-5">
          {messages.length === 0 && !status ? (
            <div className="flex h-full flex-col items-start justify-center gap-3 text-[0.9rem] leading-[2] text-ink-soft">
              <p>اسأل عن أي مسألة رياضية، مثلاً:</p>
              <ul className="grid gap-2">
                <li className="chip">حل المعادلة التربيعية x^2 - 5x + 6 = 0</li>
                <li className="chip">اشرح لي قانون الجيب في المثلث</li>
                <li className="chip">كيف أرسم دالة sin(x)؟</li>
              </ul>
            </div>
          ) : null}

          <ul className="grid gap-4">
            {messages.map((message, index) => (
              <li
                key={index}
                className={`max-w-[85%] rounded-2xl px-5 py-4 text-[0.92rem] leading-[2] ${
                  message.role === "user"
                    ? "justify-self-start border border-[rgba(79,227,232,0.32)] bg-[rgba(79,227,232,0.1)] text-ink"
                    : "justify-self-end border border-line bg-[color-mix(in_srgb,var(--surface-3)_52%,transparent)] text-ink-soft"
                }`}
              >
                {renderWithMath(message.content)}
              </li>
            ))}
            {loading ? (
              <li className="flex items-center gap-2 justify-self-end text-[0.88rem] text-ink-faint">
                <Loader2 size={16} className="animate-spin" />
                جارٍ التفكير في الحل…
              </li>
            ) : null}
          </ul>
        </div>

        {status ? (
          <div className="rounded-2xl border border-dashed border-line-strong px-5 py-4 text-[0.86rem] leading-[1.95] text-ink-soft">
            {status}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            disabled={disabled}
            placeholder="اكتب مسألتك الرياضية هنا…"
            className="field flex-1"
            aria-label="سؤالك للمساعد الذكي"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || disabled || !input.trim()}
            className="btn btn-primary px-6"
          >
            <Send size={17} />
            إرسال
          </button>
        </div>

        <p className="text-[0.78rem] leading-[1.9] text-ink-faint">
          المساعد يشرح الخطوات والقوانين، وقد يخطئ أحياناً — راجع الحلول بنفسك، ولا تعتمد عليه وحده في
          الامتحانات. لا يعمل المساعد إلا عند إعداد مفتاح الخدمة على الخادم.
        </p>
      </div>
    </div>
  );
}
