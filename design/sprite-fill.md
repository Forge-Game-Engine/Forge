# Design: Filled Sprites (Linear and Radial Reveal)

|                                       |                                                                                                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                          |
| **Kind**                              | Feature                                                                                                                                                                    |
| **Found in**                          | Galactic Journey demo: `src/speed/create-hud.ts` (32 pre-rendered "drain" images for one ring segment), `src/game-over/create-stats-panel.ts` (progress fill held at a minimum width, hidden at zero) |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                   |
| **Related**                           | [`ui-system.md`](./ui-system.md) backlog 3.7 (radial fill deferred), [`sprite-textures.md`](./sprite-textures.md)                                                            |

## 0. Targeted modules

| Path                                                | Change   | Notes                                                                                |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `src/rendering/components/sprite-component.ts`      | Modified | Optional `fill`: method, origin, amount, direction                                   |
| `src/rendering/systems/render-system.ts`            | Modified | Crops linear fills (and nine-slice regions) before building instances                |
| `src/rendering/shaders/sprite/*`, instance data     | Modified | Radial fills discard fragments outside the swept angle                               |
| `src/ui/systems/ui-progress-bar-system.ts`, `create-progress-bar.ts` | Modified | The fill keeps its full rect and sets `fill.amount`                  |
| `documentation-site/docs/docs/rendering/`, `ui/progress-bar` | Modified | Filled sprites; progress bar fill methods                                     |

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
  drives its fill the same way (resizing the fill's rect), so a nine-slice
  fill squashes there too.

`ui-system.md` deferred radial fill because it "needs a shader-level
fill-amount uniform". This design adds fill as a sprite feature, the way
Unity's `Image` "Filled" type and Godot's `TextureProgressBar` work: the
sprite keeps its size and only the filled part is drawn.

---

## 2. Scope

### In scope

- `SpriteEcsComponent.fill` with horizontal, vertical and radial methods.
- Linear fills on nine-slice sprites.
- `createProgressBar` using it, with a choice of fill method.

### Out of scope

- **Clipping by a parent rect** ([#583](https://github.com/Forge-Game-Engine/Forge/issues/583)).
  A general mask for scroll views; fill is per sprite.
- **Radial fills on nine-slice sprites.** The angle is measured on the
  sprite's whole rect; nothing needs it combined with slicing.
- **Text fill.** Sprites only.

---

## 3. How established engines handle this

- **Unity**: `Image.type = Filled`, with `fillMethod` (horizontal,
  vertical, radial 90/180/360), `fillOrigin`, `fillClockwise` and
  `fillAmount`. The image keeps its rect; the mesh is cut to the filled
  part.
- **Godot**: `TextureProgressBar` has fill modes (left to right, right to
  left, top to bottom, bottom to top, clockwise, counter-clockwise,
  bilinear), radial initial angle and fill degrees.

Both reveal a fixed-size image rather than resizing it.

---

## 4. Design

### 4.1 Component

```ts
interface SpriteFill {
  /** `'horizontal'`, `'vertical'` or `'radial'`. */
  method: SpriteFillMethod;
  /** How much is drawn, `0` to `1`. */
  amount: number;
  /**
   * Linear: the edge filling starts from (`'left'`/`'right'`, or
   * `'bottom'`/`'top'`). Radial: the angle filling starts from, in
   * radians, counter-clockwise from `+X` (see `angle-conventions.md`).
   */
  origin: SpriteFillOrigin;
  /** Radial only: counter-clockwise (default) or clockwise. */
  clockwise: boolean;
}
```

`fill` is optional; a sprite without it draws whole, as today.
`amount` is clamped to `[0, 1]`; at `0` the sprite draws nothing.

### 4.2 Drawing

- **Linear fills** are cropped on the CPU when the render system builds
  the sprite's instances: the quad's size and UV rect are cut at `amount`
  from the origin edge. For a nine-slice sprite, the regions are computed
  at the sprite's full size and then cropped, so the end caps are never
  squashed: the filled part shows the cap at the origin end and a straight
  cut at the moving edge. No shader change, no extra cost.
- **Radial fills** are drawn as the whole quad with per-instance fill data
  (start angle, swept angle, direction), and the sprite fragment shader
  discards fragments outside the swept angle, measured around the
  sprite's center in its own space (so rotation and flips carry over).
  Instances without a radial fill use a swept angle of a full turn and
  pass the test.

### 4.3 Progress bar

`createProgressBar` takes `fillMethod` (default horizontal from the left)
and the progress bar system writes `fill.amount` from `value` instead of
resizing the fill's rect. The fill entity covers the track's full rect.

---

## 5. Phases

### Phase 1: Linear fill

| #   | Task                                                                                     | Size |
| --- | ---------------------------------------------------------------------------------------- | ---- |
| 1.1 | `SpriteFill` on the sprite component; linear cropping in the render system              | M    |
| 1.2 | Nine-slice regions cropped after layout; tests at `0`, small amounts and `1`             | S    |
| 1.3 | Progress bar fills by amount; UI tests updated                                           | S    |
| 1.4 | Guide and progress-bar docs demo; changelog under `#### Added` and `#### Changed`        | S    |

**Definition of done:** a nine-slice fill at 2% shows its end cap at full
size and a cut; the progress bar no longer resizes its fill.

### Phase 2: Radial fill

| #   | Task                                                                                     | Size |
| --- | ---------------------------------------------------------------------------------------- | ---- |
| 2.1 | Per-instance fill data in the sprite instance layout; fragment discard                   | M    |
| 2.2 | Unit tests for the instance data; an e2e scene measuring a half-filled ring              | M    |
| 2.3 | Radial fill method in `createProgressBar`; docs demo; guide; changelog                   | S    |

**Definition of done:** a ring sprite with a radial fill at `0.25` draws a
quarter of the ring, following the sprite's rotation.

---

## 6. Decision log

### DL-1: Crop linear fills on the CPU, discard radial fills in the shader

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

---

## 7. Open questions

1. **Should linear fills support a "both edges" method** (filling out from
   the center, Godot's bilinear)? Nothing needs it.
   - (a) Not now (proposed). (b) Add `'horizontalCenter'`/`'verticalCenter'`.

---

## 8. Testing considerations

- Cropping math for every origin, with and without nine-slice, including
  amounts smaller than one cap.
- Radial instance data for each origin and direction, and with flipped
  and rotated sprites.
- e2e (Phase 2): the relative measurement of a ring's drawn area at `0.5`
  against `1`, per the pattern in `AGENTS.md`.

## 9. Documentation and demo follow-up

- Guides: filled sprites in rendering; fill methods in the progress-bar
  page.
- Demo: the HUD loads one segment image and drains it with a radial fill;
  the stats panel's minimum width and hide-at-zero go.
