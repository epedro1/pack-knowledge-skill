# Graph index

12 Knowledge nodes, 1 Activity, produced by one manual extraction pass. Structural edges (`mentions`) shown as dotted lines; the `relatesTo` edges shown as solid lines are — per README limitation #3 — explicit/within-session connections, not genuine semantic-layer proposals.

```mermaid
graph TD
  subgraph Entities
    E1[entity-knowledge-pack]
    E2[entity-semantic-layer]
    E3[entity-provenance-model]
    E4[entity-context-graph]
  end
  subgraph Decisions
    D1[decision-git-backed-storage]
    D2[decision-edge-tiers]
    D3[decision-non-destructive-merge]
    D4[decision-automatic-hol-supervision]
    D5[decision-self-contained-notes]
    D6[decision-media-taxonomy]
  end
  subgraph Facts
    F1[fact-svg-live-text]
  end
  subgraph "Open Questions"
    Q1[question-differentiated-thresholds]
  end

  D1 -.mentions.-> E1
  D2 -.mentions.-> E4
  D2 -.mentions.-> E3
  D3 -.mentions.-> E4
  D4 -.mentions.-> E2
  D5 -.mentions.-> E3
  D5 -.mentions.-> E4
  D6 -.mentions.-> E1
  F1 -.mentions.-> E1
  Q1 -.mentions.-> E2

  D2 ==relatesTo==> D3
  D2 ==relatesTo==> D4
  D3 ==relatesTo==> D4
  D6 ==relatesTo==> F1
  Q1 ==relatesTo==> D4
  Q1 ==relatesTo==> D2
```

## Full edge list

| From | Edge | Tier | To |
|---|---|---|---|
| decision-git-backed-storage | mentions | structural | entity-knowledge-pack |
| decision-edge-tiers | mentions | structural | entity-context-graph |
| decision-edge-tiers | mentions | structural | entity-provenance-model |
| decision-edge-tiers | relatesTo | *(explicit, see limitation #3)* | decision-non-destructive-merge |
| decision-edge-tiers | relatesTo | *(explicit)* | decision-automatic-hol-supervision |
| decision-non-destructive-merge | mentions | structural | entity-context-graph |
| decision-non-destructive-merge | relatesTo | *(explicit)* | decision-automatic-hol-supervision |
| decision-automatic-hol-supervision | mentions | structural | entity-semantic-layer |
| decision-self-contained-notes | mentions | structural | entity-provenance-model |
| decision-self-contained-notes | mentions | structural | entity-context-graph |
| decision-media-taxonomy | mentions | structural | entity-knowledge-pack |
| decision-media-taxonomy | relatesTo | *(explicit)* | fact-svg-live-text |
| fact-svg-live-text | mentions | structural | entity-knowledge-pack |
| question-differentiated-thresholds | mentions | structural | entity-semantic-layer |
| question-differentiated-thresholds | relatesTo | *(explicit)* | decision-automatic-hol-supervision |
| question-differentiated-thresholds | relatesTo | *(explicit)* | decision-edge-tiers |

## Observations from building this test

- **`entity-context-graph` and `entity-provenance-model` are the real hubs** — most Decisions mention one or both. That matches the intent (Entities as clustering points) but with only 12 nodes it's not a strong signal yet; worth re-checking once a second session is ingested and these same entities get mentioned again from a different angle.
- **No node required re-reading the source conversation to be understood** — each body stands alone. That's the one thing this test could actually confirm directly (decision-self-contained-notes held up).
- **The associative tier is entirely unexercised.** Every `relatesTo` edge above was something I could see explicitly in one continuous conversation. The semantic layer's real job — noticing that an entity or decision from *session 3* is the same as one from *session 1*, worded differently, with no explicit link stated — needs a second, separate session to test at all. This single-session test cannot validate the automatic + human-on-the-loop confidence mechanism, confidence scoring, or `sameAs` behavior. That's the main gap before moving toward implementation.
