# Design: Vertically Centered Text Centers Its Cap Height

|                                       |                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                                                                                                   |
| **Kind**                              | Defect                                                                                                                                                                                                                                                                              |
| **Found in**                          | Galactic Journey demo: `src/ui/create-menu-button.ts` (label placed by hand "centered on its cap height"), `src/main-menu/create-controls-diagram.ts` (`textCenteredAt`), `titleBaseline` formulas in six panels (stats, flight history, pilot, leaderboard, how-to-play, settings) |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                                                            |
| **Related**                           | [`ui-system.md`](./ui-system.md), [`font-atlas-loading.md`](./font-atlas-loading.md)                                                                                                                                                                                                |

## 0. Targeted modules

| Path                                                                | Change   | Notes                                                                           |
| ------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `scripts/generate-font-atlas.mjs`                                   | Modified | `capHeight` measured without the distance-field padding                         |
| `assets/fonts/default/`, `documentation-site/static/fonts/default/` | Modified | Regenerated with the corrected `capHeight`                                      |
| `src/text/utilities/shape-text.ts`                                  | Modified | `'middle'` centers the band from the first line's cap line to the last baseline |
| `src/text/components/text-component.ts`                             | Modified | Doc comment                                                                     |
| `e2e/fixtures/scenes/text-effects-overlap.ts`                       | Modified | Its synthetic atlas gains a `capHeight`                                         |
| `documentation-site/docs/docs/text/`, docs demos                    | Modified | Vertical alignment                                                              |

---

## 1. Summary

`TextEcsComponent.verticalAlign: 'middle'` centers the string's actual
ink: the tallest and deepest glyphs it happens to contain. So the same
label shifts when its text changes ("LEVEL 1" and "QUIT" sit at
different heights, and a lowercase label jumps when a "g" appears), and
two buttons side by side don't line up. `createButton`, `createDropdown`
and `createTooltip` use `'middle'` for their labels, so Forge's own
controls have this.

The demo's UI centers text the way designers expect, on the cap height:
the band between the baseline and the top of a capital. It does that by
hand, computing `baseline = center + capHeight * size / 2` in its menu
button (rebuilt rather than using `createButton`), in a
`textCenteredAt` helper, and in a `titleBaseline` formula in six panels.

`'middle'` exists because the alternative it was compared with, centering
the font's ascender-to-descender box, sits too high for strings without
descenders. Centering the cap-height band fixes that too, and doesn't
depend on the string.

One prerequisite: the cap height Forge stores is wrong. The atlas
generator takes the top of "H"'s plane bounds, which include the distance
field's padding around the glyph: in the default font, "H" spans from
0.881 em down to -0.190 em although it sits on the baseline, so the stored
cap height is about 0.19 em too tall. `'capline'` is off by that much
today, and cap-height centering would be off by half of it. The demo's
hand-written formulas carry the same error.

---

## 2. Scope

### In scope

- Measuring `capHeight` without the padding, and regenerating the
  shipped atlases. This moves `'capline'` too, to where it was meant to be.
- Redefining `'middle'` as cap-height centering, for one line and many.
- Migrating callers whose positions were tuned around ink centering.

### Out of scope

- **Centering on the x-height** for all-lowercase text. A cap-height
  center sits a little low for it; no case in the demo or the docs needs
  the alternative.
- **`'top'`, `'bottom'` and `'baseline'`.** They anchor to the ascender,
  descender and baseline, which are documented as safe outer bounds and
  are unchanged.

---

## 3. How established engines and tools handle this

- **TextMesh Pro** (Unity) has vertical alignment modes for both
  behaviors: `Capline` centers the cap height in the box, and `Geometry`
  (shown as "Midline") centers the text mesh's extents, which is what
  Forge's `'middle'` does today.
- **CSS**: `text-box-trim` with `text-box-edge: cap alphabetic` trims a
  line box to the cap height above and the alphabetic baseline below, so
  ordinary centering then centers the cap band, independent of content.
- **Design tools** (Figma's vertical trim, "cap height to baseline")
  offer the same box for exactly this reason: content-independent optical
  centering, from the first line's cap height to the last line's
  baseline.

---

## 4. Design

### 4.1 The metric

The generator subtracts the padding it adds around every glyph (half the
distance range, converted to em) from the reference capital's plane-bounds
top when it computes `capHeight`. The two shipped atlases are regenerated.
`formatVersion` doesn't change: the field means the same thing, it's now
measured correctly.

### 4.2 Centering

For `verticalAlign: 'middle'`, the shaped block is centered on the band
from the first line's cap line (`capHeight * size` above its baseline) to
the last line's baseline:

```
offset = -(capTop + lastBaseline) / 2
capTop = capHeight * size
lastBaseline = -(lineCount - 1) * lineHeight
```

It reads only font metrics and the line count, so a string's position no
longer depends on its glyphs. The ink-bounds computation used only by
`'middle'` (`getInkBounds`) is deleted.

`createButton`'s label then sits where a designer would put it. The demo's
`textCenteredAt` and `titleBaseline` formulas become `'middle'`. Its menu
button still positions its label and sub-label together itself, since
they're two texts of different sizes centered as one block.

---

## 5. Phases

### Phase 1: Cap-height centering

| #   | Task                                                                                                                                                                                            | Size |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Generator measures `capHeight` without padding; regenerate both shipped atlases                                                                                                                 | S    |
| 1.2 | New `'middle'` offset; `getInkBounds` removed; tests for one and three lines                                                                                                                    | S    |
| 1.3 | `text-effects-overlap` e2e scene: its synthetic atlas gets `capHeight`, and its centered-glyph assertion and comment are updated                                                                | S    |
| 1.4 | Check the `'middle'` callers in `/src` (`createButton`, `createDropdown`, `createTooltip`) and the 11 docs demos that use it, visually                                                          | S    |
| 1.5 | Text guide (`rendering-text.md`'s vertical alignment section), the vertical-alignment docs demo's description, `text-component.ts` and `shape-text.ts` comments; changelog under `#### Changed` | S    |

**Definition of done:** two labels with different text, centered at the
same point, share a baseline; `'capline'` touches the top of an "H".

---

## 6. Decision log

### DL-1: Change `'middle'` rather than add `'capMiddle'`

**Options.** (a) Redefine `'middle'`. (b) Add a new value and keep ink
centering, as TextMesh Pro keeps its `Geometry` mode.

**Decision: (a).**

**Rationale.** Content-dependent centering is the defect: no UI wants a
label to move when its text changes, and nothing in the engine, the docs
demos or the demo uses ink centering on purpose. Keeping it would leave
the wrong behavior as the obvious choice.

### DL-2: Fix the metric at the generator

**Rationale.** `capHeight` is a font metric; the padding is an artifact of
how glyphs are stored in the atlas. Correcting it where it's measured
fixes `'capline'`, the new `'middle'` and every game that reads the
metric.

---

## 7. Open questions

None.

---

## 8. Testing considerations

- Generator: a glyph that sits on the baseline measures a cap height equal
  to its ink top.
- `shapeText`: `'middle'` offsets for strings with and without
  ascenders/descenders are equal; multi-line blocks center on the band.
- UI suites that assert label positions are updated to the new offsets.

## 9. Documentation and demo follow-up

- `text/` guide: what each vertical alignment anchors to.
- Demo: regenerate its font atlas; `textCenteredAt` and the
  `titleBaseline` formulas become `verticalAlign: 'middle'`.
