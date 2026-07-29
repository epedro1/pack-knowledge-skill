---
id: entity-provenance-model
type: Entity
status: confirmed
aliases: ["PROV-O layer", "Source/Activity/Agent model"]
provenance:
  wasGeneratedBy: activity-2026-07-29-manual-pass
  wasDerivedFrom: "discussion prompted by the request to ground the design in ontological/context-graph constructs"
---

The provenance layer of the ontology, adapted from the W3C PROV-O model: raw Sessions and Turns are Entities that are `used` by an ingestion Activity (itself recording agent/model version and timestamp), which `generates` Knowledge nodes. Keeps "what was used to produce this, by what process, when" answerable without requiring that question to be answered by reading the Knowledge nodes themselves.
