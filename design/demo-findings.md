# Galactic Journey Demo: Engine Findings

|                                       |                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                     |
| **Kind**                              | Index of findings                                                                     |
| **Found in**                          | The Galactic Journey demo (`forge-game-engine/demo`, commit `419af4e`)                |
| **Engine version at time of writing** | `0.25.8`                                                                              |

## 1. Summary

The Galactic Journey demo is a complete game built on Forge: a side
scrolling shooter with menus, settings, audio, post-processing, a HUD,
a leaderboard and a pilot sign-in with text entry. Building it found
places where the engine was missing something, or did something wrong,
and the demo worked around it.

Every workaround in the demo was traced to its cause in Forge. Findings
with the same cause were grouped, and each group has a design document
here. Each design fixes the cause in the layer that owns it and deletes
the workaround, following `AGENTS.md`'s change philosophy and how Unity,
Godot, Bevy (or, for browser-specific problems, web engines) solve the
same problem.

These are proposals. None of them describes current behavior, and each
needs review before it's implemented.

---

## 2. Findings

| #  | Design                                                                 | Kind              | What the demo works around                                                                  | Cause in Forge                                                                                    |
| -- | ---------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1  | [Shader uniform declarations](./shader-uniform-declarations.md)        | Defect            | Keeps uniforms alive with `highp` so `setUniform` doesn't throw on mobile                  | Materials only know the uniforms the driver kept                                                  |
| 2  | [Audio mixer](./audio-mixer.md)                                        | Feature           | Its own mixer, buses, one-shots on entities, synthesized WAVs as data URLs, a Howl per system | No buses, volumes, one-shots or procedural clips; removal doesn't stop sounds                     |
| 3  | [Text input field](./text-input-field.md)                              | Feature           | Its own text field on a hidden DOM input, keys swallowed while typing                      | No text field; the keyboard source reads keys typed into inputs                                   |
| 4  | [Generational entity ids](./generational-entity-ids.md)                | Defect            | "Id can be reused" checks, `removed`/`usedBullets` sets                                    | Ids reused immediately with no generation; double removal; removing the last component removes the entity |
| 5  | [Hierarchy removal](./hierarchy-removal.md)                            | Defect            | Orphaned flame cleanup; `removeWithHealthBar`, `removePowerUp`                             | Removing a parent leaves its children                                                             |
| 6  | [Input action state](./input-action-state.md)                          | Defect            | `noReset` on every axis; `shootInput.endHold()` after a group switch                       | Axes reset every frame by default; holds carried across group switches; sources overwrite each other |
| 7  | [Angle conventions](./angle-conventions.md)                            | Defect            | Converts the exhaust direction by hand, once                                               | Particles use degrees clockwise from up; `Vec2.up` points down; emitters ignore rotation          |
| 8  | [HDR colors](./hdr-colors.md)                                          | Defect            | Buttons dimmed at rest so hover can brighten                                               | `Color` clamps to `1`                                                                             |
| 9  | [Sprite textures](./sprite-textures.md)                                | Defect and feature | Renderable swaps, raw GL textures, a white SVG, fresh `uvOffset`s, hand-built renderables  | A sprite is a whole pipeline per image; no textures from pixels; shared vectors                   |
| 10 | [Camera views](./camera-views.md)                                      | Feature and defect | A mirrored `verticalWorldUnits`, 32 visible-size calls, unit conversion constants, manual culling | No camera view or conversions; `worldToScreenSpace` doesn't flip Y; no culling                    |
| 11 | [Render resolution](./render-resolution.md)                            | Defect and feature | Writes `maxPixelRatio` through a cast; resizes render targets every frame                  | `maxPixelRatio` is read-only; render targets don't follow the canvas                              |
| 12 | [Post-processing effects](./post-processing-effects.md)                | Feature and defect | Scratch targets and copy-backs in each effect; bloom off via intensity                     | Each pass copies back; bloom at `passes: 0` still draws                                           |
| 13 | [WebGL context loss](./webgl-context-loss.md)                          | Feature           | Reloads the page                                                                           | Context loss isn't handled                                                                        |
| 14 | [Sprite draw order](./sprite-draw-order.md)                            | Defect            | `sortDepth = ship.y - offset` every frame; `-1e6`-style depths                             | Absolute, Y-based, quantized sorting; nothing relative to the parent                              |
| 15 | [Sprite fill](./sprite-fill.md)                                        | Feature           | 32 pre-rendered drain images; a progress fill held at a minimum width                      | No linear or radial reveal                                                                        |
| 16 | [Hierarchical visibility](./hierarchical-visibility.md)                | Feature           | `setShown` (alpha, interactable, raycasts) in four files; buttons moved by hand          | No subtree hide affecting rendering, layout and input                                             |
| 17 | [Collision events](./collision-events.md)                              | Feature           | Four systems scanning every manifold; `addAabbComponent` everywhere                        | No layers, masks, sensors or per-entity contacts                                                  |
| 18 | [Polygon collider local space](./polygon-collider-local-space.md)      | Defect            | A symmetric collider so re-centering doesn't move it                                       | Polygons re-centered because the solver assumes origin = center of mass                           |
| 19 | [Game states](./game-states.md)                                        | Feature           | A phase machine with entered/left flags, 43 state checks, a clear-run system               | No states, run conditions or state-scoped entities                                                |
| 20 | [Text cap-height centering](./text-cap-height-centering.md)            | Defect            | Baselines computed from cap height; a rebuilt button                                       | `'middle'` centers each string's own ink                                                          |
| 21 | [Font atlas loading](./font-atlas-loading.md)                          | Defect            | Fonts served from `public/`                                                                | The atlas image is resolved next to the JSON, which bundlers rename                               |
| 22 | [Persistent preferences](./persistent-preferences.md)                  | Feature           | Two copies of load/validate/save around `localStorage`                                     | No settings storage                                                                               |

---

## 3. Dependencies and order

Most designs are independent. These aren't:

- [Hierarchy removal](./hierarchy-removal.md) needs
  [generational entity ids](./generational-entity-ids.md).
- [Sprite draw order](./sprite-draw-order.md) needs hierarchy removal's
  children index.
- [Game states](./game-states.md) relies on hierarchy removal for scoped
  subtrees.
- [WebGL context loss](./webgl-context-loss.md) needs
  [sprite textures](./sprite-textures.md) Phase 1 (textures that keep
  their source).
- [Post-processing effects](./post-processing-effects.md) and
  [render resolution](./render-resolution.md) share the scratch targets;
  either order works, together is simplest.
- [Collision events](./collision-events.md) uses `isAlive` from
  generational entity ids.
- [Text input field](./text-input-field.md) Phase 1 and
  [input action state](./input-action-state.md) both change the keyboard
  source.

A suggested order, small and independent first:

1. **Small defects**: shader uniform declarations, HDR colors, text
   cap-height centering, font atlas loading, angle conventions.
2. **ECS foundations**: generational entity ids, hierarchy removal, run
   conditions (game states Phase 1), then game states.
3. **Input**: input action state, then the text input field.
4. **Rendering**: sprite textures, camera views, render resolution,
   post-processing effects, sprite draw order, hierarchical visibility,
   sprite fill, then WebGL context loss.
5. **Features**: audio mixer, collision events, polygon collider local
   space, persistent preferences.

---

## 4. Workarounds that are no longer needed

Some of the demo's workarounds guard against behavior Forge doesn't have
(any more). They need no engine change; the demo can delete them:

- **"Removed after the loop, so the query's arrays stay in step"** (five
  systems). A system's query result is a snapshot (see "Atomicity" in
  `ecs/system.md`), so removing entities inside the loop is safe.
- **`[...world.query(...).entities]`** in the graphics-quality system.
  `world.query` builds new arrays too.
- **`if (text.text !== next)` before assigning text** (several systems).
  The text shaping system already skips text that hasn't changed.
- **"UI text doesn't wrap"** in the how-to-play panel. Labels anchored to
  stretch horizontally get their `maxWidth` from their rect and wrap.
- **`{ ...sprite }` before `addSpriteComponent`.** The component is
  already a new object. (Its nested vectors are still shared; that part is
  in [sprite textures](./sprite-textures.md).)
- **The explosion sound on its own entity**, so it outlives the
  explosion. Removing an entity never stopped its sound; the real problem
  is in [audio mixer](./audio-mixer.md).

---

## 5. Not engine work

These are game decisions or game-specific features, and stay in the demo:

- The camera shake, the graphics quality presets and their "trial" of a
  new quality, the leaderboard, Firebase, the QR code content and the
  SVG-generated art.
- Routing the cancel button between menu pages: the demo wires it to each
  page's back action, which is game flow.
- Registering the transform system twice (before and after movement) and
  the draw systems' order: ordering choices that work as intended.
