// Returns normalized phone (Egyptian 01xxxxxxxxx, or Moroccan +212...) or null.
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^(\+?20)?0?1[0125]\d{8}$/.test(s)) return "0" + s.replace(/^\+?20/, "").replace(/^0/, "");
  if (/^(\+?212|0)[567]\d{8}$/.test(s)) return "+212" + s.replace(/^\+?212/, "").replace(/^0/, "");
  return null;
}
