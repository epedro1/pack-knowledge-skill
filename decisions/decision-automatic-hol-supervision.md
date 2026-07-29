---
id: decision-automatic-hol-supervision
type: Decision
status: confirmed
provenance:
  wasGeneratedBy: activity-2026-07-29-manual-pass
  wasDerivedFrom: "direct user preference: 'automatic, with HOL supervision by users on both'"
edges:
  mentions: [entity-semantic-layer]
  relatesTo: [decision-non-destructive-merge, decision-edge-tiers]
rationale: >
  User preference: associative edges above a confidence threshold auto-promote
  to confirmed status rather than waiting for prior human approval
  (human-in-the-loop); humans instead review and can override after the fact
  (human-on-the-loop), applied to both the inferred-supersedes question and the
  general associative-edge-confirmation question.
alternatives_considered: >
  Human-in-the-loop gating (every associative edge held at 'proposed' until a
  human explicitly confirms) — rejected by user preference as too much friction
  at scale.
---

Associative edges (sameAs, relatesTo, inferred supersedes) auto-promote to `confirmed` once the semantic layer's confidence score crosses a threshold (value still unspecified — see question-differentiated-thresholds). Supervision happens after the fact: each ingestion Activity's record surfaces its auto-confirmed edges for human review, and an override is itself recorded as a corrective Activity performed by a human Agent.
