---
id: decision-edge-tiers
type: Decision
status: confirmed
provenance:
  wasGeneratedBy: activity-2026-07-29-manual-pass
  wasDerivedFrom: "graph-topology discussion following the taxonomy-as-core framing"
edges:
  mentions: [entity-context-graph, entity-provenance-model]
  relatesTo: [decision-non-destructive-merge, decision-automatic-hol-supervision]
rationale: >
  Collapsing deterministic provenance links and probabilistic semantic-layer
  guesses into one undifferentiated "related" edge lets guesses look as
  authoritative as facts, silently degrading graph quality as more sessions
  are ingested.
alternatives_considered: >
  A single homogeneous wikilink-style edge type (rejected: reintroduces the
  fragmentation/false-authority problem one layer up).
---

Edges are split into three trust tiers: **Provenance** (derivedFrom, wasGeneratedBy, producedBy — deterministic, never re-verified), **Structural** (mentions, resolves, explicit supersedes — deterministic, extracted from explicit statements), and **Associative** (sameAs, relatesTo, inferred supersedes — probabilistic, proposed by the semantic layer with a confidence score and a status field).
