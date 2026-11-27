import pg from "pg"; import fs from "fs"; import { BANK } from "./practice-bank.mjs";
const pool = new pg.Pool({ connectionString: fs.readFileSync("/tmp/dburl", "utf8").trim() });
const G = { "1bac": "f088e4ff-06c2-4fc1-9db1-323f3552200f", "2bac": "1bd92a9a-3e87-4505-bf30-46a096596ad3", "3sec": "00fe758a-71e7-43b0-bc75-169ac3528c44", all: null };
for (const x of BANK) await pool.query("insert into practice_questions(id,grade_id,topic,q,options,correct,why) values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do update set grade_id=$2,topic=$3,q=$4,options=$5,correct=$6,why=$7", [x.id, G[x.g], x.t, x.q, JSON.stringify(x.o), x.a, x.w]);
console.log(BANK.length); await pool.end();
