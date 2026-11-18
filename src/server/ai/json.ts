import { z } from "zod";

/**
 * JSON helpers shared by every AI provider. Pure functions.
 *
 * Answer schemas follow the strictest provider rules so the same schema works on Claude,
 * Gemini and OpenAI. Every object lists all of its fields as required and allows no extra
 * fields. A value that may be missing is written as nullable, never as optional.
 */

type JsonSchema = Record<string, unknown>;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Lists every place where the schema breaks the strict rules. Empty means it is fine. */
export function strictSchemaProblems(schema: unknown, path = "answer"): string[] {
  if (!isObject(schema)) return [];
  const problems: string[] = [];
  const props = isObject(schema.properties) ? schema.properties : null;
  if (schema.type === "object" || props) {
    const keys = Object.keys(props ?? {});
    const required = Array.isArray(schema.required) ? (schema.required as unknown[]) : [];
    const missing = keys.filter((k) => !required.includes(k));
    if (missing.length) problems.push(`${path} has optional fields (${missing.join(", ")}). Use nullable instead.`);
    if (schema.additionalProperties !== false) problems.push(`${path} must not allow extra fields.`);
    for (const k of keys) problems.push(...strictSchemaProblems(props?.[k], `${path}.${k}`));
  }
  if (schema.items) problems.push(...strictSchemaProblems(schema.items, `${path}[]`));
  for (const key of ["anyOf", "oneOf", "allOf"] as const) {
    const list = schema[key];
    if (Array.isArray(list)) list.forEach((s, i) => problems.push(...strictSchemaProblems(s, `${path}(${key} ${i + 1})`)));
  }
  return problems;
}

/**
 * Converts a zod schema to the JSON Schema sent to providers. Throws when the schema would
 * not be accepted in strict mode, so a mistake shows up in development and not as a
 * provider error in production.
 */
export function toProviderJsonSchema(schema: z.ZodType): JsonSchema {
  const { $schema: _dialect, ...rest } = z.toJSONSchema(schema) as JsonSchema;
  void _dialect;
  if (rest.type !== "object") throw new Error("An AI answer schema must be an object at the top level.");
  const problems = strictSchemaProblems(rest);
  if (problems.length) throw new Error(`AI answer schema is not strict. ${problems.join(" ")}`);
  return rest;
}

/**
 * Parses a model answer as JSON. Structured output normally returns clean JSON. This also
 * accepts an answer wrapped in a code fence or surrounded by a sentence, and throws when no
 * JSON value can be found.
 */
export function parseJsonAnswer(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("The answer was empty.");
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to the tolerant paths
  }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // fall through
    }
  }
  const start = trimmed.search(/[{[]/);
  const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // fall through
    }
  }
  throw new Error("The answer was not valid JSON.");
}
