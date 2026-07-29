---
id: entity-semantic-layer
type: Entity
status: confirmed
aliases: ["the semantic layer", "embedding-based association layer"]
provenance:
  wasGeneratedBy: activity-2026-07-29-manual-pass
  wasDerivedFrom: "discussion of entity continuity across sessions and the need for semantic (not string) matching"
---

A proposed mechanism that produces associative-tier edges (sameAs, relatesTo, inferred supersedes) between Knowledge nodes using semantic similarity rather than exact string matching, so entities and decisions referenced differently across sessions can still be linked. Produces candidate edges with a confidence score; does not decide truth on its own — see decision-automatic-hol-supervision for how those candidates get confirmed.
