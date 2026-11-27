import { pool } from "@/db";

const ORIGIN = () => process.env.ELLOOL_AI_ORIGIN || "https://ellool-ai-studio.vercel.app";
export const KB_MIN_SCORE = Number(process.env.KB_MIN_SCORE || 0.55);
const STOP = new Set(["اشرح","لي","كيف","ما","هي","هو","في","من","على","إلى","الى","عن","هل","أوجد","اوجد","احسب","أحسب","حل","لو","ماذا","يعني","ازاي","إزاي","ايه","إيه","وضح","اذكر"]);
const norm = (w: string) => w.replace(/[\u064B-\u0652]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/^(وال|بال|لل|ال)/, "");
function tokens(t: string) { return [...new Set((t.match(/[\u0600-\u06FF]{3,}/g) || []).filter(w => !STOP.has(w)).map(norm).filter(w => w.length >= 3))]; }

// Embeddings through the Ellool worker (Workers AI bge-m3, free tier). Vectors are normalised so a dot product is the cosine.
export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  const base = process.env.ELLOOL_AI_URL?.replace(/\/+$/, ""); if (!base) throw new Error("no-ai");
  const out: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += 16) {
    const r = await fetch(`${base}/embed`, { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN(), Referer: `${ORIGIN()}/` }, body: JSON.stringify({ texts: texts.slice(i, i + 16) }), signal: AbortSignal.timeout(40000) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !Array.isArray(d.data)) throw new Error("embed-failed");
    for (const v of d.data as number[][]) { const f = Float32Array.from(v); let n = 0; for (const x of f) n += x * x; n = Math.sqrt(n) || 1; for (let k = 0; k < f.length; k++) f[k] /= n; out.push(f); }
  }
  return out;
}
const toBuf = (f: Float32Array) => Buffer.from(f.buffer, f.byteOffset, f.byteLength);

// Split a page into overlapping chunks of about 700 characters.
export function chunkText(text: string, size = 700, overlap = 120): string[] {
  const t = text.replace(/\s+/g, " ").trim(); if (t.length < 25) return [];
  if (t.length <= size) return [t];
  const out: string[] = []; let i = 0;
  while (i < t.length) { let end = Math.min(t.length, i + size); if (end < t.length) { const cut = Math.max(t.lastIndexOf(". ", end), t.lastIndexOf("؟ ", end), t.lastIndexOf(" ", end)); if (cut > i + size * 0.5) end = cut + 1; } out.push(t.slice(i, end).trim()); if (end >= t.length) break; i = end - overlap; }
  return out;
}

export async function createBook(b: { title: string; gradeId: string | null; subject?: string; source?: string; license?: string }) {
  const { rows } = await pool.query("insert into kb_books(title, grade_id, subject, source, license) values ($1,$2,$3,$4,$5) returning id", [b.title.slice(0, 200), b.gradeId, (b.subject || "math").slice(0, 60), (b.source || "").slice(0, 300), (b.license || "").slice(0, 200)]);
  return rows[0].id as string;
}
export async function addPages(bookId: string, pages: { page: number; text: string }[]) {
  const { rows: br } = await pool.query("select grade_id from kb_books where id = $1", [bookId]); if (!br[0]) throw new Error("no-book");
  const items: { page: number; body: string }[] = [];
  for (const p of pages) for (const c of chunkText(p.text)) items.push({ page: p.page, body: c });
  if (!items.length) return 0;
  const vecs = await embedTexts(items.map(i => i.body));
  for (let i = 0; i < items.length; i++) await pool.query("insert into kb_chunks(book_id, grade_id, page, body, emb) values ($1,$2,$3,$4,$5)", [bookId, br[0].grade_id, items[i].page, items[i].body, toBuf(vecs[i])]);
  await pool.query("update kb_books set chunks = (select count(*) from kb_chunks where book_id = $1), pages = greatest(pages, $2) where id = $1", [bookId, Math.max(...pages.map(p => p.page))]);
  return items.length;
}

export type Hit = { title: string; page: number; body: string; score: number; own: boolean };
export async function searchKb(query: string, gradeId: string | null, k = 4): Promise<Hit[]> {
  const [q] = await embedTexts([query.slice(0, 1500)]);
  const { rows } = await pool.query("select c.page, c.body, c.emb, b.title, b.source from kb_chunks c join kb_books b on b.id = c.book_id where c.grade_id is null or ($1::uuid is not null and c.grade_id = $1::uuid)", [gradeId]);
  const qt = tokens(query); const hits: Hit[] = [];
  for (const r of rows) { const e = new Float32Array((r.emb as Buffer).buffer.slice((r.emb as Buffer).byteOffset, (r.emb as Buffer).byteOffset + (r.emb as Buffer).byteLength)); let s = 0; for (let i = 0; i < q.length; i++) s += q[i] * e[i]; const nb = norm(" " + r.body); const lex = qt.length ? qt.filter(w => (r.body as string).includes(w) || nb.includes(w)).length / qt.length : 0; hits.push({ own: r.source === "ملخصات المنصة", title: r.title, page: r.page, body: r.body, score: s + 0.25 * lex }); }
  return hits.sort((a, b) => b.score - a.score).slice(0, k);
}
