---
id: decision-self-contained-notes
type: Decision
status: confirmed
provenance:
  wasGeneratedBy: activity-2026-07-29-manual-pass
  wasDerivedFrom: "user pushback: verbatim turn-by-turn retention potentially conflicts with graph topology and requires an LLM to re-read text to extract content"
edges:
  mentions: [entity-provenance-model, entity-context-graph]
rationale: >
  If a Knowledge node is just a pointer into the raw transcript, every future
  consumer must dereference and re-extract at query time — which is
  summarization deferred and repeated, not avoided.
alternatives_considered: >
  Notes-as-pointers-only, with the verbatim transcript as the primary read path
  (rejected: defeats the purpose of building a graph at all).
---

Every Knowledge node must contain the actual extracted assertion, written out in full, standing on its own. The verbatim transcript remains as a separate provenance layer (see entity-provenance-model), consulted only for audit or re-derivation — never required for normal use of a note.
