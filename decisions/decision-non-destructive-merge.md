---
id: decision-non-destructive-merge
type: Decision
status: confirmed
provenance:
  wasGeneratedBy: activity-2026-07-29-manual-pass
  wasDerivedFrom: "follow-up from the automatic + human-on-the-loop supervision decision"
edges:
  mentions: [entity-context-graph]
  relatesTo: [decision-edge-tiers, decision-automatic-hol-supervision]
rationale: >
  Because associative edges (sameAs, supersedes) can be auto-confirmed without
  a prior human gate, any action they trigger must be reversible without data
  loss, or a human catching a mistake later would have no way to cleanly undo it.
alternatives_considered: >
  Destructively merging matched Entity nodes, or overwriting superseded Facts
  (rejected: not reversible, incompatible with automatic + human-on-the-loop
  supervision).
---

`sameAs` and `supersedes` edges never merge or delete the underlying nodes. Both original nodes always continue to exist; one is marked canonical via the edge (union-find style). A human override later is just severing or flipping the edge's status — the original data is untouched throughout.
