/**
 * A small, dependency-free math expression engine used by the lab tools.
 * Supports: + - * / ^ %, parentheses, x as the variable, constants pi/tau/e,
 * and the usual scientific functions. Angle mode for trig is selectable.
 */

type Token =
  | { type: "num"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: string }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" };

const FUNCS = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "tanh",
  "log",
  "ln",
  "sqrt",
  "abs",
  "exp",
  "floor",
  "ceil",
  "round",
  "sign",
  "min",
  "max",
  "pow",
  "cbrt",
  "log2",
  "log10",
  "sec",
  "csc",
  "cot",
  "fact",
  "ncr",
  "npr",
  "gcd",
  "lcm",
]);

const CONSTS: Record<string, number> = {
  pi: Math.PI,
  π: Math.PI,
  tau: Math.PI * 2,
  e: Math.E,
};

function tokenize(input: string): Token[] {
  const src = input.replace(/،/g, ",").replace(/\s+/g, "");
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      const raw = src.slice(i, j);
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`رقم غير صالح: ${raw}`);
      tokens.push({ type: "num", value });
      i = j;
      continue;
    }
    if (/[a-zA-Zπ]/.test(ch)) {
      let j = i;
      while (j < src.length && /[a-zA-Zπ0-9]/.test(src[j])) j += 1;
      tokens.push({ type: "ident", value: src.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    if ("+-*/^%".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i += 1;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma" });
      i += 1;
      continue;
    }
    throw new Error(`رمز غير معروف: ${ch}`);
  }
  return tokens;
}

type Node = { kind: "num"; value: number } | { kind: "var" } | { kind: "const"; value: number } | { kind: "call"; name: string; args: Node[] } | { kind: "bin"; op: string; left: Node; right: Node } | { kind: "neg"; operand: Node };

export type EvalContext = { x: number; degrees?: boolean };

function parse(tokens: Token[]): Node {
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function isOp(...values: string[]): boolean {
    const token = peek();
    return !!token && token.type === "op" && values.includes(token.value);
  }

  function parseExpression(): Node {
    let left = parseTerm();
    while (isOp("+", "-")) {
      const op = (next() as { value: string }).value;
      const right = parseTerm();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  function parseTerm(): Node {
    let left = parseFactor();
    while (isOp("*", "/", "%")) {
      const op = (next() as { value: string }).value;
      const right = parseFactor();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  function parseFactor(): Node {
    const base = parseUnary();
    if (isOp("^")) {
      next();
      const exponent = parseFactor();
      return { kind: "bin", op: "^", left: base, right: exponent };
    }
    return base;
  }

  function parseUnary(): Node {
    const token = peek();
    if (token?.type === "op" && (token.value === "-" || token.value === "+")) {
      next();
      const operand = parseUnary();
      return token.value === "-" ? { kind: "neg", operand } : operand;
    }
    return parsePrimary();
  }

  function parsePrimary(): Node {
    const token = next();
    if (!token) throw new Error("التعبير غير مكتمل");
    if (token.type === "num") return { kind: "num", value: token.value };
    if (token.type === "lparen") {
      const inner = parseExpression();
      const closing = next();
      if (closing?.type !== "rparen") throw new Error("قوس غير مغلق");
      return inner;
    }
    if (token.type === "ident") {
      if (token.value === "x") return { kind: "var" };
      if (token.value in CONSTS) return { kind: "const", value: CONSTS[token.value] };
      if (FUNCS.has(token.value)) {
        const opening = next();
        if (opening?.type !== "lparen") throw new Error(`الدالة ${token.value} تحتاج قوساً`);
        const args: Node[] = [];
        if (peek()?.type !== "rparen") {
          args.push(parseExpression());
          while (peek()?.type === "comma") {
            next();
            args.push(parseExpression());
          }
        }
        const closing = next();
        if (closing?.type !== "rparen") throw new Error("قوس غير مغلق");
        return { kind: "call", name: token.value, args };
      }
      throw new Error(`رمز غير معروف: ${token.value}`);
    }
    throw new Error("صيغة التعبير غير صحيحة");
  }

  const tree = parseExpression();
  if (pos !== tokens.length) throw new Error("أحرف زائدة في نهاية التعبير");
  return tree;
}

function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new Error("المضروب يتطلب عدداً صحيحاً من 0 إلى 170");
  }
  let result = 1;
  for (let i = 2; i <= value; i += 1) result *= i;
  return result;
}

function gcd(a: number, b: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error("القاسم المشترك الأكبر يتطلب عددين صحيحين");
  }
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

function evalNode(node: Node, ctx: EvalContext): number {
  const toRad = (v: number) => (ctx.degrees ? (v * Math.PI) / 180 : v);
  const fromRad = (v: number) => (ctx.degrees ? (v * 180) / Math.PI : v);

  switch (node.kind) {
    case "num":
      return node.value;
    case "const":
      return node.value;
    case "var":
      return ctx.x;
    case "neg":
      return -evalNode(node.operand, ctx);
    case "bin": {
      const a = evalNode(node.left, ctx);
      const b = evalNode(node.right, ctx);
      switch (node.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return a / b;
        case "%":
          return a % b;
        case "^":
          return Math.pow(a, b);
        default:
          throw new Error("عملية غير معروفة");
      }
    }
    case "call": {
      const args = node.args.map((arg) => evalNode(arg, ctx));
      switch (node.name) {
        case "sin":
          return Math.sin(toRad(args[0]));
        case "cos":
          return Math.cos(toRad(args[0]));
        case "tan":
          return Math.tan(toRad(args[0]));
        case "sec":
          return 1 / Math.cos(toRad(args[0]));
        case "csc":
          return 1 / Math.sin(toRad(args[0]));
        case "cot":
          return 1 / Math.tan(toRad(args[0]));
        case "asin":
          return fromRad(Math.asin(args[0]));
        case "acos":
          return fromRad(Math.acos(args[0]));
        case "atan":
          return fromRad(Math.atan(args[0]));
        case "sinh":
          return Math.sinh(args[0]);
        case "cosh":
          return Math.cosh(args[0]);
        case "tanh":
          return Math.tanh(args[0]);
        case "log":
          return Math.log10(args[0]);
        case "ln":
          return Math.log(args[0]);
        case "sqrt":
          return Math.sqrt(args[0]);
        case "cbrt":
          return Math.cbrt(args[0]);
        case "log2":
          return Math.log2(args[0]);
        case "log10":
          return Math.log10(args[0]);
        case "fact":
          return factorial(args[0]);
        case "ncr":
          return factorial(args[0]) / (factorial(args[1]) * factorial(args[0] - args[1]));
        case "npr":
          return factorial(args[0]) / factorial(args[0] - args[1]);
        case "gcd":
          return gcd(args[0], args[1]);
        case "lcm":
          return Math.abs(args[0] * args[1]) / gcd(args[0], args[1]);
        case "abs":
          return Math.abs(args[0]);
        case "exp":
          return Math.exp(args[0]);
        case "floor":
          return Math.floor(args[0]);
        case "ceil":
          return Math.ceil(args[0]);
        case "round":
          return Math.round(args[0]);
        case "sign":
          return Math.sign(args[0]);
        case "min":
          return Math.min(...args);
        case "max":
          return Math.max(...args);
        case "pow":
          return Math.pow(args[0], args[1]);
        default:
          throw new Error("دالة غير معروفة");
      }
    }
    default:
      throw new Error("عقدة غير معروفة");
  }
}

const cache = new Map<string, Node>();

export function compile(expr: string): Node {
  const key = expr.trim();
  const cached = cache.get(key);
  if (cached) return cached;
  const tree = parse(tokenize(key));
  cache.set(key, tree);
  return tree;
}

export function evaluate(expr: string, ctx: EvalContext = { x: 0 }): number {
  return evalNode(compile(expr), ctx);
}

export function isValidExpression(expr: string): boolean {
  try {
    compile(expr);
    return true;
  } catch {
    return false;
  }
}

export function errorMessage(expr: string): string | null {
  try {
    compile(expr);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "تعبير غير صالح";
  }
}
