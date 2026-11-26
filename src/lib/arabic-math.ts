const digitMap: Record<string, string> = {
  "٠":"0", "١":"1", "٢":"2", "٣":"3", "٤":"4", "٥":"5", "٦":"6", "٧":"7", "٨":"8", "٩":"9",
  "۰":"0", "۱":"1", "۲":"2", "۳":"3", "۴":"4", "۵":"5", "۶":"6", "۷":"7", "۸":"8", "۹":"9",
};

export function normalizeArabicMath(input: string) {
  let s = input
    .replace(/[٠-٩۰-۹]/g, d => digitMap[d] ?? d)
    .replace(/[٫،]/g, ".")
    .replace(/[×·]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/π/g, "pi")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/٪/g, "%")
    .replace(/\s+/g, "");
  s = s.replace(/(\d|\)|[سصعxyz])(?=[(سصعxyz])/g, "$1*");
  s = s.replace(/([سصعxyz])(?=\d|\()/g, "$1*");
  s = s.replace(/\)(?=\d)/g, ")*");
  return s;
}

export function toArabicDigits(input: string) {
  return input.replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

type Polynomial = [number, number, number];
const add = (a: Polynomial, b: Polynomial): Polynomial => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const sub = (a: Polynomial, b: Polynomial): Polynomial => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
function mul(a: Polynomial, b: Polynomial): Polynomial {
  const out = [0, 0, 0, 0, 0];
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) out[i+j] += a[i]*b[j];
  if (Math.abs(out[3]) > 1e-10 || Math.abs(out[4]) > 1e-10) throw new Error("المحلل يدعم المعادلات حتى الدرجة الثانية فقط.");
  return [out[0], out[1], out[2]];
}

function parsePolynomial(expression: string, variable: string): Polynomial {
  const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)|[سصعA-Za-z]|[()+\-*/^]/g) ?? [];
  if (tokens.join("") !== expression) throw new Error("استخدم الأرقام والعمليات الأساسية ومجهولاً واحداً فقط.");
  let i = 0;
  const peek = () => tokens[i];
  const take = () => tokens[i++];
  const sum = (): Polynomial => {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const right = product();
      value = op === "+" ? add(value, right) : sub(value, right);
    }
    return value;
  };
  const product = (): Polynomial => {
    let value = unary();
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const right = unary();
      if (op === "*") value = mul(value, right);
      else {
        if (Math.abs(right[1]) > 1e-10 || Math.abs(right[2]) > 1e-10 || Math.abs(right[0]) < 1e-12) throw new Error("القسمة على تعبير يحتوي على المجهول غير مدعومة؛ اقسم على عدد ثابت فقط.");
        value = value.map(n => n / right[0]) as Polynomial;
      }
    }
    return value;
  };
  const unary = (): Polynomial => {
    if (peek() === "+") { take(); return unary(); }
    if (peek() === "-") { take(); return unary().map(n => -n) as Polynomial; }
    let value = atom();
    if (peek() === "^") {
      take();
      const exponentToken = take();
      const exponent = Number(exponentToken);
      if (!Number.isInteger(exponent) || exponent < 0 || exponent > 2) throw new Error("الأس المسموح به للمجهول هو صفر أو واحد أو اثنان.");
      if (exponent === 0) value = [1,0,0];
      else if (exponent === 2) value = mul(value, value);
    }
    return value;
  };
  const atom = (): Polynomial => {
    const token = take();
    if (token === "(") {
      const value = sum();
      if (take() !== ")") throw new Error("راجع الأقواس في المعادلة.");
      return value;
    }
    if (token === variable) return [0,1,0];
    if (token && /^(\d+(\.\d*)?|\.\d+)$/.test(token)) return [Number(token),0,0];
    throw new Error("راجع صياغة المعادلة؛ يوجد رمز غير مفهوم.");
  };
  const result = sum();
  if (i !== tokens.length) throw new Error("راجع ترتيب العمليات والأقواس.");
  return result;
}

export function solveArabicEquation(raw: string) {
  const source = normalizeArabicMath(raw);
  const pieces = source.split("=");
  if (pieces.length !== 2 || !pieces[0] || !pieces[1]) throw new Error("اكتب معادلة تحتوي على طرفين وبينهما علامة =.");
  const variables = ["س", "ص", "ع", "x", "y", "z"].filter(v => source.includes(v));
  if (variables.length !== 1) throw new Error(variables.length ? "حل مجهولاً واحداً في كل مرة." : "اكتب مجهولاً واحداً من: س أو ص أو ع أو x أو y أو z.");
  const variable = variables[0];
  const left = parsePolynomial(pieces[0], variable);
  const right = parsePolynomial(pieces[1], variable);
  const [c, b, a] = sub(left, right);
  if (![a,b,c].every(Number.isFinite)) throw new Error("تعذر فهم المعادلة؛ راجع الأرقام والعمليات.");
  const steps = [
    "ننقل جميع الحدود إلى الطرف الأيسر، ثم نجمع الحدود المتشابهة.",
    `تصبح المعادلة: ${fmt(a)}${variable}² ${b < 0 ? "−" : "+"} ${fmt(Math.abs(b))}${variable} ${c < 0 ? "−" : "+"} ${fmt(Math.abs(c))} = 0`,
  ];
  if (Math.abs(a) < 1e-10) {
    if (Math.abs(b) < 1e-10) return { variable, kind: Math.abs(c) < 1e-10 ? "all" : "none", roots: [] as number[], steps: [...steps, Math.abs(c) < 1e-10 ? "المعادلة صحيحة لأي قيمة للمجهول." : "وصلنا إلى عبارة مستحيلة؛ لا يوجد حل."] };
    const root = -c/b;
    steps.push(`${fmt(b)}${variable} ${c < 0 ? "−" : "+"} ${fmt(Math.abs(c))} = 0`, `${fmt(b)}${variable} = ${fmt(-c)}`, `${variable} = ${fmt(root)}`);
    return { variable, kind: "linear", roots: [root], steps };
  }
  const delta = b*b - 4*a*c;
  steps.push(`المميز Δ = b² − ٤ac = ${fmt(delta)}`);
  if (delta < -1e-10) return { variable, kind: "none-real", roots: [] as number[], steps: [...steps, "المميز سالب؛ لا توجد حلول حقيقية."] };
  if (Math.abs(delta) <= 1e-10) {
    const root = -b/(2*a);
    steps.push(`${variable} = −b ÷ (٢a) = ${fmt(root)}`);
    return { variable, kind: "double", roots: [root], steps };
  }
  const sqrt = Math.sqrt(delta);
  const q = -0.5 * (b + Math.sign(b || 1) * sqrt);
  const roots = [q/a, c/q].sort((u,v)=>u-v);
  steps.push(`باستخدام القانون العام: ${variable} = (−b ± √Δ) ÷ ٢a`, `${variable}₁ = ${fmt(roots[0])}`, `${variable}₂ = ${fmt(roots[1])}`);
  return { variable, kind: "quadratic", roots, steps };
}

function fmt(n: number) {
  if (Math.abs(n) < 1e-12) return "0";
  return Number(n.toPrecision(8)).toString();
}
