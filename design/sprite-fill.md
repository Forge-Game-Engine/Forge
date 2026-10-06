# Design: Filled Sprites (Linear and Radial Reveal)

|                                       |                                                                                                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                     |
| **Kind**                              | Feature                                                                                                                                                                                               |
| **Found in**                          | Galactic Journey demo: `src/speed/create-hud.ts` (32 pre-rendered "drain" images for one ring segment), `src/game-over/create-stats-panel.ts` (progress fill held at a minimum width, hidden at zero) |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                              |
| **Related**                           | [`ui-system.md`](./ui-system.md) backlog 3.7 (radial fill deferred), [`sprite-textures.md`](./sprite-textures.md) (Phase 2 lands after it), [`angle-conventions.md`](./angle-conventions.md)          |

## 0. Targeted modules

| Path                                                                      | Change   | Notes                                                                                              |
| ------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `src/rendering/components/sprite-component.ts`                            | Modified | Optional `fill`: linear or radial                                                                  |
| `src/rendering/systems/render-system.ts`                                  | Modified | Crops linear fills (and nine-slice regions) before building instances                              |
| `src/rendering/shaders/sprite/*`, an include, instance data               | Modified | Radial fills: per-instance angles, an anti-aliased coverage test shared by sprite fragment shaders |
| `src/ui/systems/ui-progress-bar-system.ts`, `create-progress-bar.ts`      | Modified | The fill keeps its full rect and sets `fill.amount`                                                |
| `src/ui/systems/ui-slider-system.ts`, `create-slider.ts`                  | Modified | The slider's fill does the same                                                                    |
| `documentation-site/docs/docs/rendering/`, `ui/progress-bar`, `ui/slider` | Modified | Filled sprites; fill methods                                                                       |

---

## 1. Summary

A sprite can only be drawn whole. Showing part of one, a bar filling up or
a ring draining, means resizing it or pre-rendering every step:

- **The speed HUD's ring** drains its top segment as full speed runs out.
  With no way to draw part of a ring, the demo renders 32 images of the
  segment at decreasing angles and swaps between them, so the drain moves
  in visible steps and costs 32 textures (and, today, 32 shader programs).
- **The end-of-run progress bar** uses `createPanel` with a nine-slice
  fill whose width follows the distance flown. Below the width of its two
  rounded ends, the nine-slice squashes them, so the demo holds the fill at
  a minimum width and hides it at zero. Forge's own `createProgressBar`
  and `createSlider` drive their fills the same way (resizing the fill's
  rect), so a nine-slice fill squashes there too.

`ui-system.md` deferred radial fill because it "needs a shader-level
fill-amount uniform". This design adds fill as a sprite feature: the
sprite keeps its size and only the filled part is drawn, as Unity's
`Image` "Filled" type and Godot's `TextureProgressBar` do.

---

## 2. Scope

### In scope

- `SpriteEcsComponent.fill`, linear or radial.
- Linear fills on nine-slice sprites.
- Radial fills over part of a turn (arc gauges).
- `createProgressBar` and `createSlider` using it.

### Out of scope

- **Clipping by a parent rect** ([#583](https://github.com/Forge-Game-Engine/Forge/issues/583)).
  A general mask for scroll views; fill is per sprite.
- **Radial fills on nine-slice sprites.** Combining them throws; nothing
  needs it.
- **Text fill.** Sprites only.

---

## 3. How established engines handle this

- **Unity**: `Image.type = Filled`, with `fillMethod` (horizontal,
  vertical, radial 90/180/360), `fillOrigin`, `fillClockwise` and
  `fillAmount`. The image keeps its rect; the mesh is cut to the filled
  part. Filled and Sliced are separate image types, so a filled image
  can't also be nine-sliced.
- **Godot**: `TextureProgressBar` has fill modes (left to right, right to
  left, top to bottom, bottom to top, clockwise, counter-clockwise,
  bilinear), `radial_initial_angle` and `radial_fill_degrees` (so a gauge
  can fill an arc rather than a full turn), and `nine_patch_stretch`,
  which crops a nine-patch's end section as it fills instead of squashing
  it.

Both reveal a fixed-size image rather than resizing it.

---

## 4. Design

### 4.1 Component

```ts
type SpriteFill =
  | {
      method: 'linear';
      /** The edge filling starts from. */
      origin: 'left' | 'right' | 'bottom' | 'top';
      /** How much is drawn, 0 to 1. */
      amount: number;
    }
  | {
      method: 'radial';
      /** Where the fill starts, in radians (angle-conventions.md: counter-clockwise from +X). */
      startAngle: number;
      /** The full extent at `amount: 1`, in radians; negative fills clockwise. A full turn is `2π`. */
      sweep: number;
      /** How much of `sweep` is drawn, 0 to 1. */
      amount: number;
    };
```

`fill` is optional; a sprite without it draws whole, as today. `amount` is
clamped to `[0, 1]`; at `0` the sprite draws nothing. `sweep` maps the
amount onto an arc, which is what a gauge like the HUD's ring segment
needs (Godot's `radial_fill_degrees`).

### 4.2 Drawing

- **Linear fills** are cropped on the CPU when the render system builds
  the sprite's instances: the quad is shrunk toward the origin edge and
  moved so the cropped part stays where it was, and its UV rect is cut to
  match, the same way nine-slice regions are placed today. The Y-up
  `'bottom'`/`'top'` origins are mapped onto the renderer's Y-down bands
  and UVs. For a nine-slice sprite, the regions are computed at the
  sprite's full size and then cropped, so the end caps are never squashed:
  the filled part shows the cap at the origin end and a straight cut at the
  moving edge. No shader change, no extra cost.
- **Radial fills** add two per-instance values to the sprite instance
  layout: the start angle and the filled sweep (`sweep * amount`, its sign
  giving the direction). Angles are measured around the sprite's center in
  its own local space, so rotation, flips and non-square sizes keep the
  angles the player sees. The fragment test is a shared GLSL function
  (an include) that computes coverage with `fwidth` rather than
  `discard`, so the moving edge is anti-aliased. `sprite.frag` calls it;
  a custom sprite fragment shader (from
  [`sprite-textures.md`](./sprite-textures.md)'s `createSpriteMaterial`)
  must call it too, and drawing a radially filled sprite with a material
  whose fragment shader doesn't include it throws, rather than silently
  ignoring the fill. Instances without a radial fill send a full turn and
  pass the test. Glyphs use their own layouts and pay nothing.

### 4.3 Progress bar and slider

`createProgressBar` and `createSlider` read the fill method from their
fill sprite's `fill`, rather than taking a separate option (default: a
linear fill from the left), and their systems write `fill.amount` from the
value instead of resizing the fill's rect. The fill entity covers the
track's full rect, and the systems are the only writers of their fill's
`amount`.

---

## 5. Phases

### Phase 1: Linear fill

| #   | Task                                                                                             | Size |
| --- | ------------------------------------------------------------------------------------------------ | ---- |
| 1.1 | `SpriteFill` on the sprite component; linear cropping (size, position, UVs) in the render system | M    |
| 1.2 | Nine-slice regions cropped after layout; tests at `0`, small amounts and `1`, for every origin   | S    |
| 1.3 | Progress bar and slider fill by amount, method from the fill sprite; UI tests updated            | S    |
| 1.4 | Guide and progress-bar/slider docs demos; changelog under `#### Added` and `#### Changed`        | S    |

**Definition of done:** a nine-slice fill at 2% shows its end cap at full
width and a straight cut; the progress bar and slider no longer resize their fills.

### Phase 2: Radial fill

Lands after [`sprite-textures.md`](./sprite-textures.md), which settles
the sprite instance layout and custom sprite materials.

| #   | Task                                                                                                      | Size |
| --- | --------------------------------------------------------------------------------------------------------- | ---- |
| 2.1 | Two per-instance values in the sprite instance layout; the shared coverage include; `sprite.frag` uses it | M    |
| 2.2 | A radially filled sprite on a material without the include throws; radial plus nine-slice throws          | S    |
| 2.3 | Unit tests for the instance data; an e2e scene measuring a half-filled ring                               | M    |
| 2.4 | Docs demo; guide; changelog                                                                               | S    |

**Definition of done:** a ring sprite with a radial fill at `0.25` draws a
quarter of the ring, with a smooth edge, following the sprite's rotation;
an arc gauge fills only its arc.

---

## 6. Decision log

### DL-1: Crop linear fills on the CPU, test radial fills in the shader

**Options.** (a) Both in the shader. (b) Both as generated geometry
(Unity's approach). (c) Linear on the CPU, radial in the shader.

**Decision: (c).**

**Rationale.** Cropping a quad is free and composes with nine-slice
regions the render system already computes. Radial geometry would break
instancing (each sprite its own mesh); a fragment test keeps every sprite
on the shared instanced quad.

### DL-2: Fill on the sprite, not a UI component

**Rationale.** The HUD ring is a world sprite, not UI. Unity's fill is on
`Image` (UI) and Godot's on a control, but Forge's UI draws with sprites,
so the sprite is the one place that serves both.

### DL-3: The fill method comes from the fill sprite

**Rationale.** A `fillMethod` option on `createProgressBar` would say the
same thing as the fill sprite's `fill`, twice. Reading it from the sprite
keeps one source of truth, and works for the slider without a second
option.

---

## 7. Open questions

1. **Should linear fills support a "both edges" method** (filling out from
   the center, Godot's bilinear)? Nothing needs it.
   - (a) Not now (proposed). (b) Add a centered origin.
2. **Masks instead of fill?** A linear fill is a rect mask whose edge
   moves, and a radial fill is a sector mask. Masking is needed anyway for
   scroll rects ([#583](https://github.com/Forge-Game-Engine/Forge/issues/583),
   which lists health bars that fill by revealing as a use case), so
   having both would give Forge two mechanisms for one effect.
   - (a) Rework this design as masks (proposed). A mask component on an
     entity clips its descendants, sprites and text alike, to the entity's
     rect, part of it from one edge (`origin`, `amount`), or a sector
     around its center (`startAngle`, `sweep`, `amount`). Rendering stays
     per instance, as #583 proposes: an axis-aligned clip rect that nested
     rect masks intersect, plus at most one shape mask in its entity's
     local space, with anti-aliased edges. Progress bars and sliders mask
     a full-size fill, so nine-slice caps can't squash and a label inside
     the fill is revealed with it. `SpriteEcsComponent.fill` goes.
   - (b) Keep fill on the sprite and design masks separately; Unity and
     Godot have both (Filled images and `TextureProgressBar` beside their
     masks).

---

## 8. Testing considerations

- Cropping math for every origin, with and without nine-slice, including
  amounts smaller than one cap; the cropped quad stays in place.
- Radial instance data for positive and negative sweeps, arcs smaller
  than a turn, and flipped, rotated and non-square sprites.
- e2e (Phase 2): the relative measurement of a ring's drawn area at `0.5`
  against `1`, per the pattern in `AGENTS.md`.

## 9. Documentation and demo follow-up

- Guides: filled sprites in rendering; fill methods in the progress-bar
  and slider pages.
- Demo: the HUD's top segment becomes two sprites, the unlit segment and
  the lit one with a radial fill over the segment's arc (its moving end is
  a straight cut rather than the outlined, gapped end the pre-rendered
  images had); the stats panel's minimum width and hide-at-zero go.
