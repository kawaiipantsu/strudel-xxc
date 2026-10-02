import { parse } from "acorn";

// Strudel interprets double-quoted strings as mini notation, even inside a sample map.
export function plainString(value) {
  return (
    "'" +
    String(value)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029") +
    "'"
  );
}
export function sampleMapCode(map) {
  if (typeof map === "string") return plainString(map);
  if (Array.isArray(map)) return "[" + map.map(sampleMapCode).join(", ") + "]";
  if (map && typeof map === "object")
    return (
      "{ " +
      Object.entries(map)
        .map(([key, value]) => plainString(key) + ": " + sampleMapCode(value))
        .join(", ") +
      " }"
    );
  throw new Error(
    "Sample maps must contain URL strings, arrays, or pitched maps",
  );
}
export function sampleSnippet(name, url) {
  const safe =
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^[^a-z]+/, "") || "my_sample";
  return (
    "\nsamples(" + sampleMapCode({ [safe]: url }) + ')\n$: s("' + safe + '")\n'
  );
}

/** Only offer literal-string repairs inside samples(...); never execute or rewrite arbitrary code. */
export function sampleQuoteRepairs(source) {
  let tree;
  try {
    tree = parse(source, {
      ecmaVersion: "latest",
      allowAwaitOutsideFunction: true,
    });
  } catch {
    return [];
  } // Let the official Strudel transpiler report unrelated syntax errors.
  const edits = [];
  const visit = (node, insideMap = false) => {
    if (!node || typeof node !== "object") return;
    if (
      node.type === "CallExpression" &&
      node.callee?.type === "Identifier" &&
      node.callee.name === "samples"
    ) {
      for (const arg of node.arguments) visit(arg, true);
      return;
    }
    if (
      insideMap &&
      node.type === "Literal" &&
      typeof node.value === "string" &&
      source[node.start] === '"'
    ) {
      edits.push({
        from: node.start,
        to: node.end,
        insert: plainString(node.value),
      });
      return;
    }
    // Do not rewrite strings inside user-provided callbacks or unrelated expressions.
    if (
      insideMap &&
      !["ObjectExpression", "Property", "ArrayExpression"].includes(node.type)
    )
      return;
    for (const [key, value] of Object.entries(node)) {
      if (["start", "end", "loc"].includes(key)) continue;
      if (Array.isArray(value))
        value.forEach((child) => visit(child, insideMap));
      else if (value && typeof value === "object") visit(value, insideMap);
    }
  };
  visit(tree);
  return edits.sort((a, b) => a.from - b.from);
}
