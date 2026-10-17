/** A bounded arithmetic parser. Formulas never execute JavaScript or access the network. */
export type CellValue = number | string;
const MAX_ROWS = 500;
const MAX_COLUMNS = 52;
export function columnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value--;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}
function address(value: string): [number, number] {
  const match = /^([A-Z]{1,2})([1-9]\d{0,2})$/.exec(value);
  if (!match) throw new Error("#REF!");
  let column = 0;
  for (const letter of match[1] ?? "") column = column * 26 + letter.charCodeAt(0) - 64;
  const row = Number(match[2]);
  if (row > MAX_ROWS || column > MAX_COLUMNS) throw new Error("#REF!");
  return [row - 1, column - 1];
}
export function calculateCell(key: string, cells: Readonly<Record<string, string>>): CellValue {
  const active = new Set<string>();
  let budget = 20000;
  const numeric = (value: CellValue) => {
    if (typeof value === "string" && value.startsWith("#")) throw new Error(value);
    const number = typeof value === "number" ? value : value.trim() === "" ? 0 : Number(value);
    if (!Number.isFinite(number)) throw new Error("#VALUE!");
    return number;
  };
  const cell = (id: string): CellValue => {
    if (--budget < 0) throw new Error("#LIMIT!");
    address(id);
    if (active.has(id) || active.size > 100) throw new Error("#CYCLE!");
    const value = cells[id] ?? "";
    if (!value.startsWith("="))
      return value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : value;
    if (value.length > 4096) throw new Error("#LIMIT!");
    active.add(id);
    try {
      return formula(value.slice(1));
    } finally {
      active.delete(id);
    }
  };
  const formula = (input: string): number => {
    const tokens =
      input
        .toUpperCase()
        .match(/(?:\d*\.\d+|\d+\.?\d*)(?:E[+-]?\d+)?|[A-Z]+\d*|[()+\-*/^,:]|\S/g) ?? [];
    let index = 0;
    const peek = () => tokens[index];
    const take = () => {
      if (--budget < 0) throw new Error("#LIMIT!");
      return tokens[index++];
    };
    const require = (token: string) => {
      if (take() !== token) throw new Error("#FORMULA!");
    };
    const primary = (depth = 0): number => {
      if (depth > 64) throw new Error("#LIMIT!");
      const token = take();
      if (token === "+") return primary(depth + 1);
      if (token === "-") return -primary(depth + 1);
      if (token === "(") {
        const value = expression(depth + 1);
        require(")");
        return value;
      }
      if (!token) throw new Error("#FORMULA!");
      if (/^[A-Z]+$/.test(token)) {
        if (!["SUM", "AVERAGE", "MIN", "MAX", "COUNT", "ABS", "ROUND"].includes(token))
          throw new Error("#NAME?");
        require("(");
        const values: number[] = [];
        while (peek() !== ")") {
          if (/^[A-Z]+\d+$/.test(peek() ?? "") && tokens[index + 1] === ":") {
            const start = address(take() ?? "");
            require(":");
            const end = address(take() ?? "");
            for (let row = Math.min(start[0], end[0]); row <= Math.max(start[0], end[0]); row++)
              for (let col = Math.min(start[1], end[1]); col <= Math.max(start[1], end[1]); col++) {
                const value = cell(`${columnName(col)}${row + 1}`);
                if (value !== "" && (typeof value === "number" || Number.isFinite(Number(value))))
                  values.push(numeric(value));
                else if (typeof value === "string" && value.startsWith("#")) throw new Error(value);
              }
          } else values.push(expression(depth + 1));
          if (peek() !== ",") break;
          take();
        }
        require(")");
        if (token === "COUNT") return values.length;
        if (token === "SUM") return values.reduce((a, b) => a + b, 0);
        if (token === "AVERAGE") {
          if (!values.length) throw new Error("#DIV/0!");
          return values.reduce((a, b) => a + b, 0) / values.length;
        }
        if (token === "MIN") return values.length ? Math.min(...values) : 0;
        if (token === "MAX") return values.length ? Math.max(...values) : 0;
        if (token === "ABS") return Math.abs(values[0] ?? 0);
        const places = Math.max(-10, Math.min(10, Math.trunc(values[1] ?? 0)));
        return Math.round((values[0] ?? 0) * 10 ** places) / 10 ** places;
      }
      if (/^[A-Z]+\d+$/.test(token)) return numeric(cell(token));
      const number = Number(token);
      if (!Number.isFinite(number)) throw new Error("#FORMULA!");
      return number;
    };
    const power = (depth: number): number => {
      const value = primary(depth);
      if (peek() !== "^") return value;
      take();
      return value ** power(depth + 1);
    };
    const product = (depth: number): number => {
      let value = power(depth);
      while (peek() === "*" || peek() === "/") {
        const operator = take();
        const right = power(depth);
        if (operator === "/" && right === 0) throw new Error("#DIV/0!");
        value = operator === "*" ? value * right : value / right;
      }
      return value;
    };
    const expression = (depth: number): number => {
      let value = product(depth);
      while (peek() === "+" || peek() === "-") {
        const operator = take();
        const right = product(depth);
        value = operator === "+" ? value + right : value - right;
      }
      return value;
    };
    const result = expression(0);
    if (index !== tokens.length) throw new Error("#FORMULA!");
    if (!Number.isFinite(result)) throw new Error("#NUM!");
    return result;
  };
  try {
    return cell(key.toUpperCase());
  } catch (error) {
    return error instanceof Error && error.message.startsWith("#") ? error.message : "#FORMULA!";
  }
}
