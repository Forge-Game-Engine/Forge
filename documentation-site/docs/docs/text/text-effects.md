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

## Two draw passes: outline/shadow, then fill

Every glyph's outline and shadow draw in their own pass, always completing
*before* any glyph's fill draws on top of it (see `createTextRenderable`
internally, if you're curious). This is what lets an outline safely reach
past a same-word neighboring glyph - even merge with that neighbor's own
outline into one continuous stroke, the same way a thick Photoshop "stroke"
layer effect bulges out past each letter and bridges the gaps between
them - without ever painting over any glyph's own fill: fill always ends up
on top, regardless of how far an outline reaches or in what order glyphs
happen to draw. Outline layers overlapping each other is harmless (they're
typically the same color, and blending is order-independent there); only
painting over a glyph's fill would be a defect, and the two-pass draw order
rules that out entirely.

The soft shadow/glow doesn't get the same freedom, because it works
differently: it re-samples the distance field at an *offset* UV rather than
just re-thresholding the same sample outline uses, so reaching far enough
risks sampling past this glyph's own atlas tile into a same-word neighbor's
unrelated texels (or the packer's padding gap) - a texture-sampling
correctness problem the two-pass draw order doesn't touch. `shadowOffset`
and `shadowSoftness` are still clamped to the gap between a glyph's own ink
and its tightest same-word neighbor's ink, computed automatically per glyph
at shape time from the same kerning-aware layout that already positions
each glyph.

## Choosing a safe range

One limit still bounds how far any effect can actually reach, and degrades
gracefully rather than corrupting a glyph:

**The atlas's own encoded budget.** A font atlas's distance field only
carries graded (non-saturated) data up to roughly half of
[`FontAtlasData.distanceRange`](/Forge/docs/api/interfaces/FontAtlasData)
screen pixels from a glyph's true edge - `--distance-range` when you
generated it (see [Generating a Font Atlas](./generating-a-font-atlas.md)).
Past that, an effect still renders, clamped to the widest value the atlas
can faithfully represent, rather than boxing out or producing quantized
banding. This is the *only* limit on `outlineWidth` - a requested value
beyond it degrades to the widest safe value instead of corrupting glyphs,
but a value picked within it still looks best, since nothing is fighting a
clamp. It bounds `shadowOffset`/`shadowSoftness` too, alongside the
same-word neighbor clamp described above - whichever of the two is
tighter wins.

Unlike the neighbor clamp described above, the atlas budget doesn't shrink
just because two letters sit close together - it's a fixed number of
screen pixels for a given atlas, regardless of layout. That's what makes a
big, bold, merged outline (bridging the gaps between letters, like the
Photoshop-stroke look) achievable: pick an `outlineWidth` within the
atlas's budget and it renders at full strength on every glyph, letters
included. Concretely, on the engine's own demo atlas (Liberation Sans at
`--distance-range 16`), that budget is roughly **5-8 screen pixels** at an
80px heading, scaling with `--distance-range` - regenerate with a larger
value (the default is `4`, which grades even less budget) if you need more
headroom for a wider merged stroke; see
[Generating a Font Atlas](./generating-a-font-atlas.md). See the text demo's
"outline + soft shadow / glow together, at a larger size" example for what
a properly bold effect looks like at a size that has room for it.

The same-word neighbor clamp that still applies to `shadowOffset`/
`shadowSoftness` scales with how large the text itself renders on screen:
it's roughly a fixed *percentage* of the font's on-screen size (how tight
that percentage is depends on the specific letter pairs in your string and
the font's own kerning - a word with only loosely-spaced letters allows
more than one with a tight pair like `rg` or `il`). For an ordinary word's
tightest letter pair, that's typically only up to roughly **5-12% of the
font's rendered size** - about 1 screen pixel at a 22px caption, but 5-8
screen pixels at an 80px heading. A large, clearly visible shadow/glow needs
correspondingly large on-screen text - it is not achievable on small
caption text no matter how high `shadowSoftness` is set.

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
