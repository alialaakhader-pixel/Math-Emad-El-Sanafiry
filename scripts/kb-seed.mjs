import pg from "pg"; import fs from "fs"; import { NOTES } from "./kb-notes-a.mjs";
const pool = new pg.Pool({ connectionString: fs.readFileSync("/tmp/dburl", "utf8").trim() });
const G = { "1bac": "f088e4ff-06c2-4fc1-9db1-323f3552200f", "2bac": "1bd92a9a-3e87-4505-bf30-46a096596ad3", "3sec": "00fe758a-71e7-43b0-bc75-169ac3528c44", all: null };
const base = "https://ellool-ai-brain.ellool-ai.workers.dev/v1";
async function embed(texts) { const r = await fetch(base + "/embed", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://ellool-ai-studio.vercel.app" }, body: JSON.stringify({ texts }) }); const d = await r.json(); if (!d.data) throw new Error(JSON.stringify(d)); return d.data.map(v => { const f = Float32Array.from(v); let n = 0; for (const x of f) n += x * x; n = Math.sqrt(n); return f.map(x => x / n); }); }
await pool.query("delete from kb_books where source = 'ملخصات المنصة'");
let total = 0;
for (const n of NOTES) {
  const { rows } = await pool.query("insert into kb_books(title, grade_id, subject, source, license, pages) values ($1,$2,'math','ملخصات المنصة','تأليف المنصة (ملك المنصة)',$3) returning id", ["ملخص: " + n.t, G[n.g], n.p.length]);
  const vecs = await embed(n.p);
  for (let i = 0; i < n.p.length; i++) { const f = vecs[i]; await pool.query("insert into kb_chunks(book_id, grade_id, page, body, emb) values ($1,$2,$3,$4,$5)", [rows[0].id, G[n.g], i + 1, n.p[i], Buffer.from(f.buffer)]); total++; }
  await pool.query("update kb_books set chunks = $2 where id = $1", [rows[0].id, n.p.length]);
}
console.log("books", NOTES.length, "chunks", total); await pool.end();
