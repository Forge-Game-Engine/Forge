# Epic 3 — SDF Text Rendering

Text is a prerequisite for buttons, inputs, dropdowns, and most widgets. This
epic delivers **WebGL2 SDF (signed distance field) text** rendered through the
same instanced pipeline, a **font-asset generation tool** for SDF atlases +
metrics, and text options (alignment, bold, italic, color/tint, size, wrapping).

## Status

- **Phase:** 2 — Text & Interaction Substrate
- **Depends on:** Epic 1 (UI transform/layout), Epic 2 (instanced UI rendering,
  default-vs-custom material story, clipping), plus
  [asset-loading](../../src/asset-loading/), [Material](../../src/rendering/materials/material.ts),
  [Renderable](../../src/rendering/renderable.ts).
- **Independent of:** Epic 4 (can be built concurrently).
- **Blocks:** Epics 5 (button labels), 7 (input boxes, dropdown items).

## Architectural notes

- Each glyph is a quad. A run of text is a set of glyph quads sharing **one
  atlas texture + one SDF material** → they batch as a single `Renderable`,
  exactly like sprites. Per-glyph data (atlas UVs, position, size, color) travels
  as **per-instance attributes** (see Epic 2's instance-packing approach).
- SDF gives resolution-independent text: one atlas renders crisp at many sizes
  via an `smoothstep(0.5 - w, 0.5 + w, distance)` alpha in the fragment shader.

---

## Features

### F3.1 — Font asset format (atlas + metrics) & loader

**Goal:** a typed, loadable font asset.

**Implementation detail:**

- Define `FontAsset` (in `src/ui/text/types/`): `{ texture: WebGLTexture;
atlasSize: Vector2; lineHeight; ascent; descent; base; distanceRange;
glyphs: Map<number, GlyphMetrics>; kerning?: Map<number, Map<number, number>> }`.
- `GlyphMetrics`: `{ codepoint; uvRect (in atlas); size (px in atlas);
bearing (xoffset/yoffset); advance }`. This matches the well-known **BMFont /
  msdf-bmfont JSON** layout, so the generator (F3.2) and any third-party tool can
  interoperate.
- Add a loader `loadFontAsset(renderContext, jsonUrl, atlasUrl)` that fetches the
  JSON + atlas image and uploads the texture, integrating with the existing
  [asset-loading](../../src/asset-loading/) module (reuse its image/texture
  loading rather than hand-rolling).
- Cache by URL so repeated `loadFontAsset` calls share one `WebGLTexture`.

### F3.2 — Font-asset generation tool

**Goal:** produce SDF atlases + metrics from `.ttf`/`.otf`, "if a suitable asset
is not already available" (per roadmap) — so first **evaluate** depending on the
mature `msdf-bmfont-xml` / `msdfgen` ecosystem before building bespoke.

**Implementation detail:**

- Add a Node script under [scripts/](../../scripts/), e.g.
  `scripts/generate-font-atlas.mjs`, with an npm alias like
  `npm run generate:font`. Inputs: font file, charset, atlas size, SDF type
  (`sdf` vs `msdf`), `distanceRange`. Outputs: `<name>.png` + `<name>.json` in
  the chosen output dir (and a copy into the demo assets).
- Prefer wrapping `msdf-bmfont-xml` (or `msdfgen`) and **normalizing its output**
  to the `FontAsset` JSON shape from F3.1, rather than reimplementing SDF
  generation. Document the decision and the exact CLI in the script header.
- Ship at least one **pre-generated default font** in the demo/docs assets so
  users can render text without running the tool.
- This is a **build-time Node tool**, explicitly outside the browser-only engine
  runtime (AGENTS.md forbids Node APIs in `src/`); keep it in `scripts/`.

### F3.3 — Text shaping & metrics (layout of a string into glyph quads)

**Goal:** turn `(string, FontAsset, options)` into positioned glyph quads — the
pure, highly-testable core.

**Implementation detail:**

- Add `shapeText(text, font, options): ShapedText` in
  `src/ui/text/shape-text.ts`. Output: array of `{ codepoint; x; y; width;
height; uvRect }` in element-local pixels, plus total `bounds` and per-line
  info.
- Handle: advance widths, optional kerning pairs, line height, explicit `\n`,
  and **word wrapping** within a max width (`wrap: 'none' | 'word' | 'char'`),
  and `overflow: 'visible' | 'clip' | 'ellipsis'` (clip/ellipsis interact with
  Epic 2 clipping for `clip`).
- **Alignment:** horizontal `left | center | right` (offset each line by
  `maxWidth - lineWidth` scaled by 0/0.5/1) and vertical `top | middle | bottom`.
- **Bold / italic:**
  - Best fidelity: separate atlases per style (regular/bold/italic/bold-italic)
    selected by the options — recommended, documented as the primary path.
  - Faux fallback: synthesize italic via a shear in the vertex shader and bold
    via reducing the SDF threshold; offer as a convenience flag and note the
    quality caveat.
- Keep shaping **independent of GL** so it unit-tests without a context.

### F3.4 — SDF text material & shader

**Goal:** crisp resolution-independent glyph rendering wired into Epic 2's
pipeline.

**Implementation detail:**

- Add `src/ui/shaders/text/text.vert.glsl` + `text.frag.glsl`. Vertex shader
  positions each glyph quad via the element `worldMatrix` (Epic 1) + UI
  projection (Epic 2) + per-instance glyph offset/size. Fragment shader samples
  the SDF/MSDF atlas and computes coverage:
  - single-channel SDF: `alpha = smoothstep(0.5 - w, 0.5 + w, dist)` with
    `w = fwidth(dist)` (or derived from `distanceRange` and screen size).
  - MSDF: use `median(r,g,b)` as the distance.
  - multiply by per-instance `tint` and `opacity`; honor the `clipRect` discard
    from Epic 2 so clipped/scrolled text behaves.
- Reuse the **custom-material escape hatch** contract from Epic 2 (F2.6) so a
  user can supply an alternative text shader (e.g. outline/glow) while keeping
  batching.

### F3.5 — Text component, system & factory

**Goal:** the ECS surface users actually touch.

**Implementation detail:**

- Add `UiTextEcsComponent` (`textId`): `{ text: string; font: FontAsset;
fontSize: number; color: Color; align; verticalAlign; wrap; overflow;
bold; italic; renderable: Renderable; enabled: boolean; _shaped?: ShapedText;
_dirty: boolean }`. Mutating `text`/options sets `_dirty`.
- Add `createUiTextEcsSystem(renderContext)`:
  - In `beforeQuery`/`run`, re-`shapeText` only for `_dirty` entities (re-shaping
    every frame is wasteful — cache `ShapedText`).
  - Push glyph instances into the UI batch for the text's `Renderable`. Because
    every glyph of a string shares the atlas+material, they batch; different
    fonts/atlases form separate batches.
  - Respect the element's `resolvedRect` for alignment/wrapping bounds and
    `clipRect` for overflow.
- Add `createUiText(world, { ... })` factory that assembles a text entity
  (UI transform + text component + renderable), returning the entity id — sets
  the convention Epic 6 formalizes.

---

## Cross-cutting (definition of done)

- Unit tests for `shapeText`: advances, kerning, wrapping (word/char), alignment
  (h+v), ellipsis, multi-line bounds, bold/italic metric selection. The
  generator is covered by a smoke test that asserts output JSON conforms to
  `FontAsset`.
- Documentation guides: "Rendering text", "Generating a font atlas" (with the
  exact CLI), and "Text styling & wrapping"; JSDoc on all public APIs.
- Demo: a text showcase (sizes, alignments, bold/italic, wrapping, a long
  paragraph with ellipsis, colored runs).
- Exports updated in `src/ui/index.ts`, `src/index.ts`, `package.json`
  (`./ui` and, if separately importable, the text submodule).
