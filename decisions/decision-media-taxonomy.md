---
id: decision-media-taxonomy
type: Decision
status: confirmed
provenance:
  wasGeneratedBy: activity-2026-07-29-manual-pass
  wasDerivedFrom: "user correction: generated SVG designs contain 'live text', disproving the original generated-vs-uploaded binary"
edges:
  mentions: [entity-knowledge-pack]
  relatesTo: [fact-svg-live-text]
rationale: >
  Provenance (does a recipe exist / is it reproducible) and content-accessibility
  (is the artifact itself directly parseable, or does it need interpretive
  analysis) are independent properties of a media artifact, not one axis.
alternatives_considered: >
  Single generated-vs-uploaded binary (rejected: conflated two independent
  properties, missed the case of generated-and-parseable artifacts like SVGs
  with live text).
---

Media/Artifact nodes are classified on two independent axes: provenance (generated — has a recipe / reproducible — vs. uploaded — no recipe, opaque origin) and content-accessibility (parseable — text/structured data directly extractable — vs. opaque — requires an interpretive analysis pass). This yields four Artifact subclasses: GeneratedParseable, GeneratedOpaque, UploadedParseable, UploadedOpaque.
