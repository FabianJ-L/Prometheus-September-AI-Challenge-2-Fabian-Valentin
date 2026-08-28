/**
 * Minimal Python tokenizer for the code viewer.
 *
 * A full highlighter (Shiki/Prism) is a large dependency for the handful of
 * beginner snippets NOESIS shows. This covers exactly the surface those
 * snippets use and degrades to plain text for anything else.
 */

export type TokenKind =
  | "keyword"
  | "builtin"
  | "string"
  | "number"
  | "comment"
  | "operator"
  | "punctuation"
  | "plain";

export interface Token {
  kind: TokenKind;
  value: string;
}

const KEYWORDS = new Set([
  "and", "as", "assert", "async", "await", "break", "class", "continue", "def",
  "del", "elif", "else", "except", "finally", "for", "from", "global", "if",
  "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise",
  "return", "try", "while", "with", "yield", "True", "False", "None",
]);

const BUILTINS = new Set([
  "abs", "all", "any", "bool", "dict", "enumerate", "filter", "float", "int",
  "len", "list", "map", "max", "min", "print", "range", "reversed", "round",
  "set", "sorted", "str", "sum", "tuple", "zip",
]);

const PATTERN = new RegExp(
  [
    "(#[^\\n]*)", // 1 comment
    "('''[\\s\\S]*?'''|\"\"\"[\\s\\S]*?\"\"\"|'[^'\\n]*'|\"[^\"\\n]*\")", // 2 string
    "(\\b\\d+\\.?\\d*\\b)", // 3 number
    "([A-Za-z_]\\w*)", // 4 word
    "([+\\-*/%=<>!&|^~]+)", // 5 operator
    "([()\\[\\]{},:.])", // 6 punctuation
  ].join("|"),
  "g",
);

export function tokenizePython(line: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  for (const match of line.matchAll(PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) tokens.push({ kind: "plain", value: line.slice(cursor, start) });

    const [value, comment, str, num, word, operator, punctuation] = match;
    if (comment) tokens.push({ kind: "comment", value });
    else if (str) tokens.push({ kind: "string", value });
    else if (num) tokens.push({ kind: "number", value });
    else if (word) {
      const kind: TokenKind = KEYWORDS.has(word)
        ? "keyword"
        : BUILTINS.has(word)
          ? "builtin"
          : "plain";
      tokens.push({ kind, value });
    } else if (operator) tokens.push({ kind: "operator", value });
    else if (punctuation) tokens.push({ kind: "punctuation", value });

    cursor = start + value.length;
  }

  if (cursor < line.length) tokens.push({ kind: "plain", value: line.slice(cursor) });
  return tokens;
}

export const TOKEN_CLASS: Record<TokenKind, string> = {
  keyword: "text-code-keyword",
  builtin: "text-code-builtin",
  string: "text-code-string",
  number: "text-code-number",
  comment: "text-code-comment italic",
  operator: "text-fg-muted",
  punctuation: "text-fg-muted",
  plain: "text-fg",
};
