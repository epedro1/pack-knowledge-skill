# Knowledge-pack ontology

Full schema referenced by [../SKILL.md](../SKILL.md). Read that file first for the process; this file defines the shape of what it produces.

## Contents
- [Two layers: Source vs. Knowledge](#two-layers-source-vs-knowledge)
- [Knowledge node types](#knowledge-node-types)
- [Instance shape and field reference](#instance-shape-and-field-reference)
- [Edge tiers](#edge-tiers)
- [Media taxonomy](#media-taxonomy)
- [Non-destructive rule](#non-destructive-rule)
- [Atomicity test](#atomicity-test)
- [Gap vs. the existing test data](#gap-vs-the-existing-test-data)

## Two layers: Source vs. Knowledge

**Source layer** (provenance — immutable once written, never itself the thing a consumer reads for knowledge):
- `Session`, `Turn` — raw material, stored verbatim in `sessions/<id>/transcript.jsonl`
- `Activity` — one ingestion or correction run: agent/model version, timestamp, sessions consumed, nodes touched. Stored in `activities/`.
- `Agent` — whoever/whatever performed an Activity — a model version, or a human (a human override is itself an Activity performed by a human Agent).

**Knowledge layer** (the actual graph — self-contained; using a node should never require dereferencing into the Source layer):
- `Assertion` (abstract) → `Decision`, `Fact`, `OpenQuestion`
- `Entity`
- `Artifact` → `GeneratedParseable`, `GeneratedOpaque`, `UploadedParseable`, `UploadedOpaque`

Every Knowledge node's frontmatter has a `provenance` block pointing at the Activity that generated it and the Source material it came from. That link is for audit and re-derivation — not the normal path to using the node. The node's `body` must be independently readable.

## Knowledge node types

| Type | Directory | Type-specific fields |
|---|---|---|
| `Decision` | `decisions/` | `rationale`, `alternatives_considered` |
| `Fact` | `facts/` | `validity: {as_of, superseded_by}` |
| `OpenQuestion` | `questions/` | `resolved` (bool), `resolved_by` (nullable) |
| `Entity` | `entities/` | `aliases` (list — feeds the associative-matching pass) |
| `Artifact` (4 subtypes) | `artifacts/` | `media_provenance` (generated/uploaded), `content_accessibility` (parseable/opaque), `recipe_ref` (if generated), `interpretation_status` (if opaque — see below) |

## Instance shape and field reference

Every node is one markdown file: `<type-prefix>-<kebab-slug>.md`, e.g. `decision-adopt-edge-tiers.md`, `entity-caesarea-dashboard.md`, `fact-rate-limit-2026-07.md`, `question-threshold-values.md`.

```yaml
---
id: decision-adopt-edge-tiers          # stable forever — never rename once other nodes link to it
type: Decision
status: confirmed                        # draft / confirmed / stale / disputed
provenance:
  wasGeneratedBy: activity-2026-08-01-ingest-pricing-session
  wasDerivedFrom: "session pricing-review-2026-08-01, turns ~40-55"
edges:
  mentions: [entity-pricing-model]                 # structural — bare id list
  resolves: [question-old-open-item]                 # structural — bare id list
  relatesTo:                                            # associative — object list, see Edge tiers
    - target: decision-related-thing
      confidence: 0.81
      status: confirmed
      proposed_by: activity-2026-08-01-ingest-pricing-session
rationale: >
  Why this decision was made — the part usually worth keeping.
alternatives_considered: >
  What else was on the table and why it lost, if stated.
---

The self-contained assertion, written out in full. A reader should not need
anything outside this file to understand what was decided and why.
```

`Fact` adds:
```yaml
validity:
  as_of: 2026-08-01
  superseded_by: null    # set to another Fact's id once a later Fact replaces it — never delete the old Fact
```

`OpenQuestion` adds:
```yaml
resolved: false
resolved_by: null    # id of the node that resolved it, once resolved: true
```

`Entity` adds:
```yaml
aliases: ["short name", "other name it's been called"]
```

## Edge tiers

Three tiers, distinguished by how they were established, not by vibes — this distinction is the core thing that keeps the graph trustworthy as it grows across many sessions.

| Tier | Edges | How established | Frontmatter shape |
|---|---|---|---|
| **Provenance** | `wasDerivedFrom`, `wasGeneratedBy`, `producedBy` | Deterministic — lives in the `provenance:` block, not `edges:` | scalar or small object, never re-verified |
| **Structural** | `mentions`/`about`, `resolves`, **explicit** `supersedes` | Deterministic — you saw it stated directly in the source (e.g. the user said "actually, correction: ...") | bare id, or list of bare ids |
| **Associative** | `sameAs`, `relatesTo`, **inferred** `supersedes` | Probabilistic — proposed by the semantic-matching pass comparing this node against the existing corpus, no explicit statement in the source | object with `target`, `confidence`, `status`, `proposed_by` |

Associative edge object shape:
```yaml
relatesTo:            # or sameAs, or supersedes with inferred: true
  - target: <node-id>
    confidence: 0.87           # 0-1, from the semantic-matching pass
    status: confirmed           # auto-set to 'confirmed' once confidence crosses the threshold
    proposed_by: <activity-id>  # which run proposed it — lets a human trace it back
```

**Auto-confirm, human-on-the-loop:** once confidence crosses the threshold (start at 0.85 for `sameAs`/`supersedes`, 0.7 for `relatesTo` — these are different because a wrong `sameAs`/`supersedes` changes how the graph is interpreted, a wrong `relatesTo` is just a low-stakes "see also"; tune both as you see false positives/negatives), set `status: confirmed` immediately — don't hold it at a pending state waiting for approval. Report every auto-confirmed edge from the run in your response to the user (see SKILL.md's "human-on-the-loop digest" step). If the user overrides one, flip its `status` to `human-rejected` or `human-corrected` and record the override itself as a new Activity performed by a human Agent — the override needs the same provenance trail as everything else.

An explicit `supersedes` (structural — the source stated a correction directly) can just be a bare id, since there's no confidence to attach: `supersedes: [fact-old-id]`. An *inferred* `supersedes` (associative — two Facts merely appear to conflict, nothing was explicitly stated) uses the object shape with `confidence` and needs the same auto-confirm/HOL treatment as `sameAs`/`relatesTo`.

## Media taxonomy

Two independent axes — don't collapse them into one generated-vs-uploaded binary, that misses real cases (a generated SVG with live text is both reproducible *and* directly parseable, which is different from a generated raster export that's reproducible but opaque):

|  | **Parseable** (structured content directly extractable) | **Opaque** (needs interpretive analysis) |
|---|---|---|
| **Generated** (recipe exists in the transcript) | `GeneratedParseable` — e.g. an SVG with live text nodes, generated code/JSON. Extract from the artifact's own final serialized state, not by replaying the recipe — the artifact is the authoritative final state, the recipe is just how it got there. | `GeneratedOpaque` — e.g. a rasterized PNG export. If a parseable precursor exists in the transcript (the pre-raster SVG/DOM), extract from that instead of the opaque output. If not, treat like UploadedOpaque below. |
| **Uploaded** (no recipe, arrived as-is) | `UploadedParseable` — e.g. an uploaded PDF/text file with a text layer. Extract directly, deterministically. | `UploadedOpaque` — e.g. an uploaded photo, audio, video. Requires an interpretive Activity (vision/audio analysis) to produce any content. |

For `GeneratedOpaque` and `UploadedOpaque` nodes, set `interpretation_status: needs-recheck` in frontmatter — this is fundamentally a standing liability, not a one-time fact: a better model later might extract more or correct a mistake, unlike parseable extraction which is deterministic and permanent. Don't treat an interpretive caption with the same permanence as a parsed text layer.

## Non-destructive rule

`sameAs` and `supersedes` never merge or delete a node. Both sides of the edge always keep existing as separate files; one is marked canonical through the edge (union-find style — a reader follows the edge to find the canonical version, nothing is thrown away). This exists specifically because associative edges auto-confirm without prior human approval: if a human later finds one wrong, they must be able to sever or flip it with zero data loss. Anything that would combine two files into one, or overwrite a Fact/Entity's content in place, violates this — don't do it, even if it seems tidier.

## Atomicity test

Before creating a node, ask: could this plausibly be linked to (via `mentions`, `relatesTo`, etc.) from more than one other place? If yes, it's its own node. If it's only ever going to be referenced from the one place you found it, it's probably not worth splitting out — fold it into the surrounding Decision/Fact instead of fragmenting the graph into unlinkable single-use notes.

## Gap vs. the existing test data

The hand-built example corpus already in this repo (`entities/`, `decisions/`, `facts/`, `questions/`, `activities/`) predates this document and uses a simplified convention: all edges, including `relatesTo`, are written as flat bare-id lists — none of them carry `confidence`/`status`/`proposed_by`. That was fine for validating node *types* and structural edges, but those particular `relatesTo` links were all explicit, single-session connections anyway (see that repo's README, limitation #3) — they were never real associative-tier proposals, so the missing metadata didn't matter yet. New nodes this skill creates should use the richer associative-edge shape above. The old nodes don't need to be rewritten just for this — but if you ever run a real cross-session associative-matching pass against them, upgrade any `relatesTo`/`sameAs` you touch to the full object shape rather than leaving it ambiguous which tier it's in.
