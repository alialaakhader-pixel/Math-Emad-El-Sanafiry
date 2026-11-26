// Maps a lecture/subject title to one of the AI-generated (Ellool AI) abstract topic illustrations in /public/topics.
const RULES: [RegExp, string][] = [
  [/تفاضل|مشتق|نهاي|calcul|deriv|limit/i, "calculus"],
  [/تكامل|integral/i, "calculus"],
  [/هندس|مثلث|دائر|زاوي|مساح|geometr/i, "geometry"],
  [/مثلثات|جيب|ظل|trig|sin|cos/i, "trigonometry"],
  [/إحصاء|احصاء|احتمال|توزيع|stat|prob/i, "statistics"],
  [/متتالي|متتاب|سلسل|متسلسل|sequen|series/i, "sequences"],
  [/مركب|تخيلي|complex/i, "complex"],
  [/متجه|فراغ|إحداثي|احداثي|مستقيم|vector|3d/i, "vectors"],
  [/دال|دوال|اقتران|لوغاريتم|أسي|function|log/i, "functions"],
  [/جبر|معادل|متباين|كثير|algebra|equation/i, "algebra"],
];
export function topicKey(text: string, fallbackIndex = 0): string {
  for (const [re, k] of RULES) if (re.test(text)) return k;
  const pool = ["general", "functions", "calculus", "geometry", "algebra", "vectors"];
  return pool[Math.abs(fallbackIndex) % pool.length];
}
export const topicImage = (text: string, i = 0) => `/topics/${topicKey(text, i)}.jpg`;
