# Galactic Journey Demo: Engine Findings

|                                       |                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                      |
| **Kind**                              | Index of findings                                                      |
| **Found in**                          | The Galactic Journey demo (`forge-game-engine/demo`, commit `419af4e`) |
| **Engine version at time of writing** | `0.25.8`                                                               |

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
same problem. Each was then reviewed against those rules and against the
code, and revised (§3).

These are proposals. Findings marked "implemented" have shipped: their
design documents were removed, and `documentation-site/docs/docs`
describes the current behavior. The rest don't describe current behavior,
and each needs review before it's implemented.

---

## 2. Findings

| #   | Design                                                            | Kind               | What the demo works around                                                                                           | Cause in Forge                                                                                                |
| --- | ----------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | [Shader uniform declarations](./shader-uniform-declarations.md)   | Defect             | Keeps uniforms alive with `highp` so `setUniform` doesn't throw on mobile                                            | Materials only know the uniforms the driver kept                                                              |
| 2   | [Sound mixer](./audio-mixer.md)                                   | Feature            | Its own mixer, buses, one-shots on entities with guessed lifetimes, synthesized WAVs as data URLs, a Howl per system | No buses, volumes, one-shots or procedural sounds; removal doesn't stop sounds; no completion report          |
| 3   | [Text input field](./text-input-field.md)                         | Feature            | Its own text field on a hidden DOM input, keys swallowed while typing                                                | No text field; the keyboard source reads keys typed into inputs                                               |
| 4   | Generational entity ids (implemented)                             | Defect             | "Id can be reused" checks, `removed`/`usedBullets` sets                                                              | Ids reused immediately with no generation; double removal; removing the last component removes the entity     |
| 5   | [Hierarchy removal](./hierarchy-removal.md)                       | Defect             | Orphaned flame cleanup; `removeWithHealthBar`, `removePowerUp`                                                       | Removing a parent leaves its children; no children index                                                      |
| 6   | [Input action state](./input-action-state.md)                     | Defect             | `noReset` on every axis; `shootInput.endHold()` after a group switch                                                 | Axes reset every frame by default; holds carried across group switches; sources overwrite each other          |
| 7   | Angle conventions (implemented)                                   | Defect             | Converts the exhaust direction by hand, once                                                                         | Particles use degrees clockwise from up; `Vec2.up` points down; emitters ignore rotation; Y-down terrain slab |
| 8   | HDR colors (implemented)                                          | Defect             | Buttons dimmed at rest so hover can brighten                                                                         | `Color` clamps to `1`                                                                                         |
| 9   | [Sprite textures](./sprite-textures.md)                           | Defect and feature | Renderable swaps, raw GL textures, a white SVG, fresh `uvOffset`s, hand-built renderables                            | A sprite is a whole pipeline per image; textures have no owner; shared vectors                                |
| 10  | Camera views (implemented)                                        | Feature and defect | A mirrored `verticalWorldUnits`, visible-size calls in 16 files, unit conversion constants, manual culling           | No camera view or conversions; `worldToScreenSpace` doesn't flip Y; no culling                                |
| 11  | [Render resolution](./render-resolution.md)                       | Defect and feature | Writes `maxPixelRatio` through a cast; resizes camera targets every frame                                            | `maxPixelRatio` is read-only; camera targets don't follow the canvas                                          |
| 12  | [Post-processing effects](./post-processing-effects.md)           | Feature and defect | Scratch targets and copy-backs in each effect; bloom off via intensity                                               | Each pass copies back; bloom at `passes: 0` still draws                                                       |
| 13  | [WebGL context loss](./webgl-context-loss.md)                     | Feature            | Reloads the page                                                                                                     | Context loss isn't handled; GPU resources can't be rebuilt                                                    |
| 14  | [Sprite draw order](./sprite-draw-order.md)                       | Defect             | `sortDepth = ship.y - offset` every frame; `-1e6`-style depths                                                       | Absolute, Y-based, quantized sorting; nothing relative to the parent                                          |
| 15  | [Sprite fill](./sprite-fill.md)                                   | Feature            | 32 pre-rendered drain images; a progress fill held at a minimum width                                                | No linear or radial reveal                                                                                    |
| 16  | [Hierarchical visibility](./hierarchical-visibility.md)           | Feature            | `setShown` (alpha, interactable, raycasts) in five files; buttons moved by hand                                      | No subtree hide affecting rendering, layout and input                                                         |
| 17  | Collision events (implemented)                                    | Feature            | Four systems scanning every manifold; `addAabbComponent` everywhere                                                  | No layers, masks, sensors or per-entity contacts                                                              |
| 18  | [Polygon collider local space](./polygon-collider-local-space.md) | Defect             | A symmetric collider so re-centering doesn't move it                                                                 | Polygons re-centered because the solver assumes origin = center of mass                                       |
| 19  | Game states (implemented)                                         | Feature            | A phase machine with entered/left flags, 15 state checks in 9 files, a clear-run system                              | No states, run conditions or state-scoped entities                                                            |
| 20  | [Text cap-height centering](./text-cap-height-centering.md)       | Defect             | Baselines computed from cap height; a rebuilt button                                                                 | `'middle'` centers each string's own ink; the stored cap height includes glyph padding                        |
| 21  | Font atlas loading (implemented)                                  | Defect             | Fonts served from `public/`                                                                                          | The atlas image is resolved next to the JSON, which bundlers rename                                           |
| 22  | [Persistent state](./persistent-preferences.md)                   | Feature            | Two copies of load/validate/save around `localStorage`                                                               | No persistent state                                                                                           |

---

## 3. Review

Each design was reviewed with the `solution-reviewer` agent
(`.claude/agents/solution-reviewer.md`) for root cause, ownership of every
value, comparison with established engines, Forge's ECS rules, and cost.
One was approved; the others were sent back for revision and have been
revised: factual errors about the code and other engines corrected,
missing call sites and dependencies added, and the designs changed where
the reviews found a better or safer approach. The main changes:

| Design                       | Verdict | What the revision changed                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shader uniform declarations  | Revise  | Validation uses the declared size, never the driver's; `[0]` aliases; how declarations become typed uniforms; Unity and Godot don't reject unknown names                                                                                                                                                             |
| Sound mixer                  | Revise  | Unlocking on the events that count as gestures, re-armed after interruptions; a `stop()`; a real pause; a completion field; renamed away from Unity's class names                                                                                                                                                    |
| Text input field             | Revise  | Editing separate from hover-driven focus (Godot 4.4's model); one hidden input per field; IME guards; tap-to-edit through the UI's own hit test                                                                                                                                                                      |
| Generational entity ids      | Revise  | A 30-bit handle that stays a small integer in V8; oldest-first slot reuse; the slot marked dead before the removal event                                                                                                                                                                                             |
| Hierarchy removal            | Revise  | Keeps local transforms; the parent component moves into the ECS; a sibling-order contract the UI systems read                                                                                                                                                                                                        |
| Input action state           | Revise  | Holds combined per source; a defined "fresh press"; release triggers; ties; every source releases on `stop()`                                                                                                                                                                                                        |
| Angle conventions            | Revise  | The Y-down terrain slab; the guide's forward-axis offset; the car demo's spawn offsets                                                                                                                                                                                                                               |
| HDR colors                   | Approve | Wording about the bloom guide corrected                                                                                                                                                                                                                                                                              |
| Sprite textures              | Revise  | Shared programs give every uniform a value; render targets expose textures; emissive maps on the sprite; vector copying split into its own phase                                                                                                                                                                     |
| Camera views                 | Revise  | The view comes from the camera's destination; terrain and UI use it; the renderer-flip phase dropped                                                                                                                                                                                                                 |
| Render resolution            | Revise  | Only camera targets follow the canvas; effects' intermediates stay relative to their source                                                                                                                                                                                                                          |
| Post-processing effects      | Revise  | A second framebuffer swaps with the color buffer; a stable color handle; the must-write rule                                                                                                                                                                                                                         |
| WebGL context loss           | Revise  | Deferred creation instead of per-system guards; a strong registry; extensions re-requested; prerequisites stated                                                                                                                                                                                                     |
| Sprite draw order            | Revise  | A total order (pre-order index, roots by creation); `order` on its own component; UI input follows draw order                                                                                                                                                                                                        |
| Sprite fill                  | Revise  | Arc sweeps; an anti-aliased radial test shared with custom shaders; the slider too                                                                                                                                                                                                                                   |
| Hierarchical visibility      | Revise  | The dropdown and tooltip move onto it; focus released on hide; emitters stop                                                                                                                                                                                                                                         |
| Collision events             | Revise  | Sensor overlaps only through contacts; deduplicated contacts; Forge's own manifold scanners migrate                                                                                                                                                                                                                  |
| Polygon collider local space | Revise  | Zero center for non-dynamic bodies; integration stays an increment; `applyImpulse` finds the center itself                                                                                                                                                                                                           |
| Game states                  | Revise  | A guaranteed-first group; exit, scoped removal and enter in order; the initial state is entered                                                                                                                                                                                                                      |
| Text cap-height centering    | Revise  | The generator's cap height includes glyph padding and is fixed first                                                                                                                                                                                                                                                 |
| Font atlas loading           | Revise  | The shipped default font gets an exports path; concurrent loads shared; image size checked                                                                                                                                                                                                                           |
| Persistent state             | Revise  | Only set keys are stored; finite numbers; one owner of persisted values. Later, in review: an async storage interface shared with #567, `localStorage` its first backend; storage failures and wrong-typed values are errors; renamed persistent state, kept above the world and written into it as component values |

### Decisions for the team

These are recorded as open questions in their designs, with a proposal:

- **Sprite draw order:** approve dropping the default Y-sort, which
  changes every game's draw order within a layer.
- **Hierarchical visibility:** remove `SpriteEcsComponent.enabled` and
  `TextEcsComponent.enabled` in favor of `visible`, or keep both.
- **Sprite textures:** make the instance-segment helpers internal; put
  emissive maps on the sprite rather than the material.
- **Polygon collider local space:** derive rigid-body mass data from the
  collider instead of copying it in.
- **Text input field:** keep hover-driven focus with a separate editing
  state, or remove hover focus from the UI.
- **Hierarchy removal:** wait before adding a lifetime link that isn't a
  transform parent.

---

## 4. Dependencies and order

Most designs are independent. These aren't:

- [Sprite draw order](./sprite-draw-order.md) needs hierarchy removal's
  children index and sibling order;
  [hierarchical visibility](./hierarchical-visibility.md) needs draw
  order's per-frame resolution pass.
- [Sprite textures](./sprite-textures.md) needs
  [shader uniform declarations](./shader-uniform-declarations.md);
  [WebGL context loss](./webgl-context-loss.md) needs both;
  [sprite fill](./sprite-fill.md) Phase 2 lands after sprite textures.
- [Render resolution](./render-resolution.md) lands after
  [post-processing effects](./post-processing-effects.md).
- [Text input field](./text-input-field.md) Phase 1 and
  [input action state](./input-action-state.md) both change the keyboard
  source; either can land first.
- [Polygon collider local space](./polygon-collider-local-space.md)
  changes where continuous collision detection sweeps circles from.

A suggested order, small and independent first:

1. **Small defects**: text cap-height centering, shader uniform
   declarations.
2. **ECS foundations**: hierarchy removal.
3. **Input**: input action state, then the text input field.
4. **Rendering**: sprite textures (Phase 0 can land any time),
   post-processing effects, render resolution, sprite draw order,
   hierarchical visibility, sprite fill, then WebGL context loss.
5. **Features**: the sound mixer, polygon collider local space,
   persistent state.

---

## 5. Workarounds that are no longer needed

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
  is in the [sound mixer](./audio-mixer.md) design.

---

## 6. Not engine work

These are game decisions or game-specific features, and stay in the demo:

- The camera shake, the graphics quality presets and their "trial" of a
  new quality, the leaderboard, Firebase, the QR code content and the
  SVG-generated art.
- Routing the cancel button between menu pages: the demo wires it to each
  page's back action, which is game flow.
- Registering the transform system twice (before and after movement) and
  the draw systems' order: ordering choices that work as intended.
