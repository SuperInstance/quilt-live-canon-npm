# @superinstance/live-canon

**Live Canon — read the AI-Writings canon as a navigable cell fabric.**

[![npm](https://img.shields.io/npm/v/@superinstance/live-canon)](https://www.npmjs.com/package/@superinstance/live-canon)
[![State hash](https://img.shields.io/badge/state_hash-0x445185a3a99fd2e7-brightgreen)](https://live-canon.superinstance.dev)
[![Polyformalism](https://img.shields.io/badge/polyformal-6_substrates-blueviolet)](https://github.com/SuperInstance/quilt-cowboy)

## What it does

Live Canon reads the AI-Writings canon (71 committed papers, F98-F169)
as a navigable cell fabric. Each paper = 1 cell. Each citation = 1 edge.
The canon exposes 7 operations:

1. **NAVIGATE** — BFS through citations
2. **CONFLUENCE** — join 2+ papers, suggest a synthesis
3. **LINEAGE** — trace a concept (F-number) through time
4. **GHOST** — k nearest neighbors by dial-vector cosine similarity
5. **TICK** — re-balance the canon
6. **CLAIM** — the most-authoritative paper for a topic (with excerpt)
7. **DRILL** — a 3-paper training curriculum (DOCTRINE → IMPLEMENTATION → VERIFICATION)

## Install

```bash
npm install @superinstance/live-canon
```

## Usage

```js
const { LiveCanon } = require('@superinstance/live-canon');

const canon = new LiveCanon();

// State hash (byte-exact with Python/C/Rust/Verilog/VHDL/JS-Worker)
console.log(canon.stateHash());        // 0x445185a3a99fd2e7
console.log(canon.stateHashString);    // alias, same value
console.log(canon.paperCount);         // 71

// 1. NAVIGATE — BFS from a paper
const path = canon.navigate(425, 2);
console.log(`Found ${path.length} cells in the citation graph`);

// 2. CONFLUENCE — join 2+ papers
const synth = canon.confluence([425, 432, 439]);
console.log(`Suggested: ${synth.suggested_title}`);

// 3. LINEAGE — trace F115 through time
const lineage = canon.lineage(115);
console.log(`${lineage.length} papers cite F115`);

// 4. GHOST — find a paper that should exist
const ghost = canon.ghost(425, 5);
console.log(`Top neighbor: ${ghost.neighbors[0].id} (score=${ghost.neighbors[0].score})`);

// 5. TICK — re-balance the canon
console.log(canon.tick());

// 6. CLAIM — the most-authoritative paper for a topic
const claim = canon.claim('trust ladder');
console.log(`CLAIM: F${claim.winner.f_number} — ${claim.winner.title}`);

// 7. DRILL — a 3-paper curriculum
const drill = canon.drill('Mudra vessel bridge');
console.log(`DOCTRINE: F${drill.curriculum.doctrine.f_number}`);
```

## Bundled data

The package bundles the full 71-paper committed corpus (F98-F169,
snapshot 2026-09-20) — canon metadata + body excerpts — so it works
offline. The bundled canon is guarded by `test/canon-hash.test.js`:
`stateHash(bundled canon) === 0x445185a3a99fd2e7`, the same target the
Cloudflare Worker converged to at quilt-live-canon `canon-71-full-corpus`
(371e07d).

For the live canon (always current), fetch from the worker:

```js
const canon = await LiveCanon.fromUrl('https://live-canon.superinstance.dev/api/canon');
```

## Polyformalism

The Live Canon is byte-exact across 6 substrates (paper-441's 9-surface
table counts 3 registries + 1 worker + 5 substrate ports):

| Surface | Where | State hash |
|---|---|---|
| npm (this package) | `@superinstance/live-canon` | `0x445185a3a99fd2e7` |
| PyPI | `quilt-live-canon` | `0x445185a3a99fd2e7` |
| Cloudflare Worker | live-canon.superinstance.dev | `0x445185a3a99fd2e7` |
| C99 | `live_canon.c` | (substrate ports re-aim in their own lanes) |
| Rust | `live-canon` crate | (same) |
| Verilog-2005 | `live_canon.v` | (same) |
| VHDL-2008 | `live_canon.vhdl` | (same) |

**Canonical serialization** (drift closure 2026-09-20): each cell is
`0x01 ‖ id u64LE ‖ 16 dials int16LE ‖ neighbors u64LE…`, cells sorted by
id, hashed with FNV-1a 64 over the concatenated bytes. This replaces the
retired dial-only scheme whose 71-paper hash was `0x7f563ed9982496a1`
and whose stranded v0.2.0 target was `0xbf27a3631cdee337`.

The 16-dial encoding is shared: `num_q = min(number,500)*131`,
`f_q = f*218`, `phase_q = phase*218`, `year_q = (year-1970)*546`,
`title_lo/hi = FNV-1a(title)`.

## Live API

The Cloudflare Worker exposes the same operations as a REST API:

```
GET https://live-canon.superinstance.dev/api/canon
GET https://live-canon.superinstance.dev/api/canon/navigate?paper=425&depth=2
GET https://live-canon.superinstance.dev/api/canon/confluence?papers=425,432,439
GET https://live-canon.superinstance.dev/api/canon/lineage?f=115
GET https://live-canon.superinstance.dev/api/canon/ghost?paper=425&k=5
GET https://live-canon.superinstance.dev/api/canon/tick
GET https://live-canon.superinstance.dev/api/canon/hash
```

## Related

- **F129 (paper-439)**: The Live Canon: Papers as Cells, Reading as Navigation
- **F130 (paper-440)**: The Polyformal Live Canon: One Cell, Five Substrates
- **F131 (paper-441)**: The 3-Package Polyformalism: One Cell, Three Registries
- **GitHub**: github.com/SuperInstance/quilt-live-canon-npm
- **Live URL**: live-canon.superinstance.dev

## License

MIT

## Phase 251 of the polyformalism canon.

The cell is the unit. The hash is the address. The chart grows because
the cowboy rides.
