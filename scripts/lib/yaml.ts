export type YamlScalar = string | number | boolean | null;
export type YamlValue = YamlScalar | YamlValue[] | { [key: string]: YamlValue };

type ParsedLine = {
  indent: number;
  content: string;
  lineNumber: number;
};

function stripComment(line: string): string {
  let single = false;
  let double = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "'" && !double) single = !single;
    if (character === '"' && !single && line[index - 1] !== "\\") double = !double;
    if (character === "#" && !single && !double && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index);
    }
  }

  return line;
}

function findMappingColon(value: string): number {
  let single = false;
  let double = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "'" && !double) single = !single;
    if (character === '"' && !single && value[index - 1] !== "\\") double = !double;
    if (character === ":" && !single && !double) return index;
  }

  return -1;
}

function splitInlineList(value: string): string[] {
  const items: string[] = [];
  let current = "";
  let single = false;
  let double = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "'" && !double) single = !single;
    if (character === '"' && !single && value[index - 1] !== "\\") double = !double;
    if (character === "," && !single && !double) {
      items.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) items.push(current.trim());
  return items;
}

function splitInlineCollection(value: string): string[] {
  const items: string[] = [];
  let current = "";
  let single = false;
  let double = false;
  let squareDepth = 0;
  let curlyDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "'" && !double) single = !single;
    if (character === '"' && !single && value[index - 1] !== "\\") double = !double;
    if (!single && !double) {
      if (character === "[") squareDepth += 1;
      if (character === "]") squareDepth -= 1;
      if (character === "{") curlyDepth += 1;
      if (character === "}") curlyDepth -= 1;
    }
    if (character === "," && !single && !double && squareDepth === 0 && curlyDepth === 0) {
      items.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) items.push(current.trim());
  return items;
}

function parseScalar(value: string): YamlValue {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "~") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim();
    const result: { [key: string]: YamlValue } = {};
    if (!inner) return result;
    for (const item of splitInlineCollection(inner)) {
      const colon = findMappingColon(item);
      if (colon <= 0) throw new Error(`Invalid inline YAML mapping item: ${item}`);
      const key = item.slice(0, colon).trim();
      if (Object.prototype.hasOwnProperty.call(result, key)) throw new Error(`Duplicate inline YAML key: ${key}`);
      result[key] = parseScalar(item.slice(colon + 1));
    }
    return result;
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? splitInlineList(inner).map(parseScalar) : [];
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      throw new Error(`Invalid double-quoted YAML scalar: ${trimmed}`);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (trimmed === "|" || trimmed === ">") {
    throw new Error("Block scalars are intentionally unsupported by the Foundation parser");
  }
  return trimmed;
}

function parseMapping(
  lines: ParsedLine[],
  startIndex: number,
  indent: number,
): [YamlValue, number] {
  const result: { [key: string]: YamlValue } = {};
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (line.indent < indent) break;
    if (line.indent > indent) {
      throw new Error(`Unexpected indentation at line ${line.lineNumber}`);
    }
    if (line.content.startsWith("- ") || line.content === "-") break;

    const colon = findMappingColon(line.content);
    if (colon <= 0) throw new Error(`Expected key: value at line ${line.lineNumber}`);
    const key = line.content.slice(0, colon).trim();
    const rest = line.content.slice(colon + 1).trim();
    if (!key) throw new Error(`Empty key at line ${line.lineNumber}`);
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      throw new Error(`Duplicate key '${key}' at line ${line.lineNumber}`);
    }

    if (rest) {
      result[key] = parseScalar(rest);
      index += 1;
      continue;
    }

    const next = lines[index + 1];
    if (next && next.indent > indent) {
      const [child, nextIndex] = parseBlock(lines, index + 1, next.indent);
      result[key] = child;
      index = nextIndex;
    } else {
      result[key] = null;
      index += 1;
    }
  }

  return [result, index];
}

function parseSequence(
  lines: ParsedLine[],
  startIndex: number,
  indent: number,
): [YamlValue, number] {
  const result: YamlValue[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (line.indent < indent) break;
    if (line.indent !== indent || (!line.content.startsWith("- ") && line.content !== "-")) break;

    const itemText = line.content === "-" ? "" : line.content.slice(2).trim();
    if (!itemText) {
      const next = lines[index + 1];
      if (!next || next.indent <= indent) {
        result.push(null);
        index += 1;
      } else {
        const [child, nextIndex] = parseBlock(lines, index + 1, next.indent);
        result.push(child);
        index = nextIndex;
      }
      continue;
    }

    const colon = findMappingColon(itemText);
    if (colon > 0) {
      const objectItem: { [key: string]: YamlValue } = {};
      const key = itemText.slice(0, colon).trim();
      const rest = itemText.slice(colon + 1).trim();
      objectItem[key] = rest ? parseScalar(rest) : null;
      index += 1;

      if (!rest && lines[index] && lines[index].indent > indent) {
        const [child, nextIndex] = parseBlock(lines, index, lines[index].indent);
        objectItem[key] = child;
        index = nextIndex;
      }

      if (lines[index] && lines[index].indent > indent) {
        const [additional, nextIndex] = parseMapping(lines, index, lines[index].indent);
        if (!isRecord(additional)) {
          throw new Error(`Expected mapping fields after sequence item at line ${line.lineNumber}`);
        }
        Object.assign(objectItem, additional);
        index = nextIndex;
      }

      result.push(objectItem);
      continue;
    }

    result.push(parseScalar(itemText));
    index += 1;
  }

  return [result, index];
}

function parseBlock(
  lines: ParsedLine[],
  startIndex: number,
  indent: number,
): [YamlValue, number] {
  const first = lines[startIndex];
  if (!first) return [{}, startIndex];
  if (first.indent !== indent) {
    throw new Error(`Unexpected indentation at line ${first.lineNumber}`);
  }
  return first.content.startsWith("-")
    ? parseSequence(lines, startIndex, indent)
    : parseMapping(lines, startIndex, indent);
}

export function parseYaml(text: string): YamlValue {
  const lines: ParsedLine[] = [];

  text.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    if (rawLine.includes("\t")) throw new Error(`Tabs are not allowed at line ${lineIndex + 1}`);
    const withoutComment = stripComment(rawLine).replace(/\s+$/, "");
    if (!withoutComment.trim()) return;
    const indent = withoutComment.length - withoutComment.trimStart().length;
    if (indent % 2 !== 0) throw new Error(`Indentation must use two spaces at line ${lineIndex + 1}`);
    lines.push({ indent, content: withoutComment.trimStart(), lineNumber: lineIndex + 1 });
  });

  if (lines.length === 0) return {};
  if (lines[0].indent !== 0) throw new Error("Root YAML node must start at indentation 0");
  const [value, nextIndex] = parseBlock(lines, 0, 0);
  if (nextIndex !== lines.length) {
    throw new Error(`Unable to parse YAML near line ${lines[nextIndex].lineNumber}`);
  }
  return value;
}

export function isRecord(value: YamlValue | unknown): value is { [key: string]: YamlValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asRecord(value: YamlValue | unknown, label: string): { [key: string]: YamlValue } {
  if (!isRecord(value)) throw new Error(`${label} must be a mapping`);
  return value;
}

export function asArray(value: YamlValue | unknown, label: string): YamlValue[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`);
  return value;
}
