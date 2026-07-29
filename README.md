# Knowledge-pack test instance

This is a hand-built (not automated) instantiation of the knowledge-pack ontology we designed, applied to the conversation in which we designed it. Purpose: test whether the node/edge schema holds up against real content before building any extraction automation.

## Structure

```
entities/     Entity nodes — persistent things referenced across the conversation
decisions/    Decision nodes — choices made, with rationale + alternatives considered
facts/        Fact nodes — claims with a validity/as-of date
questions/    OpenQuestion nodes — unresolved as of this test
activities/   Activity records — the (manual) extraction pass that produced these nodes
graph.md      Full edge list + mermaid diagram of the resulting graph
```

Every node file uses YAML frontmatter for structured fields (`id`, `type`, `status`, `provenance`, `edges`) and a markdown body containing the actual self-contained assertion — per [decision-self-contained-notes](decisions/decision-self-contained-notes.md), the body should be usable on its own, without reading this conversation.

## Known limitations of this test (read before judging the model by it)

1. **No exact turn-level provenance.** This was extracted by hand, not by a pipeline parsing a session JSONL — `wasDerivedFrom` fields are qualitative topic descriptions, not turn indices. A real ingestion Activity would have exact references.
2. **No Artifact nodes.** This conversation produced no generated or uploaded media, so the GeneratedParseable / GeneratedOpaque / UploadedParseable / UploadedOpaque taxonomy is untested here.
3. **`relatesTo` edges here are not really testing the associative tier.** Every `relatesTo` link below connects two things discussed explicitly, in sequence, within one session — I could see the connection directly in the text. That's arguably a **structural** judgment (deterministic, explicit), not what the associative tier was designed for (a semantic-similarity guess between things that *aren't* explicitly connected, often across sessions). This test has no cross-session ambiguity to resolve, so it cannot exercise the semantic layer, confidence scoring, or the automatic + human-on-the-loop confirmation mechanism at all. That's the biggest gap this test leaves open — a real test of the associative tier needs at least two related sessions with entities/facts mentioned inconsistently across them.
4. **No `sameAs` or inferred `supersedes` edges exist**, for the same reason as #3 — nothing in a single session needed reconciling against a prior version of itself.

See [graph.md](graph.md) for the full node/edge list and a rendered diagram.
