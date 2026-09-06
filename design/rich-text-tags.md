# Design: Rich Text Tags

|                                       |                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft — for review. Scoped out of `design/ui-system.md` backlog 5.7 rather than implemented directly, per real open questions surfaced while scoping it (see below). |
| **Target module**                     | `/src/text` (shaping pipeline, `GlyphQuad`/`TextMeshEcsComponent`) — new; `/src/ui` unaffected, this is a text concern, not a UI one (matching DL-04's precedent)     |
| **Engine version at time of writing** | `0.24.2`                                                                                                                                                             |
| **Model**                             | Inline markup tags (`<b>`, `<color=...>`) parsed out of a `TextEcsComponent.text` string into per-run style data, consumed by `shapeText`/`createTextShapingEcsSystem` |

---

## 1. Summary

`design/ui-system.md`'s Phase 5 backlog (5.7) calls for rich text tags -
`<b>bold</b>` and `<color=#ff0000>red</color>` - as inline markup inside
`TextEcsComponent.text`, sized **L**. Scoping it for implementation (rather
than guessing at an approach) surfaced real architectural questions the
existing text pipeline doesn't have answers to yet, spanning three areas
that are each individually non-trivial:

1. **Per-glyph vs. per-entity styling.** Every color/effect field
   (`TextEcsComponent.color`, `outlineColor`, `outlineWidth`, `shadowColor`,
   `shadowOffset`, `shadowSoftness`) is a single value applied uniformly to
   every glyph in the entity. `GlyphQuad` carries no style data of its own
   at all - `pushTextFillRenderCommands` (`src/text/rendering/glyph-quad.ts`)
   reads `textComponent.color` once per entity and applies it to every
   glyph's synthetic sprite. A `<color>` span needs a color that varies
   *within* one entity's text - a genuinely new capability, not a bug fix
   or an extension of an existing per-entity field.
2. **What `<b>` means without a bold-weight atlas.** `forge-generate-font-atlas`
   bakes exactly one `.ttf`/`.otf` file - one weight, one style - into one
   `FontAtlas`. There is no bold variant, no italic variant, and no concept
   of a font *family* with multiple weights anywhere in `/src/text`. `<b>`
   has no meaning to render with today; it needs one of several genuinely
   different mechanisms (§7), each with real cost and limitations, decided
   before any shaping code is written.
3. **Interaction with word-wrap and kerning.** `shapeText`
   (`src/text/utilities/shape-text.ts`, 560+ lines) tokenizes into words,
   measures each word's width for wrapping, and walks kerning pairs
   character-by-character within a word. Tags must be invisible to both -
   `A<color=#f00>V</color>` must kern "AV" exactly as `AV` would, and must
   not count the tag markup's own characters toward wrap width - which
   means stripping tags before measuring/kerning while retaining a
   character-index-to-style mapping for the glyphs that measurement and
   kerning walk eventually produces. Retrofitting that into an existing,
   well-tested shaping pipeline (rather than designing it in from the
   start) is exactly the kind of change worth a design pass before code.

This document exists to answer these questions before backlog 5.7 is
implemented, not to implement it - no code changes ship with this
document, matching how `design/msdf-text-rendering.md` and
`design/form-layout-columns.md` were written before their own
implementation phases.

---

## 2. Scope

### In scope

- Inline tag syntax for the two tags backlog 5.7 names: `<b>...</b>` and
  `<color=...>...</color>`.
- How tags interact with existing `TextEcsComponent` features: word-wrap
  (`maxWidth`), kerning, `horizontalAlign`/`verticalAlign`, and the
  existing outline/shadow effects.
- The data-model change `GlyphQuad`/`TextMeshEcsComponent` needs to carry
  per-run style through to rendering.
- Malformed/unclosed tag handling.

### Out of scope

- A general-purpose rich-text/markup language (headings, lists, inline
  images, hyperlinks). Backlog 5.7 names exactly two tags; this document
  scopes only those two, though the tag-parsing approach chosen should not
  make adding a third tag later disproportionately hard.
- Bidirectional text and complex script shaping - already an explicit
  non-goal of the whole text/UI effort (`design/ui-system.md` §2).
- Any change to `forge-generate-font-atlas`'s single-file-in, single-atlas-out
  model, unless the bold decision below (§7) requires it.

---

## 3. Why this needs a design pass rather than a guess

The three points in §1 are not independent - the answer to "what does
`<b>` mean" determines whether bold needs new atlas-level data (a second
`FontAtlas`) or can be expressed as a per-glyph shader parameter on the
*existing* atlas, which in turn determines how much of `GlyphQuad`'s shape
needs to change, and whether that change looks anything like `<color>`'s
(a plain per-glyph field) or needs its own, differently-shaped mechanism
entirely. Picking a shape for one without deciding the other risks a
second migration once the real answer to `<b>` is settled. Guessing here -
the way an implementer would
have to, absent this document - risks: shipping a `GlyphQuad` shape that
can express color-per-glyph but not weight-per-glyph (or vice versa),
tag-stripping logic bolted onto `shapeText` in a way that silently breaks
an existing wrap/kerning test case, and a syntax choice (see §6) that
doesn't extend cleanly if a third tag is ever wanted.

---

## 4. Phases

Two independently shippable phases fall out of resolving §7 in favor of
faux-bold (the recommended direction) - if a real bold atlas is chosen
instead, Phase 2 changes shape but Phase 1 is unaffected either way, since
`<color>` doesn't depend on the `<b>` decision at all.

### Phase 1 — Tag parsing + `<color>`

| # | Task | Size |
| - | ---- | ---- |
| 1.1 | Tag parser: strips `<color=...>`/`</color>` (and, structurally, any future tag) from a `TextEcsComponent.text` string into a plain string plus a list of `{ startIndex, endIndex, color }` runs over that plain string's character indices | M |
| 1.2 | `shapeText` accepts the parsed plain string (unchanged measurement/kerning/wrap logic - it already only sees the stripped string) plus the run list, and stamps each emitted `GlyphQuad` with the color of the run its source character index falls in | M |
| 1.3 | `GlyphQuad.color?: Color` (optional - `undefined` for a glyph with no active `<color>` run, falling back to `TextEcsComponent.color` exactly as today) | S |
| 1.4 | `pushTextFillRenderCommands` reads `glyph.color ?? textComponent.color` per glyph instead of `textComponent.color` for every glyph | S |
| 1.5 | Malformed-tag handling: an unclosed `<color=...>` runs to the end of the string; an unrecognized tag name throws (see §8) | S |
| 1.6 | Unit tests: nested-vs-sequential runs, a tag spanning a word-wrap break, kerning across a tag boundary, malformed tags | M |
| 1.7 | Docs + demo update (`documentation-site/src/pages/demos/text`) | S |

**Phase 1 exit criterion:** `<color=#ff0000>red</color> and <color=#00ff00>green</color> text` renders with each span in its own color, word-wraps identically to the same string with tags removed, and kerns identically across tag boundaries to the equivalent untagged string.

### Phase 2 — `<b>`

Blocked on resolving the bold mechanism (§7). Sized **L** on its own if a
second atlas per weight is chosen (needs `forge-generate-font-atlas`
changes, a `FontAtlas` weight-selection API, and asset-pipeline docs); **M**
if faux-bold is chosen (a per-glyph shader parameter, closer in shape to
the existing outline effect than to a new asset type).

---

## 5. Decision log

### DL-1 — Runs are computed as index ranges over the stripped string, not stored inline in a parsed tree

**Options.** (a) Parse into a tree of styled nodes (an AST), walked during
shaping. (b) Strip tags into a plain string plus a flat list of
`{ startIndex, endIndex, style }` runs against that string's indices.

**Decision: (b).**

**Rationale.** `shapeText` already operates on a plain string end to end
- tokenizing into words, measuring, kerning, wrapping. A flat run list
keyed by character index slots into that pipeline with the smallest
possible change: every place `shapeText` already tracks "which source
character is this glyph" (it must, to look up whitespace/kerning) can look
up the active run(s) at that index the same way. A tree walk would instead
require re-deriving word/line boundaries against tree node boundaries,
duplicating logic `shapeText` already has for the plain-string case.
Nested tags (`<b><color=...>...</color></b>`) are simply two run lists
that both cover the same index range - no tree structure needed to express
nesting when styles are independent axes (weight, color) rather than a
strict containment hierarchy.

**Consequences.** Adding a future tag type is "add another run list", not
a tree-schema change. The parser (1.1) still has to validate proper
nesting/closing at parse time even though the *output* is flat.

---

## 6. Tag syntax

**Recommendation: an HTML-like syntax, `<name>` / `<name=value>` / `</name>`,
matching the backlog's own examples exactly.** This is also what Unity's
TextMeshPro and most game-engine rich text implementations converge on,
not because of that precedent but because it reuses a syntax most authors
already have muscle memory for, and is unambiguous to tokenize (a `<`
followed immediately by a letter or `/` starts a tag; a lone `<` followed
by anything else - a space, a digit, end of string - is literal text, so
existing strings containing a bare `<` for other reasons stay unaffected
unless they happen to spell out a real tag name).

Literal `<`/`>` in authored text (wanting to display the character `<`
itself) needs an escape - recommend `&lt;`/`&gt;`, again matching the
existing web-adjacent convention rather than inventing a new one, at the
cost of also needing to escape `&` itself (`&amp;`) once entities exist at
all. **Open question**, see §8 - whether this corner is worth the parser
complexity for a v1 that only ships two tags is genuinely debatable.

---

## 7. What `<b>` means without a bold-weight atlas

**Options.**

(a) **A second `FontAtlas` per weight**, generated from a separate bold
`.ttf`/`.otf` file, with `TextEcsComponent`/`createLabel` accepting a
`boldFontAtlas` alongside `fontAtlas`, switched to for glyphs inside a
`<b>` run. Matches how real bold type actually looks (different glyph
shapes, not just thicker outlines) - genuine typographic bold, at the cost
of every consumer needing to source and ship a matching bold font file,
and `forge-generate-font-atlas`/`FontAtlasCache` both needing multi-atlas
awareness.

(b) **Faux-bold via the existing outline mechanism**, extended to be
settable per-glyph: a `<b>` run's glyphs render with fill *plus* a small
same-color outline (or a slightly negative signed-distance threshold
shift), thickening strokes without a second atlas. This is what browsers
do when a `font-weight: bold` is requested but only a regular weight is
installed ("synthetic bold"), and is exactly the well-known approximation,
with the well-known limitation: it doesn't reproduce a real bold cut's
actual glyph shapes (different curve tension, different counter sizes),
and reads noticeably worse at small sizes or with already-thick strokes.
Reuses `msdf-effects.frag`'s existing screen-pixel-range outline math
directly - the smallest implementation, and the one that needs no new
asset type or pipeline change.

(c) **No `<b>` in v1** - ship `<color>` only, defer bold until a concrete
consumer needs real typographic bold badly enough to justify sourcing a
second font file.

**No decision recorded here** - this is the open question this whole
document exists to raise, not resolve unilaterally, since it trades off
asset-pipeline complexity (a) against visual fidelity (a vs. b) in a way
that depends on how this module's consumers actually use bold text (a
"press A to continue" prompt's occasional bold word vs. a text-heavy
document viewer that needs correct typography), which isn't something to
guess at. **Recommendation, not a decision: (b) for v1** - it ships without
any asset-pipeline change, is a small, contained addition next to the
outline effect that already exists, and can be superseded by (a) later
for any consumer that needs real bold cuts without (b) having been wasted
work, since the `<b>` tag/run-list plumbing from Phase 1 doesn't change
either way - only how a `<b>` run is *rendered* changes.

---

## 8. Open questions

1. **Which of §7's three options for `<b>`?** The one genuinely
   load-bearing decision this document raises. Needs a decision before
   Phase 2 can be sized precisely or started.
2. **Escape sequences for literal `<`/`>`/`&`** - full entity-style
   escaping (§6), or a simpler rule (e.g. "a `<` not immediately followed
   by a recognized tag name or `/` is literal, no escaping needed at all")?
   The simpler rule covers the common case (stray `<`/`>` in game text,
   e.g. "HP < 50%") with zero authoring overhead, at the cost of making a
   literal `<b>`-shaped substring unrepresentable without an escape hatch
   of some kind - probably an acceptable trade for a v1 shipping exactly
   two tag names.
3. **Malformed tags: throw, or degrade gracefully?** §4's Phase 1 plan
   assumes an unrecognized tag name throws (loud failure during
   development, matching this codebase's general error-handling
   convention of throwing descriptive errors rather than silently
   degrading) and an unclosed tag runs to the end of the string (matching
   how a browser's own malformed-HTML recovery behaves, and simple to
   implement). Worth confirming both defaults before Phase 1 ships rather
   than after.
4. **Does a `<color>` run need its own alpha, or only RGB?** `Color` in
   this codebase always carries all four channels; the recommendation is
   a `<color>` run fully replaces the fill color (RGB and alpha both),
   matching how `TextEcsComponent.color` itself works today, but this is
   worth confirming rather than assuming - a consumer might expect
   `<color>` to change hue without changing opacity.
