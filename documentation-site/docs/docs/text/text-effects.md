---
sidebar_position: 4
---

# Text Effects

MSDF's distance-field encoding makes an outline or soft shadow/glow nearly
free: the same signed distance already used to anti-alias a glyph's edge can
be re-thresholded a few pixels further out, with no extra draw call and no
extra texture. [`TextEcsComponent`](/Forge/docs/api/interfaces/TextEcsComponent)
exposes this as five fields, all off by default:

```ts
addTextComponent(world, label, {
  text: 'Game Over',
  fontAtlas,
  size: 48,
  outlineColor: Color.black,
  outlineWidth: 2,
  shadowColor: new Color(0, 0, 0, 0.6),
  shadowOffset: { x: 1.5, y: -1.5 },
  shadowSoftness: 2,
});
```

- `outlineColor` / `outlineWidth` draw a ring around each glyph's own edge.
  `outlineWidth: 0` (the default) draws no outline regardless of
  `outlineColor`.
- `shadowColor` / `shadowOffset` / `shadowSoftness` re-sample the distance
  field at an offset to draw a soft shadow or glow beneath the glyph and its
  outline. `shadowColor`'s alpha of `0` (the default) draws nothing
  regardless of the other two.

All three size-like fields (`outlineWidth`, `shadowOffset`, `shadowSoftness`)
are in **screen-pixel-range units** - a fixed number of *screen* pixels,
independent of the entity's `size`, any `ScaleEcsComponent`, or camera zoom,
exactly like the anti-aliasing band MSDF itself uses. A 2px outline stays a
crisp 2 screen pixels whether the text renders at 12px or 400px, or whether
the camera is zoomed in or out.

## Choosing a safe range

Two independent limits bound how far an effect can actually reach, and both
degrade gracefully rather than corrupting a glyph or overlapping a neighbor:

1. **The atlas's own encoded budget.** A font atlas's distance field only
   carries graded (non-saturated) data up to roughly half of
   [`FontAtlasData.distanceRange`](/Forge/docs/api/interfaces/FontAtlasData)
   screen pixels from a glyph's true edge - `--distance-range` when you
   generated it (see [Generating a Font Atlas](./generating-a-font-atlas.md)).
   Past that, an effect still renders, clamped to the widest value the atlas
   can faithfully represent, rather than boxing out or producing quantized
   banding.
2. **Neighboring glyphs.** Tightly kerned pairs (`il`, `ff`, and similar)
   can sit close enough that an unclamped outline/shadow on one glyph would
   visually reach into its neighbor's own ink. Each glyph's effect is
   automatically clamped to half the gap to its tightest same-line neighbor,
   so two adjacent glyphs' effects can never together reach far enough to
   overlap - this is computed per glyph at shape time, from the same
   kerning-aware layout that already positions each glyph, and needs no
   configuration.

Both clamps mean a requested `outlineWidth`/`shadowSoftness` beyond what's
actually safe degrades to the widest safe value instead of corrupting
glyphs or bleeding into a neighbor - but a value picked *within* that budget
still looks best, since nothing is fighting a clamp. For the engine's
demo atlas (Liberation Sans at `--distance-range 16`), **4 screen-pixel-range
units** is a comfortable, tested-safe default for both `outlineWidth` and
`shadowSoftness` at typical UI/HUD sizes. If you generate your own atlas
with a smaller `--distance-range` (the default is `4`, which only grades
about 2 screen pixels of safe budget), stay proportionally smaller, or
regenerate with a larger `--distance-range` if you need a bigger range -
see [Generating a Font Atlas](./generating-a-font-atlas.md).

## A note on extreme values and unusual glyphs

Multi-channel signed distance fields are a lossy, low-resolution encoding of
each glyph's true outline. Two failure modes are inherent to the technique
itself, not bugs in this engine, and no amount of clamping fixes them:

- **Counter-closing.** Glyphs with enclosed counters (`o`, `b`, `d`, `a`,
  `e`, `B`, ...) can become misread as a different letter (`o` reading as
  `c`, `B` reading as `E`) once an effect approaches the counter's own
  stroke gap.
- **Corner artifacts.** Glyphs with sharp, acute interior corners (`W`, `M`,
  `N`, `V`, `K`, `X`, `Y`, `Z`, `A`) can show seam artifacts baked into the
  atlas texture itself near those corners at wide effect values, regardless
  of `distanceRange` or texture resolution.

Both become more likely the further `outlineWidth`/`shadowSoftness` is
pushed, and are font- and glyph-dependent rather than universal. Staying
within the safe range above keeps typical UI text well clear of either
issue; if you push effects further for a stylized look, preview the actual
glyphs your game uses at your chosen values rather than assuming a range
that looked fine for one font/string generalizes to another.
