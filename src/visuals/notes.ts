/** Translate a note value for display; musical evaluation stays in Strudel. */
export function midiNote(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const m = /^([a-g])([#b]?)(-?\d+)$/i.exec(value.trim());
  if (!m) return null;
  const pitch = (
    { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 } as Record<string, number>
  )[m[1].toLowerCase()];
  return (
    (Number(m[3]) + 1) * 12 + pitch + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)
  );
}
