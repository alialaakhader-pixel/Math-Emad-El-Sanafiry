// Plain-text bulk format for the practice bank. One question per block, blocks separated by a blank line.
//   الصف: أولى باكالوريا      (optional, overrides the default grade; "عام" = all grades)
//   الموضوع: النهايات          (optional, overrides the default topic)
//   س: نص السؤال
//   أ) خيار   ب) خيار   ج) خيار   د) خيار   (also 1-4 or A-D)
//   الإجابة: ب                 (letter or number 1-4)
//   الشرح: لماذا هذه الإجابة صحيحة
export type Parsed = { gradeName: string | null; topic: string | null; q: string; options: string[]; correct: number; why: string };
export type ParseResult = { ok: Parsed[]; errors: { block: number; text: string; error: string }[] };

const digits = (s: string) => s.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const LETTER: Record<string, number> = { "أ": 0, "ا": 0, "a": 0, "1": 0, "ب": 1, "b": 1, "2": 1, "ج": 2, "c": 2, "3": 2, "د": 3, "d": 3, "4": 3 };

export function parseBulk(raw: string): ParseResult {
  const blocks = raw.replace(/\r/g, "").split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const out: ParseResult = { ok: [], errors: [] };
  blocks.forEach((block, idx) => {
    const n = idx + 1; const brief = block.split("\n")[0].slice(0, 60);
    const err = (error: string) => out.errors.push({ block: n, text: brief, error });
    let gradeName: string | null = null; let topic: string | null = null; let q = ""; let why = ""; let ans: number | null = null;
    const options: string[] = []; let cur: "q" | "why" | "opt" | null = null;
    for (const lineRaw of block.split("\n")) {
      const line = digits(lineRaw.trim()); if (!line) continue;
      let m: RegExpMatchArray | null;
      if ((m = line.match(/^(?:الصف|المرحلة)\s*[:：]\s*(.+)$/))) { gradeName = m[1].trim(); cur = null; }
      else if ((m = line.match(/^الموضوع\s*[:：]\s*(.+)$/))) { topic = m[1].trim(); cur = null; }
      else if ((m = line.match(/^(?:س|السؤال)\s*\d*\s*[:：.\-)]\s*(.*)$/))) { q = m[1].trim(); cur = "q"; }
      else if ((m = line.match(/^(?:الإجابة|الاجابة|الجواب|الإجابة الصحيحة)\s*[:：]\s*(.+)$/))) {
        const key = m[1].trim().toLowerCase().replace(/[().\s]/g, "").slice(0, 1); ans = key in LETTER ? LETTER[key] : null; if (ans === null) err("الإجابة لازم تكون أ أو ب أو ج أو د (أو 1 إلى 4)."); cur = null;
      }
      else if ((m = line.match(/^(?:الشرح|التوضيح|التفسير)\s*[:：]\s*(.*)$/))) { why = m[1].trim(); cur = "why"; }
      else if ((m = line.match(/^([أابجدabcdABCD1-4])\s*[).\-:：]\s*(.+)$/)) && options.length < 4) { options.push(m[2].trim()); cur = "opt"; }
      else if (cur === "q") q += " " + line; else if (cur === "why") why += " " + line; else if (!q && !options.length) { q = line; cur = "q"; }
      else if (cur === "opt") options[options.length - 1] += " " + line;
    }
    const before = out.errors.length;
    if (!q) err("مفيش نص للسؤال (ابدأ السطر بـ س:)");
    if (options.length !== 4) err(`لازم 4 اختيارات (لقيت ${options.length}).`);
    else if (new Set(options.map(o => o.toLowerCase())).size !== 4) err("فيه اختيارين متشابهين.");
    if (ans === null && out.errors.length === before) err("ناقص سطر الإجابة:");
    if (!why) { if (out.errors.length === before) err("ناقص سطر الشرح:"); }
    if (out.errors.length === before && ans !== null) out.ok.push({ gradeName, topic, q: q.trim(), options, correct: ans, why: why.trim() });
  });
  return out;
}
