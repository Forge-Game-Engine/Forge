# Design: Colors Brighter Than White

|                                       |                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                     |
| **Kind**                              | Defect                                                                                                |
| **Found in**                          | Galactic Journey demo: `src/ui/create-menu-button.ts` (buttons dimmed at rest so hover can brighten) |
| **Engine version at time of writing** | `0.25.8`                                                                                              |
| **Related**                           | [`demo-findings.md`](./demo-findings.md)                                                              |

## 0. Targeted modules

| Path                                            | Change   | Notes                                                                    |
| ----------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| `src/rendering/color.ts`                        | Modified | Red, green and blue have no upper bound; alpha stays in `[0, 1]`         |
| `documentation-site/docs/docs/rendering/*.md`   | Modified | Tints above `1` brighten; bloom's "can't be brighter than white" tip     |
| `documentation-site/docs/docs/ui/` (transitions) | Modified | Hover brightening with a tint above `1`                                  |

---

## 1. Summary

`Color`'s constructor clamps every channel to `[0, 1]`. Everything
downstream could take more: the sprite shader multiplies the texture by
the tint and the text shader outputs its color, neither clamping,
instance tints are uploaded as floats, and HDR render targets (`RENDER_TARGET_FORMAT.hdr`) keep values
above `1` for bloom and tone mapping. The clamp in `Color` is the only
thing stopping a tint from brightening a sprite.

The demo's menu buttons hit this. A button's color transition should
brighten the art on hover. With tints capped at `1`, the art's own
brightness is the most hover can show, so the demo tints every button to
`0.8` at rest and `1` on hover, and has to author the art brighter than it
should look. The bloom guide has a tip explaining the same limit ("there's
no way to make one white sprite bloom more than another equally white
sprite by giving it a brighter-than-white color").

Every engine's color type is unclamped for exactly these uses. This design
removes the upper bound on red, green and blue.

---

## 2. Scope

### In scope

- `Color` keeping red, green and blue above `1`.
- Updating the guides that describe the clamp.

### Out of scope

- **A UI-specific brightness multiplier** (Unity's `ColorBlock` has one).
  With unclamped colors, a hover color of `(1.2, 1.2, 1.2)` does the same
  thing.
- **Color spaces.** Forge's colors are used as-is in the shaders. Whether
  they should be treated as sRGB and linearized is a separate question.

---

## 3. How established engines handle this

- **Unity**: `Color` is four unclamped floats. HDR colors are a normal use
  (`ColorUsage(hdr: true)` in the inspector) for emission and bloom.
- **Godot**: `Color` channels can exceed `1`, and
  `modulate` above `1` brightens a sprite, which is the usual way to make a
  2D sprite glow with the glow effect.
- **Bevy**: `LinearRgba` is unclamped; brightening a sprite past its
  texture with `Sprite::color` and blooming it is in the 2D bloom example.

---

## 4. Design

`new Color(r, g, b, a)`:

- `r`, `g` and `b` are clamped to `0` at the bottom and have no upper
  bound. The lower clamp stays: negative light has no meaning, and an
  easing curve that overshoots below `0` shouldn't make a sprite render
  negative colors on an HDR target.
- `a` stays clamped to `[0, 1]`. Alpha above `1` breaks premultiplied
  blending: on a float render target, `1 - a` goes negative.

What a value above `1` does depends on where it's drawn, which is how GPUs
work and what the guides will say:

- **On an 8-bit target or the canvas**, each channel of the result is
  clamped when it's written: a tint of `1.2` brightens the art until a
  channel reaches full brightness.
- **On an HDR target**, the value survives to bloom and tone mapping, so a
  sprite tinted `(3, 3, 3)` blooms more than one tinted `(1, 1, 1)`.

`toRGBAString` clamps red, green and blue to `255` when it formats them,
since CSS colors can't be brighter than white.

---

## 5. Phases

### Phase 1: Unclamped colors

| #   | Task                                                                              | Size |
| --- | --------------------------------------------------------------------------------- | ---- |
| 1.1 | Remove the upper clamp on red, green and blue; keep alpha and the lower clamp     | S    |
| 1.2 | Tests: values above `1` kept; negatives clamped; `toRGBAString` stays valid CSS   | S    |
| 1.3 | Guides: tinting, color transitions, bloom tip; changelog under `#### Changed`     | S    |

**Definition of done:** a sprite tinted `(1.5, 1.5, 1.5)` draws brighter
than its texture, and blooms more than a white-tinted one on an HDR
camera.

---

## 6. Decision log

### DL-1: No upper bound, rather than a larger one

**Rationale.** Any fixed ceiling is arbitrary: the right maximum depends
on the target format and tone mapping, which `Color` knows nothing about.

### DL-2: Alpha stays clamped

**Rationale.** Premultiplied blending (see "Alpha Blending" in
`AGENTS.md`) assumes alpha in `[0, 1]`; outside it, the blend factors go
negative on float targets.

---

## 7. Open questions

None.

---

## 8. Testing considerations

- `Color` unit tests for the bounds above.
- An existing translucent-UI or bloom e2e scene gains a sprite tinted above
  `1` on an HDR camera, compared against a white-tinted twin with the
  relative-measurement pattern from `AGENTS.md`.

## 9. Documentation and demo follow-up

- `rendering/bloom.md`: the tip becomes "tint above `1` on an `hdr`
  camera".
- Demo: buttons rest at white and brighten on hover; the art is authored at
  its intended brightness and the comment goes.
