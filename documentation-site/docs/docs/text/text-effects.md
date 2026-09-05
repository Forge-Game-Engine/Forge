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
are in **screen-pixel-range units** - a fixed number of _screen_ pixels,
independent of the entity's `size`, any `ScaleEcsComponent`, or camera zoom,
exactly like the anti-aliasing band MSDF itself uses. A 2px outline stays a
crisp 2 screen pixels whether the text renders at 12px or 400px, or whether
the camera is zoomed in or out.

## Two draw passes: outline/shadow, then fill

Every glyph's outline and shadow draw in their own pass, always completing
_before_ any glyph's fill draws on top of it (see `createTextRenderable`
internally, if you're curious). This is what lets an outline - or a soft
shadow/glow - safely reach past a same-word neighboring glyph - even merge
with that neighbor's own effect into one continuous stroke or glow, the
same way a thick Photoshop "stroke" or "outer glow" layer effect bulges out
past each letter and bridges the gaps between them - without ever painting
over any glyph's own fill: fill always ends up on top, regardless of how
far an effect reaches or in what order glyphs happen to draw. Effect layers
overlapping each other is harmless (they're typically the same color, and
blending is order-independent there); only painting over a glyph's fill
would be a defect, and the two-pass draw order rules that out entirely.

The soft shadow/glow re-samples the distance field at an _offset_ UV rather
than just re-thresholding the same sample the outline uses, but that offset
is always resolved against _this glyph's own_ texture region
(`a_instanceTexOffset`/`a_instanceTexSize` scope every sample this shader
takes, base and shadow-offset alike) - never a neighboring glyph's, no
matter how close that neighbor sits on screen. Atlas layout and text layout
are unrelated: two glyphs placed close together on screen are not
necessarily packed anywhere near each other in the atlas texture. So the
shadow needs no clamp beyond the same atlas-encoding budget described
below, which already bounds the outline.

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
banding. This is the _only_ limit on either effect - a requested
`outlineWidth`, `shadowOffset`, or `shadowSoftness` beyond it degrades to
the widest safe value instead of corrupting glyphs, but a value picked
within it still looks best, since nothing is fighting a clamp.

The atlas budget doesn't shrink just because two letters sit close
together - it's a fixed number of screen pixels for a given atlas,
regardless of layout. That's what makes a big, bold, merged outline or glow
(bridging the gaps between letters, like the Photoshop-stroke/outer-glow
look) achievable: pick a value within the atlas's budget and it renders at
full strength on every glyph, letters included. Concretely, on the engine's
own demo atlas (Liberation Sans at `--distance-range 16`), that budget is
roughly **5-8 screen pixels** at an 80px heading, scaling with
`--distance-range` - regenerate with a larger value (the default is `4`,
which grades even less budget) if you need more headroom for a wider
merged stroke or glow; see
[Generating a Font Atlas](./generating-a-font-atlas.md). See the text demo's
"outline + soft shadow / glow together, at a larger size" example for what
a properly bold effect looks like at a size that has room for it.

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
