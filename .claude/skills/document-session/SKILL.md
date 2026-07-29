---
name: document-session
description: Ingest a long Claude Code conversation (this one, or another session/transcript the user points at) into this repo's knowledge-pack context graph — a git-backed, typed collection of Decisions, Facts, Entities, OpenQuestions, and Artifacts extracted turn-by-turn, never summarized. Use this whenever the user asks to "document this session", "capture this conversation", "add this to the knowledge pack", "ingest this session", "log this into the graph", or wants to preserve what was decided or learned in a long conversation so a future session — theirs or a teammate's — can reuse it without re-reading the whole transcript. Also trigger when the user references the knowledge pack, the context graph, or wants to extend/update the entities/decisions/facts/questions/artifacts structure in this repo.
---

# Document Session — knowledge-pack ingestion

This skill turns a conversation into a graph, not a summary. The distinction matters: a summary is lossy and gets stale; this produces self-contained knowledge nodes with typed, trust-tiered links back to their source, so anyone (human or another Claude session) can use the graph directly without dereferencing into raw transcript.

Read [references/ontology.md](references/ontology.md) before writing any node — it has the full schema (node types, field shapes, edge tiers, concrete YAML examples). This file covers the *process*; that file covers the *shape of what you produce*.

## Why turn-by-turn, in batches

The whole point of this skill is that session length must never be the thing that decides what gets captured. Don't read the full session into context and then write notes from a compressed mental summary at the end — that's exactly the failure mode this design exists to avoid. Instead:

1. Walk the source turn-by-turn, in batches small enough to reason about carefully (roughly 15-25 turns, fewer if turns are long — big documents, heavy tool output, images).
2. Process one batch fully (append to the transcript log, extract nodes, update edges) before moving to the next.
3. Never let "I'm running low on context" change what you extract — if a session is long, that just means more batches, not thinner extraction per batch.

## Locate the source

There are three possible sources, and they carry different fidelity guarantees. Use whichever matches what you're documenting, and be honest in each node's `wasDerivedFrom` about which one you used — don't let a lower-fidelity source's provenance read as if it were precise.

### 1. The current conversation (live context)

Only safe to batch directly from context if the session is short enough that the harness hasn't compressed anything yet. Long conversations get automatically compressed as they approach context limits — once that's happened, your live view of the earlier turns is already lossy, which defeats the entire point of this skill for exactly the turns that got compressed away. If the session is long, or you're not sure whether compression has happened, prefer option 2 below even for the current session — it's the same underlying file, and it's guaranteed not to be compressed.

### 2. A local Claude Code session (current or past) — read the on-disk transcript

Claude Code persists every session as a JSONL file at:
```
~/.claude/projects/<project-slug>/<session-id>.jsonl
```
`<project-slug>` is the working directory path with `/` replaced by `-`. If you don't know the session id, the session-management tools (`list_sessions` / `get_session`, when available) can look it up by title, working directory, or recent activity.

This file is the durable, uncompressed record — read it in batches directly from disk rather than through live context, regardless of session length. Each line is a JSON object with a `type` field. The ones worth extracting knowledge from are `user`, `assistant`, and `attachment`. Skip `system`, `queue-operation`, `last-prompt`, and `ai-title` entries — those are harness bookkeeping, not conversational content.

### 3. A manually exported or pasted transcript

For anything outside Claude Code's own session storage — a claude.ai conversation, a Chat-mode conversation, or any other source — there's no file for you to read directly. The user has to export or copy the conversation themselves (claude.ai's account-level data export if available, or a plain copy-paste of the visible text) and save any images/attachments separately, then hand you the resulting file(s).

This source has real, permanent fidelity limits compared to the other two, and every node extracted from it should say so honestly rather than imply precision it doesn't have:
- **No exact turn boundaries** — batch by natural paragraph/section breaks instead, and use approximate language in `wasDerivedFrom` (e.g. "manually exported conversation, pricing-discussion section") rather than a turn range.
- **No structured tool-call data** — you only have what was visibly rendered in the chat, nothing that happened behind the scenes.
- **Media must have been staged separately** by the user before you start — check for it explicitly rather than assuming it travelled with the text.

## Before you start: check the existing corpus

Never create a new node without first checking whether one already exists for the same thing:

```bash
grep -rl "aliases:" entities/ | xargs grep -li "<candidate name>"
```

Same Entity or Fact mentioned twice **within one session** should stay one node with additional `mentions` edges added to it — not a duplicate file. This is a purely mechanical check within a single ingestion run (same session, explicit re-mention); it is NOT the same thing as the semantic/associative matching described in the ontology doc, which handles matching across *different* sessions where nothing was explicitly re-stated.

## Per-batch procedure

For each batch of turns:

1. **Append raw content verbatim** to this session's transcript log under `sessions/<session-id>/transcript.jsonl` (create the session folder on first batch). This is the provenance layer — immutable, never edited after being written, and never itself the thing a consumer reads for knowledge. See references/ontology.md's Source layer section.
2. **Copy any referenced media** into `assets/<session-id>/`, preserving something recognizable about the original filename.
3. **Extract knowledge units.** For each Decision, Fact, Entity, OpenQuestion, or Artifact you find in the batch:
   - Check whether it already exists (see above). If yes, add edges to it, don't duplicate it.
   - If new, create a node file per references/ontology.md's instance shape. **The body must contain the actual extracted content, written out in full** — never just a pointer or title requiring the reader to go re-read the transcript. This was a deliberate, hard-won design choice; don't regress to "note = pointer."
   - Use the atomicity test from references/ontology.md to decide granularity: could this plausibly be linked to from more than one place? If not, it's probably part of a larger node, not its own.
4. **Add structural edges** (`mentions`, `resolves`, explicit `supersedes`) as you write each node — these are deterministic, you can see them directly in the text, no confidence score needed.
5. **Do not invent associative edges** (`sameAs`, `relatesTo` across sessions, inferred `supersedes`) by hand during extraction. Those come from the semantic-matching step below, which runs once per ingestion run, not per batch — see references/ontology.md for the confidence/auto-confirm mechanism.

## After all batches: reconcile, regenerate, record, commit

1. **Run the associative-matching pass** once, across the whole corpus (existing nodes plus what you just added) — not per batch. For each new Entity/Fact, compare it against existing ones for likely equivalence or relation. Where you're confident enough to propose a link, write it as an associative edge per the confidence/status shape in references/ontology.md. Confidence crossing the threshold auto-promotes it to `confirmed` — you do not need to pause and ask the user before writing it. This is deliberate: the user chose automatic promotion with after-the-fact human review, not upfront approval gating.
2. **Regenerate the graph index** by running:
   ```bash
   node .claude/skills/document-session/scripts/regenerate_graph.js
   ```
   This is a deterministic script (zero dependencies — plain Node) — it rebuilds `graph.md` (node/edge list + mermaid diagram) by scanning frontmatter. Don't hand-write graph.md; always regenerate it, so it never drifts from the actual node files.
3. **Record this run as an Activity** — create `activities/activity-<date>-<short-slug>.md` per the ontology doc, listing the session(s) consumed and every node created or touched.
4. **Report a human-on-the-loop digest to the user** before finishing, in your normal response (not just in files): list any associative edges you auto-confirmed this run, with their confidence scores, so the user can review and override anything that looks wrong. This step is not optional — automatic confirmation only stays safe if the human actually gets shown what got confirmed.
5. **Commit to git** with a message naming what was ingested (e.g. "Ingest session 2026-08-01: pricing-model discussion — 6 nodes, 2 auto-confirmed associative edges"). This is what makes the skill's contributions distinguishable from human edits in `git log`/`git blame` later — don't skip it or bundle it into an unrelated commit.

## Extending vs. fresh ingestion

Re-running this skill on a new session should **extend** the pack, not recreate it: read existing nodes first, add to them where the same Entity/Fact/Decision resurfaces, create new nodes only for genuinely new things. Any node a human has hand-edited since the last run must be respected as-is — read its current content before touching it, don't silently overwrite based on stale assumptions from a prior run.

## Non-destructive rule (hard constraint, no exceptions)

`sameAs` and `supersedes` edges never merge or delete a node, ever — both sides always keep existing, one is marked canonical via the edge itself. If you're about to combine two files into one or overwrite a Fact's content in place, stop — that's not how this works. See references/ontology.md for why (it's what makes human override of an auto-confirmed edge safe and lossless).
