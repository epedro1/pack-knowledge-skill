#!/usr/bin/env node
/**
 * Regenerate graph.md from node frontmatter.
 *
 * Deterministic — scans entities/decisions/facts/questions/artifacts for the
 * `id`, `type`, and `edges:` fields in each file's frontmatter and rebuilds
 * the node/edge index. Never hand-edit graph.md; re-run this script instead,
 * so it can't drift from the actual node files.
 *
 * Zero dependencies on purpose: this only needs to run with a plain `node`
 * on any teammate's machine, whether they cloned the repo or just copied
 * this skill folder into another project. It is NOT a general YAML parser —
 * it only understands the specific frontmatter shapes documented in
 * ../references/ontology.md, since this skill is the only writer.
 */
const fs = require("fs");
const path = require("path");

const NODE_DIRS = ["entities", "decisions", "facts", "questions", "artifacts"];
const STRUCTURAL_KEYS = new Set(["mentions", "about", "resolves"]);
const ASSOCIATIVE_ONLY_KEYS = new Set(["sameAs", "relatesTo"]);

function findRepoRoot(start) {
  let dir = start;
  while (!fs.existsSync(path.join(dir, "entities")) && path.dirname(dir) !== dir) {
    dir = path.dirname(dir);
  }
  return dir;
}

function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === "" || s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  return stripQuotes(s);
}

function indentOf(line) {
  return line.match(/^ */)[0].length;
}

// Parses the indented lines that follow an `edges:` header line.
function parseEdgesBlock(lines) {
  const edges = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const indent = indentOf(line);
    const keyMatch = line.match(/^\s*([A-Za-z_]+):\s*(.*)$/);
    if (!keyMatch) { i++; continue; }
    const [, key, restRaw] = keyMatch;
    const rest = restRaw.trim();

    if (rest.startsWith("[")) {
      // flow-style list on one line: key: [a, b, c]
      const inner = rest.replace(/^\[/, "").replace(/\]$/, "");
      edges[key] = inner.split(",").map((s) => stripQuotes(s.trim())).filter(Boolean);
      i++;
    } else if (rest === "") {
      // block-style list follows, more indented than this key's line
      i++;
      const items = [];
      while (i < lines.length) {
        const child = lines[i];
        if (!child.trim()) { i++; continue; }
        const childIndent = indentOf(child);
        if (childIndent <= indent) break;
        const itemMatch = child.match(/^\s*-\s*(.*)$/);
        if (!itemMatch) { i++; continue; }
        const itemRest = itemMatch[1];
        if (itemRest.includes(":")) {
          // object item — first field is on the `- ` line itself
          const obj = {};
          const firstField = itemRest.match(/^([A-Za-z_]+):\s*(.*)$/);
          if (firstField) obj[firstField[1]] = parseScalar(firstField[2]);
          i++;
          while (i < lines.length) {
            const fLine = lines[i];
            if (!fLine.trim()) { i++; continue; }
            const fIndent = indentOf(fLine);
            if (fIndent <= childIndent) break;
            const fMatch = fLine.match(/^\s*([A-Za-z_]+):\s*(.*)$/);
            if (!fMatch) break;
            obj[fMatch[1]] = parseScalar(fMatch[2]);
            i++;
          }
          items.push(obj);
        } else {
          items.push(stripQuotes(itemRest));
          i++;
        }
      }
      edges[key] = items;
    } else {
      edges[key] = [stripQuotes(rest)];
      i++;
    }
  }
  return edges;
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const fmLines = text.slice(3, end).split("\n");

  let id = null;
  let type = null;
  let edges = {};

  for (let i = 0; i < fmLines.length; i++) {
    const line = fmLines[i];
    if (indentOf(line) !== 0) continue; // only top-level keys here
    const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, restRaw] = m;
    if (key === "id") id = parseScalar(restRaw);
    if (key === "type") type = parseScalar(restRaw);
    if (key === "edges") {
      // gather all following lines more indented than this (indent 0) line
      const block = [];
      let j = i + 1;
      while (j < fmLines.length && (fmLines[j].trim() === "" || indentOf(fmLines[j]) > 0)) {
        block.push(fmLines[j]);
        j++;
      }
      edges = parseEdgesBlock(block);
    }
  }

  if (!id) return null;
  return { id, type: type || "Unknown", edges };
}

function collectNodes(root) {
  const nodes = {};
  for (const dir of NODE_DIRS) {
    const dirPath = path.join(root, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath).filter((f) => f.endsWith(".md")).sort()) {
      const text = fs.readFileSync(path.join(dirPath, file), "utf8");
      const fm = parseFrontmatter(text);
      if (fm) nodes[fm.id] = fm;
    }
  }
  return nodes;
}

function classifyEdge(key, target) {
  if (STRUCTURAL_KEYS.has(key)) return "structural";
  if (ASSOCIATIVE_ONLY_KEYS.has(key)) return "associative";
  if (key === "supersedes") {
    return typeof target === "object" && target && target.inferred ? "associative" : "structural";
  }
  return "unknown";
}

function buildEdges(nodes) {
  const edges = []; // {src, key, tier, dst, confidence, status}
  for (const [nodeId, fm] of Object.entries(nodes)) {
    for (const [key, targets] of Object.entries(fm.edges || {})) {
      for (const t of targets || []) {
        const isObj = typeof t === "object" && t !== null;
        const dst = isObj ? t.target : t;
        if (!dst) continue;
        edges.push({
          src: nodeId,
          key,
          tier: classifyEdge(key, t),
          dst,
          confidence: isObj ? t.confidence ?? null : null,
          status: isObj ? t.status || "confirmed" : "confirmed",
        });
      }
    }
  }
  return edges;
}

function mermaidId(id) {
  return id.replace(/-/g, "_");
}

function render(nodes, edges) {
  const visible = edges.filter((e) => e.status !== "human-rejected");
  const rejectedCount = edges.length - visible.length;

  const lines = [
    "# Graph index",
    "",
    "Auto-generated by `.claude/skills/document-session/scripts/regenerate_graph.js` " +
      "— do not hand-edit, re-run the script instead.",
    "",
    "```mermaid",
    "graph TD",
  ];

  const byType = {};
  for (const [nodeId, fm] of Object.entries(nodes)) {
    (byType[fm.type] ||= []).push(nodeId);
  }
  for (const type of Object.keys(byType).sort()) {
    lines.push(`  subgraph "${type}"`);
    for (const nodeId of byType[type].sort()) {
      lines.push(`    ${mermaidId(nodeId)}[${nodeId}]`);
    }
    lines.push("  end");
  }

  for (const e of visible) {
    if (!nodes[e.dst]) continue; // dangling — target doesn't exist (yet, or removed)
    const srcM = mermaidId(e.src);
    const dstM = mermaidId(e.dst);
    if (e.tier === "associative") {
      lines.push(`  ${srcM} ==${e.key}==> ${dstM}`);
    } else {
      lines.push(`  ${srcM} -.${e.key}.-> ${dstM}`);
    }
  }
  lines.push("```", "");

  lines.push("## Edge list", "");
  lines.push("| From | Edge | Tier | To | Confidence | Status |");
  lines.push("|---|---|---|---|---|---|");
  const sorted = [...visible].sort((a, b) =>
    a.src === b.src ? (a.key === b.key ? a.dst.localeCompare(b.dst) : a.key.localeCompare(b.key)) : a.src.localeCompare(b.src)
  );
  for (const e of sorted) {
    const conf = e.confidence != null ? e.confidence.toFixed(2) : "—";
    lines.push(`| ${e.src} | ${e.key} | ${e.tier} | ${e.dst} | ${conf} | ${e.status} |`);
  }
  lines.push("");

  const dangling = [...new Set(visible.filter((e) => !nodes[e.dst]).map((e) => e.dst))].sort();
  if (dangling.length) {
    lines.push(`**Dangling edges (target not found):** ${dangling.join(", ")}`, "");
  }

  let summary = `**${Object.keys(nodes).length} nodes, ${visible.length} active edges`;
  if (rejectedCount) summary += `, ${rejectedCount} human-rejected edges omitted from the diagram`;
  summary += ".**";
  lines.push(summary);

  return lines.join("\n") + "\n";
}

function main() {
  const root = findRepoRoot(process.cwd());
  const nodes = collectNodes(root);
  const edges = buildEdges(nodes);
  const outPath = path.join(root, "graph.md");
  fs.writeFileSync(outPath, render(nodes, edges));
  console.log(`Wrote ${outPath} (${Object.keys(nodes).length} nodes, ${edges.length} edges)`);
}

main();
