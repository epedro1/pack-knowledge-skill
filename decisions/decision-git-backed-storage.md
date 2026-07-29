---
id: decision-git-backed-storage
type: Decision
status: confirmed
provenance:
  wasGeneratedBy: activity-2026-07-29-manual-pass
  wasDerivedFrom: "early architecture discussion, before ontology framing was introduced"
edges:
  mentions: [entity-knowledge-pack]
rationale: >
  Revision tracking (who changed what, since when) is a hard requirement.
  Git provides this natively via log/blame with no custom versioning system
  to build or maintain.
alternatives_considered: >
  Custom versioning/changelog system; syncing to a hosted wiki (Notion/Confluence),
  deferred as a possible later export layer rather than the primary store.
---

The knowledge pack is stored as plain files (markdown + frontmatter) in a git repository rather than a database or hosted wiki, so revision history, authorship, and diffs come for free from git rather than requiring bespoke tracking.
