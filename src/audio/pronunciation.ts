export type NumberSemanticType =
  | "quantity"
  | "money"
  | "percentage"
  | "date"
  | "time"
  | "decimal"
  | "range"
  | "model_name"
  | "product_name"
  | "acronym"
  | "phone_or_code"
  | "version"
  | "engine_displacement"
  | "battery_capacity"
  | "distance"
  | "speed"
  | "power"
  | "torque";

export type PronunciationEntry = {
  sourceText: string;
  semanticType: NumberSemanticType;
  spokenText: string;
  context?: string;
  status: "approved" | "provider_native_verified";
};

export type PronunciationToken = {
  sourceText: string;
  semanticType: NumberSemanticType;
  spokenText?: string;
  context?: string;
};

const DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const SMALL_UNITS = ["", "十", "百", "千"];
const BIG_UNITS = ["", "万", "亿", "兆"];

function integerGroupToChinese(group: number): string {
  const digits = String(group).padStart(4, "0").split("").map(Number);
  let result = "";
  let pendingZero = false;
  for (let index = 0; index < digits.length; index += 1) {
    const digit = digits[index];
    const unitIndex = digits.length - index - 1;
    if (digit === 0) {
      if (result && digits.slice(index + 1).some((value) => value !== 0)) pendingZero = true;
      continue;
    }
    if (pendingZero) result += "零";
    result += `${DIGITS[digit]}${SMALL_UNITS[unitIndex]}`;
    pendingZero = false;
  }
  return result;
}

export function integerToChinese(input: string | number): string {
  const normalized = String(input).replaceAll(",", "").trim();
  if (!/^-?\d+$/u.test(normalized)) throw new Error(`不是整数：${input}`);
  const negative = normalized.startsWith("-");
  const digits = normalized.replace(/^-/, "").replace(/^0+(?=\d)/u, "");
  if (digits === "0") return "零";
  const groups: number[] = [];
  for (let end = digits.length; end > 0; end -= 4) groups.unshift(Number(digits.slice(Math.max(0, end - 4), end)));
  let result = "";
  let zeroBetween = false;
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const bigUnitIndex = groups.length - index - 1;
    if (group === 0) {
      if (result) zeroBetween = true;
      continue;
    }
    if (result && (zeroBetween || group < 1000)) result += "零";
    result += `${integerGroupToChinese(group)}${BIG_UNITS[bigUnitIndex] ?? ""}`;
    zeroBetween = false;
  }
  result = result.replace(/^一十/u, "十");
  return `${negative ? "负" : ""}${result}`;
}

export function digitsIndividually(input: string): string {
  return input.replace(/\D/gu, "").split("").map((value) => DIGITS[Number(value)]).join("");
}

export function spokenForSemantic(token: PronunciationToken, dictionary: PronunciationEntry[] = []): string {
  const contextual = dictionary.find((entry) => (
    entry.sourceText === token.sourceText
    && entry.semanticType === token.semanticType
    && (!entry.context || entry.context === token.context)
  ));
  if (token.spokenText) return token.spokenText;
  if (contextual) return contextual.spokenText;
  const source = token.sourceText.trim();
  if (token.semanticType === "quantity") return integerToChinese(source);
  if (token.semanticType === "percentage") {
    const numeric = source.replace("%", "").replace("+", "");
    if (numeric.startsWith("-")) return `下降百分之${integerToChinese(numeric.slice(1))}`;
    return `百分之${integerToChinese(numeric)}`;
  }
  if (token.semanticType === "decimal") {
    const [whole, fraction] = source.split(".");
    if (fraction === undefined) throw new Error(`小数格式无效：${source}`);
    return `${integerToChinese(whole)}点${digitsIndividually(fraction)}`;
  }
  if (token.semanticType === "range") {
    const match = /^(.+?)[–—-](.+)$/u.exec(source);
    if (!match) throw new Error(`范围格式无效：${source}`);
    return `${integerToChinese(match[1])}到${integerToChinese(match[2])}`;
  }
  if (token.semanticType === "date") {
    const match = /^(\d{4})年(\d{1,2})月(?:(\d{1,2})日)?$/u.exec(source);
    if (!match) throw new Error(`日期格式无效：${source}`);
    return `${digitsIndividually(match[1])}年${integerToChinese(match[2])}月${match[3] ? `${integerToChinese(match[3])}日` : ""}`;
  }
  if (token.semanticType === "phone_or_code") return digitsIndividually(source);
  throw new Error(`缺少 ${token.semanticType} 发音词典：${source}${token.context ? ` (${token.context})` : ""}`);
}

export function applyPronunciationTokens(
  narrationText: string,
  tokens: PronunciationToken[],
  dictionary: PronunciationEntry[] = [],
): string {
  let output = narrationText;
  for (const token of tokens) {
    if (!output.includes(token.sourceText)) throw new Error(`旁白未找到待替换词：${token.sourceText}`);
    output = output.replaceAll(token.sourceText, spokenForSemantic(token, dictionary));
  }
  return output;
}
