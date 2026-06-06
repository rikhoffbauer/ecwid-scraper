export interface CompiledProductQuery {
  source: string;
  isSimpleText: boolean;
  error?: string;
  matches(context: Record<string, unknown>, text: string): boolean;
}

type TokenType = "number" | "string" | "regex" | "ident" | "op" | "paren" | "eof";
interface Token { type: TokenType; value: string; index: number; regex?: RegExp }
type Expr =
  | { kind: "literal"; value: unknown }
  | { kind: "regex"; value: RegExp }
  | { kind: "ident"; path: string }
  | { kind: "unary"; op: "!" | "-" | "+"; expr: Expr }
  | { kind: "binary"; op: string; left: Expr; right: Expr };

const OPERATORS = ["&&", "||", "==", "!=", ">=", "<=", "^=", "$=", "*=", "~=", "|=", ">", "<", "+", "-", "*", "/", "%", "^", "!"];
const QUERY_OPERATOR_RE = /(&&|\|\||==|!=|>=|<=|\^=|\$=|\*=|~=|\|=|[()<>+\-*\/%^!]|\b(?:true|false|null)\b|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*(?:==|!=|>=|<=|\^=|\$=|\*=|~=|\|=|>|<))/i;

function isIdentStart(char: string): boolean { return /[A-Za-z_$]/.test(char); }
function isIdentChar(char: string): boolean { return /[A-Za-z0-9_$.-]/.test(char); }
function isWhitespace(char: string): boolean { return /\s/.test(char); }

function lexRegex(source: string, start: number): { regex: RegExp; end: number; raw: string } {
  let i = start + 1;
  let pattern = "";
  let escaped = false;
  let inClass = false;
  while (i < source.length) {
    const char = source[i]!;
    if (escaped) { pattern += char; escaped = false; i += 1; continue; }
    if (char === "\\") { pattern += char; escaped = true; i += 1; continue; }
    if (char === "[") inClass = true;
    if (char === "]") inClass = false;
    if (char === "/" && !inClass) break;
    pattern += char;
    i += 1;
  }
  if (source[i] !== "/") throw new Error(`Unterminated regular expression at ${start}`);
  i += 1;
  let flags = "";
  while (/[dgimsuvy]/.test(source[i] ?? "")) { flags += source[i]; i += 1; }
  return { regex: new RegExp(pattern, flags), end: i, raw: source.slice(start, i) };
}

function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let previous: Token | undefined;
  while (i < source.length) {
    const char = source[i]!;
    if (isWhitespace(char)) { i += 1; continue; }
    if (char === "(" || char === ")") {
      previous = { type: "paren", value: char, index: i };
      tokens.push(previous);
      i += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      let value = "";
      i += 1;
      const start = i - 1;
      while (i < source.length) {
        const next = source[i]!;
        if (next === "\\") {
          const escaped = source[i + 1];
          if (escaped === undefined) throw new Error(`Invalid escape at ${i}`);
          value += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped;
          i += 2;
          continue;
        }
        if (next === quote) break;
        value += next;
        i += 1;
      }
      if (source[i] !== quote) throw new Error(`Unterminated string at ${start}`);
      i += 1;
      previous = { type: "string", value, index: start };
      tokens.push(previous);
      continue;
    }
    const regexAllowed = !previous || previous.type === "op" || (previous.type === "paren" && previous.value === "(");
    if (char === "/" && regexAllowed && !isWhitespace(source[i + 1] ?? "")) {
      const parsed = lexRegex(source, i);
      previous = { type: "regex", value: parsed.raw, index: i, regex: parsed.regex };
      tokens.push(previous);
      i = parsed.end;
      continue;
    }
    const numberMatch = source.slice(i).match(/^(?:\d+\.\d+|\d+|\.\d+)(?:e[+-]?\d+)?/i);
    if (numberMatch) {
      previous = { type: "number", value: numberMatch[0], index: i };
      tokens.push(previous);
      i += numberMatch[0].length;
      continue;
    }
    const op = OPERATORS.find((operator) => source.startsWith(operator, i));
    if (op) {
      previous = { type: "op", value: op, index: i };
      tokens.push(previous);
      i += op.length;
      continue;
    }
    if (isIdentStart(char)) {
      const start = i;
      i += 1;
      while (i < source.length && isIdentChar(source[i]!)) i += 1;
      previous = { type: "ident", value: source.slice(start, i), index: start };
      tokens.push(previous);
      continue;
    }
    throw new Error(`Unexpected character ${JSON.stringify(char)} at ${i}`);
  }
  tokens.push({ type: "eof", value: "", index: source.length });
  return tokens;
}

class Parser {
  private i = 0;
  constructor(private readonly tokens: Token[]) {}
  private peek(): Token { return this.tokens[this.i]!; }
  private take(): Token { return this.tokens[this.i++]!; }
  private match(value: string): boolean {
    if (this.peek().value !== value) return false;
    this.take();
    return true;
  }
  parse(): Expr {
    const expr = this.parseOr();
    if (this.peek().type !== "eof") throw new Error(`Unexpected token ${this.peek().value} at ${this.peek().index}`);
    return expr;
  }
  private parseOr(): Expr {
    let expr = this.parseAnd();
    while (this.match("||")) expr = { kind: "binary", op: "||", left: expr, right: this.parseAnd() };
    return expr;
  }
  private parseAnd(): Expr {
    let expr = this.parseComparison();
    while (this.match("&&")) expr = { kind: "binary", op: "&&", left: expr, right: this.parseComparison() };
    return expr;
  }
  private parseComparison(): Expr {
    let expr = this.parseAdditive();
    while (["==", "!=", ">", ">=", "<", "<=", "^=", "$=", "*=", "~=", "|="].includes(this.peek().value)) {
      const op = this.take().value;
      expr = { kind: "binary", op, left: expr, right: this.parseAdditive() };
    }
    return expr;
  }
  private parseAdditive(): Expr {
    let expr = this.parseMultiplicative();
    while (this.peek().value === "+" || this.peek().value === "-") {
      const op = this.take().value;
      expr = { kind: "binary", op, left: expr, right: this.parseMultiplicative() };
    }
    return expr;
  }
  private parseMultiplicative(): Expr {
    let expr = this.parsePower();
    while (["*", "/", "%"].includes(this.peek().value)) {
      const op = this.take().value;
      expr = { kind: "binary", op, left: expr, right: this.parsePower() };
    }
    return expr;
  }
  private parsePower(): Expr {
    let expr = this.parseUnary();
    if (this.match("^")) expr = { kind: "binary", op: "^", left: expr, right: this.parsePower() };
    return expr;
  }
  private parseUnary(): Expr {
    if (["!", "-", "+"].includes(this.peek().value)) return { kind: "unary", op: this.take().value as "!" | "-" | "+", expr: this.parseUnary() };
    return this.parsePrimary();
  }
  private parsePrimary(): Expr {
    const token = this.take();
    if (token.type === "number") return { kind: "literal", value: Number(token.value) };
    if (token.type === "string") return { kind: "literal", value: token.value };
    if (token.type === "regex") return { kind: "regex", value: token.regex! };
    if (token.type === "ident") {
      if (token.value === "true") return { kind: "literal", value: true };
      if (token.value === "false") return { kind: "literal", value: false };
      if (token.value === "null") return { kind: "literal", value: null };
      return { kind: "ident", path: token.value };
    }
    if (token.value === "(") {
      const expr = this.parseOr();
      if (!this.match(")")) throw new Error(`Expected ) at ${this.peek().index}`);
      return expr;
    }
    throw new Error(`Unexpected token ${token.value || token.type} at ${token.index}`);
  }
}

function getPath(context: Record<string, unknown>, path: string): unknown {
  const direct = context[path];
  if (direct !== undefined) return direct;
  let value: unknown = context;
  for (const segment of path.split(".")) {
    if (!value || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

function asString(value: unknown): string {
  if (Array.isArray(value)) return value.map(asString).join(" ");
  if (value instanceof RegExp) return value.source;
  return value === undefined || value === null ? "" : String(value);
}

function truthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return !!value;
}

function equal(a: unknown, b: unknown): boolean {
  if (typeof a === "number" || typeof b === "number") {
    const ax = asNumber(a);
    const bx = asNumber(b);
    return Number.isFinite(ax) && Number.isFinite(bx) && ax === bx;
  }
  return asString(a).toLowerCase() === asString(b).toLowerCase();
}

function unresolvedIdentifierLiteral(expr: Expr, value: unknown): unknown {
  return value === undefined && expr.kind === "ident" ? expr.path : value;
}

function compare(op: string, left: unknown, right: unknown, rightExpr: Expr): boolean {
  const rhs = unresolvedIdentifierLiteral(rightExpr, right);
  if ([">", ">=", "<", "<="].includes(op)) {
    const a = asNumber(left);
    const b = asNumber(rhs);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (op === ">") return a > b;
    if (op === ">=") return a >= b;
    if (op === "<") return a < b;
    return a <= b;
  }
  if (op === "==") return equal(left, rhs);
  if (op === "!=") return !equal(left, rhs);
  const haystack = asString(left).toLowerCase();
  if (rhs instanceof RegExp) return rhs.test(asString(left));
  const needle = asString(rhs).toLowerCase();
  if (op === "^=") return haystack.startsWith(needle);
  if (op === "$=") return haystack.endsWith(needle);
  if (op === "*=") return haystack.includes(needle);
  if (op === "|=") return haystack === needle || haystack.startsWith(`${needle}-`) || haystack.split(/[\s,;/|]+/).includes(needle);
  if (op === "~=") return needle ? haystack.split(/[\s,;/|]+/).some((token) => token === needle || token.includes(needle)) : false;
  return false;
}

function evalExpr(expr: Expr, context: Record<string, unknown>): unknown {
  switch (expr.kind) {
    case "literal": return expr.value;
    case "regex": return expr.value;
    case "ident": return getPath(context, expr.path);
    case "unary": {
      const value = evalExpr(expr.expr, context);
      if (expr.op === "!") return !truthy(value);
      if (expr.op === "-") return -asNumber(value);
      return asNumber(value);
    }
    case "binary": {
      if (expr.op === "&&") return truthy(evalExpr(expr.left, context)) && truthy(evalExpr(expr.right, context));
      if (expr.op === "||") return truthy(evalExpr(expr.left, context)) || truthy(evalExpr(expr.right, context));
      const left = evalExpr(expr.left, context);
      const right = evalExpr(expr.right, context);
      if (["==", "!=", ">", ">=", "<", "<=", "^=", "$=", "*=", "~=", "|="].includes(expr.op)) return compare(expr.op, left, right, expr.right);
      if (expr.op === "+") {
        const a = asNumber(left);
        const b = asNumber(right);
        return Number.isFinite(a) && Number.isFinite(b) ? a + b : `${asString(left)}${asString(right)}`;
      }
      const a = asNumber(left);
      const b = asNumber(right);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN;
      if (expr.op === "-") return a - b;
      if (expr.op === "*") return a * b;
      if (expr.op === "/") return a / b;
      if (expr.op === "%") return a % b;
      if (expr.op === "^") return a ** b;
      return undefined;
    }
  }
}

export function compileProductQuery(source: string): CompiledProductQuery {
  const clean = source.trim();
  if (!clean) return { source, isSimpleText: true, matches: () => true };
  const isSimpleText = !QUERY_OPERATOR_RE.test(clean) && !/^\//.test(clean);
  if (isSimpleText) {
    const lowered = clean.toLowerCase();
    return { source, isSimpleText, matches: (_context, text) => text.includes(lowered) };
  }
  try {
    const expr = new Parser(lex(clean)).parse();
    return { source, isSimpleText: false, matches: (context) => truthy(evalExpr(expr, context)) };
  } catch (error) {
    return { source, isSimpleText: false, error: (error as Error).message, matches: () => false };
  }
}
