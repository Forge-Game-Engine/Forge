# Design: Vertically Centered Text Centers Its Cap Height

|                                       |                                                                                                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                          |
| **Kind**                              | Defect                                                                                                                                                                                                     |
| **Found in**                          | Galactic Journey demo: `src/ui/create-menu-button.ts` (label placed by hand "centered on its cap height"), `src/main-menu/create-controls-diagram.ts` (`textCenteredAt`), the `titleBaseline` formulas in `create-stats-panel.ts`, `create-flight-history-page.ts`, `create-pilot-panel.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                   |
| **Related**                           | [`ui-system.md`](./ui-system.md)                                                                                                                                                                            |

## 0. Targeted modules

| Path                                     | Change   | Notes                                                                            |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `src/text/utilities/shape-text.ts`       | Modified | `'middle'` centers the band from the first line's cap line to the last baseline |
| `src/text/components/text-component.ts`  | Modified | Doc comment                                                                      |
| `documentation-site/docs/docs/text/`     | Modified | Vertical alignment                                                               |

---

## 1. Summary

`TextEcsComponent.verticalAlign: 'middle'` centers the string's actual
ink: the tallest and deepest glyphs it happens to contain. So the same
label shifts when its text changes ("LEVEL 1" and "QUIT" sit at
different heights, and a lowercase label jumps when a "g" appears), and
two buttons side by side don't line up. `createButton` uses `'middle'`
for its label, so Forge's own buttons have this.

The demo's UI centers text the way designers expect, on the cap height:
the band between the baseline and the top of a capital. It does that by
hand, computing `baseline = center + capHeight * size / 2` in its menu
button (rebuilt rather than using `createButton`), in a
`textCenteredAt` helper, and in a `titleBaseline` formula per panel.

`'middle'` exists because the alternative it was compared with, centering
the font's ascender-to-descender box, sits too high for strings without
descenders. Centering the cap-height band fixes that too, and doesn't
depend on the string. It's what CSS's `text-box: trim-both cap alphabetic`
and design tools' "cap height to baseline" trimming do.

---

## 2. Scope

### In scope

- Redefining `'middle'` as cap-height centering, for one line and many.
- Migrating callers whose positions were tuned around ink centering.

### Out of scope

- **Centering on the x-height** for all-lowercase text. A cap-height
  center sits a little low for it; no case in the demo or the docs needs
  the alternative.
- **The other alignments.** `'top'`, `'bottom'`, `'capline'` and
  `'baseline'` already anchor to font metrics and are unchanged.

---

## 3. How established engines and tools handle this

- **CSS**: `text-box-trim` with `text-box-edge: cap alphabetic` trims a
  line box to the cap height above and the alphabetic baseline below, so
  ordinary centering then centers the cap band, independent of content.
- **Design tools** (Figma's vertical trim, "cap height to baseline")
  offer the same box for exactly this reason: content-independent optical
  centering.

Engines leave this to their text layout; the convention to match is the
designers' one.

---

## 4. Design

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

`createButton`'s label then sits where a designer would put it, and the
demo's menu button can place its label with `'middle'` like everything
else.

---

## 5. Phases

### Phase 1: Cap-height centering

| #   | Task                                                                          | Size |
| --- | ----------------------------------------------------------------------------- | ---- |
| 1.1 | New `'middle'` offset; `getInkBounds` removed; tests for one and three lines  | S    |
| 1.2 | Check every `'middle'` caller in `/src` (buttons, dropdowns, toggles) and the docs demos visually | S |
| 1.3 | Text guide; changelog under `#### Changed`                                    | S    |

**Definition of done:** two labels with different text, centered at the
same point, share a baseline.

---

## 6. Decision log

### DL-1: Change `'middle'` rather than add `'capMiddle'`

**Options.** (a) Redefine `'middle'`. (b) Add a new value and keep ink
centering.

**Decision: (a).**

**Rationale.** Content-dependent centering is the defect: no UI wants a
label to move when its text changes. Keeping it as an option would leave
the wrong behavior as the obvious choice.

---

## 7. Open questions

None.

---

## 8. Testing considerations

- `shapeText`: `'middle'` offsets for strings with and without
  ascenders/descenders are equal; multi-line blocks center on the band.
- UI suites that assert label positions are updated to the new offsets.

## 9. Documentation and demo follow-up

- `text/` guide: what each vertical alignment anchors to.
- Demo: `textCenteredAt`, the `titleBaseline` formulas and the menu
  button's baseline arithmetic become `verticalAlign: 'middle'`.
