/**
 * Convert viem/Ponder event args into JSON-safe values.
 * - BigInt -> string (JSON doesn't support BigInt)
 * - Arrays/objects recursively converted
 */
export function toJson(value: unknown): unknown {
  if (value === null) return null;
  const t = typeof value;

  if (t === "bigint") return (value as bigint).toString();
  if (t === "string" || t === "number" || t === "boolean") return value;

  if (Array.isArray(value)) return value.map(toJson);

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = toJson(v);
    }
    return out;
  }

  // Functions/symbols/undefined shouldn't appear in decoded args, but handle gracefully.
  return String(value);
}
