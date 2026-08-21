# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> This file is generated from [Conventional Commits](https://www.conventionalcommits.org/) as
> part of the release process. See the "Changelog" section of
> [AGENTS.md](https://github.com/Forge-Game-Engine/Forge/blob/dev/AGENTS.md#changelog) for
> how entries are produced and what should (and should not) be edited by hand.

## [Unreleased]

#### Added

- **text:** Add `@forge-game-engine/forge/text`'s font atlas pipeline (Phase 1 of MSDF text rendering, no rendering yet): `npm run generate-font-atlas` turns a `.ttf`/`.otf` font into a multi-channel signed distance field (MSDF) atlas PNG plus a versioned `FontAtlasData` JSON, and `FontAtlasCache` loads that pair into a `FontAtlas` at runtime
- **text:** Add static single-line text rendering (Phase 2 of MSDF text rendering): `addTextComponent`/`TextEcsComponent` (string, `FontAtlas`, size, color, letter spacing, layer) is shaped by `createTextShapingEcsSystem` into a cached `TextMeshEcsComponent` (kerned glyph quads + bounds), drawn through `createRenderEcsSystem` via the same instanced sprite batching nine-slice sprites use, with a new MSDF fragment shader that stays crisp at any scale
- **text:** Add multi-line layout (Phase 3 of MSDF text rendering): `TextEcsComponent.maxWidth` greedily word-wraps text across multiple lines, `horizontalAlign` (`'left'` | `'center'` | `'right'` | `'justify'`) and `verticalAlign` (`'top'` | `'middle'` | `'bottom'`) position lines within `maxWidth` and the block against the entity's position, and `lineHeight` controls the spacing between line baselines. `center`/`right` align each line against `maxWidth` itself, not just against each other - a single unwrapped line (or any line as wide as the block's own widest line) previously always computed a zero offset, silently no-op'ing `center`/`right` for the single-line case regardless of value
- **text:** Add outline and soft-shadow/glow effects (Phase 4 of MSDF text rendering): `TextEcsComponent.outlineColor`/`outlineWidth` and `shadowColor`/`shadowOffset`/`shadowSoftness`, in screen-pixel-range units so an effect's size stays constant on screen regardless of camera zoom or entity scale. Every glyph's outline/shadow draws in its own pass, always completing before any glyph's fill draws on top of it, so both effects render at the same, uniform strength across a whole word (including tightly-kerned pairs like "rg") and can safely merge with a neighboring glyph's own effect - bridging the gap between letters, like a Photoshop "stroke"/"outer glow" layer effect - without ever painting over any glyph's fill; the only limit on either effect is the font atlas's own encoded `distanceRange` budget, identical for `outlineWidth` and `shadowSoftness`/`shadowOffset` alike - see the new Text Effects doc for the safe range and how it scales with the text's on-screen size
- **text:** Ship a pre-generated default MSDF font atlas (Liberation Sans, SIL OFL 1.1) at `assets/fonts/default/default.json` in the `@forge-game-engine/forge` package (Phase 5 of MSDF text rendering), so `addTextComponent`/`FontAtlasCache` render text with zero font setup - no font file, license, or `forge-generate-font-atlas` run required to get started. The documentation site's text demo now loads this shipped atlas directly and adds an interactive playground (live text, size, alignment, wrap, and outline/glow controls - width, offset, and softness) driven by `createTextShapingEcsSystem`'s existing dirty tracking
- **physics:** Add `raycast(world, start, end, sort?)`, casting a line segment against every entity in an `EcsWorld` with a `ColliderEcsComponent` (`CircleCollider`, `PolygonCollider`, and `TerrainCollider` alike) and returning every intersection as a `RaycastHit` (`entity`, `point`, `normal`, `distance`), ordered by distance from `start` by default
- **physics:** Add `RigidBodyEcsComponent.type` (`'dynamic'` | `'kinematic'` | `'static'`, defaulting to `'dynamic'`), letting a body be moved directly by game code (`'kinematic'`) so it still pushes dynamic bodies on contact without itself being affected by gravity, forces, or impulses - previously only possible implicitly, by giving an entity no `RigidBodyEcsComponent` at all (still supported, and equivalent to `type: 'static'`)
- **utilities:** Add `DirectedAcyclicGraph<T>`, a generic topological-ordering data structure (`addNode`, `addEdge`, `removeNode`, `topologicalSort`) that throws a descriptive error when an edge would create a cycle or reference an unregistered node
- **ecs:** Add `EcsWorld.addSystem`'s `before`/`after` options, letting a system be ordered relative to specific other systems instead of an arbitrary numeric priority, and `EcsWorld.addSystemGroup`/`createSystemGroup`, for ordering whole groups of systems (each with their own `before`/`after`) against each other - see the "Ordering systems with before/after" and "Grouping systems" sections of the ECS World doc
- **input:** Add canvas-space pointer state directly on `MouseInputSource`: `position`, `delta`, `scroll`, `buttonsDown`, `buttonsHeld`, and `buttonsUp`, for code (a UI hit-tester, a drag gesture, a debug overlay) that wants the raw device state without an intervening `InputAction` binding
- **rendering:** Add `SpriteEcsComponent.sortDepth`, an optional per-sprite override for the depth a sprite is sorted by within its `layer`, taking priority over the existing default (`position.world.y`) when set
- **ui:** Add `@forge-game-engine/forge/ui`'s layout core: `RectTransformEcsComponent`/`addRectTransformComponent` and the pure `resolveRect` anchor/pivot/stretch resolver, `UiAnchor` presets (point, edge-stretch, and full-stretch anchors), `CanvasEcsComponent`/`createUiCanvas` (a dedicated, static UI camera with its own transparent-cleared `RenderTarget`, isolated from the world by a caller-supplied `cullingMask` - Forge doesn't reserve or default to any particular render category bit for UI, so pick one your game isn't already using elsewhere and reuse it for every UI visual's own category), `createUiLayoutEcsSystem` (a top-down, hierarchy-pre-order layout resolve that writes `position.local`, sprite `width`/`height`/`pivot`, and `sortDepth` on both sprites and text - so a panel's draw order relative to its own label never depends on where it happens to sit in the world), and `createPanel`/`createLabel` aggregate factories. See the new UI doc and demo for a HUD example
- **ui:** Add interaction: `UiInteractableEcsComponent`/`addUiInteractableComponent` (`onInvoke`, `onPointerEnter`/`onPointerExit`/`onPointerDown`/`onPointerUp`, `onBeginDrag`/`onDrag`/`onEndDrag`, and `isHovered`/`isFocused`/`isPressed`/`isDragging`/`wasInvokedThisFrame` state), `createUiRaycastEcsSystem` (a reverse-hierarchy-order, first-hit-wins pointer hit test, publishing `CanvasEcsComponent.hoveredEntity`/`isPointerOverUi`), `createUiInteractionEcsSystem` (the pointer hover/press/drag state machine, correct even when a pointer enter-and-press or press-and-release land in the same tick), `UiFocusEcsComponent`/`createUiNavigationEcsSystem` (automatic nearest-neighbor gamepad/keyboard focus navigation, with per-side explicit overrides, plus `submitInput`/`cancelInput`), `UiColorTransitionEcsComponent`/`createUiTransitionEcsSystem` (an eased tint per interaction state), the `UiNavigationDirection`/`uiNavigationDirections` map, and the `createButton` aggregate factory. Pointer hit-testing and interaction are driven through the structural `UiPointerSource` interface rather than a hard dependency on `MouseInputSource`, so a touchscreen, stylus, or other pointing device can drive the same systems; `createUiCanvas`'s `pointerSource` option accepts anything satisfying that shape (`MouseInputSource` does, unchanged). Invocation (`onInvoke`) is source-agnostic - the same event fires whether a pointer click or a gamepad/keyboard submit action caused it. See the new UI doc's "Interaction" section and the updated demo for a clickable, focus-navigable button. **Breaking change:** `createUiCanvas` now takes a required `time: Time` argument (`createUiCanvas(world, renderContext, time, options?)`), driving the new color-transition tweens
- **text:** Add `TextEcsComponent.category`, an optional per-entity override for the render category glyphs draw with (matched against a camera's `cullingMask`, the same convention `SpriteEcsComponent`/`Renderable` already use), defaulting to the existing `TEXT_RENDER_CATEGORY` - an ordinary default, not a value the engine reserves or forces onto every text entity
- **text:** Add `TextEcsComponent.sortDepth`, mirroring `SpriteEcsComponent.sortDepth` - an optional per-text override for the depth it's sorted by within its `layer`, taking priority over the existing default (`position.world.y`) when set
- **text:** Add `TextEcsComponent.verticalAlign: 'baseline' | 'capline'`, alongside the existing `'top'`/`'middle'`/`'bottom'`: `'baseline'` anchors the first line's own baseline directly (most useful for single-line text), and `'capline'` is `'top'` anchored to the font's new `capHeight` metric (a capital letter's actual top) instead of its `ascender` (the font's *tallest* glyphs, including ascenders like "b"/"d"/"h" that reach higher than a flat capital) - useful for a title or label set in caps, where anchoring to the taller ascender leaves a visible gap above the text. `FontAtlasData.metrics.capHeight` is measured from whichever flat-top capital (`H`/`I`/`E`/`F`/`L`/`T`) is present in the atlas's charset; `forge-generate-font-atlas` computes it automatically, and the shipped default atlas has been regenerated with it. **Breaking change:** the font atlas file format bumps to `formatVersion: 2` for the new required `capHeight` field - any atlas generated with an older `forge-generate-font-atlas` must be regenerated.
- **text:** Add exported `textHorizontalAlignments`/`TextHorizontalAlign` and `textVerticalAlignments`/`TextVerticalAlign` maps for `TextEcsComponent.horizontalAlign`/`verticalAlign`, matching the existing `uiScaleModes`/`mouseButtons`/`keyCodes` const-map convention, so callers reference `textHorizontalAlignments.center` instead of the raw string literal `'center'`
- **ui:** Add controls: `UiToggleEcsComponent`/`UiToggleGroupEcsComponent`/`createUiToggleEcsSystem`/`createToggle` (checkboxes, and mutually-exclusive radio groups via a shared `UiToggleGroupEcsComponent`), `UiSliderEcsComponent`/`createUiSliderEcsSystem`/`createSlider` (a click-and-drag track with a handle and optional fill, `minValue`/`maxValue`/`wholeNumbers`), `UiProgressBarEcsComponent`/`createUiProgressBarEcsSystem`/`createProgressBar` (a read-only linear fill indicator driven by `value`, with no interaction dependency so a `value` write is reflected the same frame), and `UiDropdownEcsComponent`/`createDropdown` (a header showing the selected option plus a click-to-open list of option rows, each an ordinary `createButton`). See the new UI doc's "Controls" section and the updated demo

#### Changed

- **math:** `Vector2`/`Vector3` are now plain `{ x, y }`/`{ x, y, z }` objects instead of classes, constructed with an object literal (`{ x: 1, y: 2 }`) and operated on via `Vec2`/`Vec3` static methods (`Vec2.add`, `Vec2.rotate`, `Vec2.normalize`, etc.) that mutate their first (`target`) argument in place and return it, rather than allocating a new vector, for performance in hot loops like physics integration; see the "Vectors and Rectangles" doc for the full API and migration guidance. **Breaking change.**
- **math:** `Vec2.normalize`/`Vec3.normalize` now throw when given a zero-length vector instead of silently returning it unchanged, since a normalized direction is undefined for a zero vector. **Breaking change.**
- **utils:** `createGame` utility now throws a more useful error message when no matching DOM element is found that has the id matching `containerId`
- **utils:** `createImageSprite` now makes layer an optional value in the options argument rather than a required argument to the function. Defaults to `1`.
- **math:** `Rect` is now a plain `{ min, max }` object instead of an `{ origin, size }` class, constructed with an object literal and operated on via the new `Rects` static-method namespace (`Rects.contains`, `Rects.intersects`, `Rects.size`, `Rects.clone`) rather than instance methods, matching the `Vector2`/`Vec2` convention. `Rect` was constructed nowhere in the engine outside its own tests, so this is not expected to affect existing content.

#### Removed

- **math:** Removed the `Vector2`/`Vector3` classes, including `new Vector2(...)`/`new Vector3(...)` construction, their instance methods (`.add()`, `.subtract()`, `.clone()`, etc.), and their static constant getters (`Vector2.zero`, `Vector2.up`, etc.), replaced by the `Vec2`/`Vec3` static-method API above. **Breaking change.**
- **ecs:** Removed `EcsWorld.addSystem`'s numeric `registrationOrder` parameter and the `SystemRegistrationOrder` constants, replaced by the `before`/`after` options and system groups described above - an arbitrary priority number didn't tell you how many systems would run before yours, or what priorities were already taken, and gave no way to express "run before/after this specific system". **Breaking change.**
- **utilities:** Removed `SortedSet`, which existed solely to back `EcsWorld`'s old priority-ordered system list and has no other consumers; use `DirectedAcyclicGraph` for ordering use cases going forward. **Breaking change.**
- **common:** Removed `DepthEcsComponent`/`addDepthComponent`, which was never read by anything in the engine; use the new `SpriteEcsComponent.sortDepth` for controlling sprite draw order instead. **Breaking change.**

#### Fixed

- **common:** Fix `createTransformEcsSystem` composing a child's world position by plain addition of the parent's world position, ignoring the parent's world rotation and scale entirely - a child parented to a rotated and/or scaled entity now orbits/scales with it instead of spinning or resizing in place at an un-rotated, un-scaled offset. **Behavior change** for any existing content that parents a positioned entity to a rotated or scaled one and was authored against the previous (incorrect) composition.
- **rendering:** Fix `SpriteEcsComponent.pivot` using a Y-down convention (`(0, 0)` was the sprite's top-left) while every other Y-facing value in the engine (world position, rotation) is Y-up - `pivot` is now Y-up too, so `(0, 0)` is the bottom-left corner and `(1, 1)` is the top-right corner. Nine-slice region placement (`computeNineSliceRegions`) is updated to match. The centered default (`(0.5, 0.5)`) is unaffected. **Breaking change** for any content using a non-centered pivot: those sprites now render vertically mirrored around their old pivot point until the pivot's `y` is updated (`1 - oldPivotY`).
- **utilities:** Fix `Game`'s render loop occasionally producing a negative `deltaTime` for one frame (e.g. right after constructing hundreds of entities in a single tick), by reading `performance.now()` at the point the frame callback runs instead of trusting `requestAnimationFrame`'s supplied timestamp, which is not guaranteed to be monotonic relative to the previous frame
- **input:** Fix `MouseInputSource` caching its container's `getBoundingClientRect()` once in its constructor and reusing it for every `mousemove` event - cursor positions (and any binding derived from them) were wrong after the container was resized, scrolled, or otherwise reflowed. The bounding rect is now recomputed fresh on every `mousemove`
- **text:** Fix `forge-generate-font-atlas` deriving `FontAtlasMetrics.ascender`/`descender` from the font's nominal `base`/`lineHeight` BMFont fields instead of the atlas's actually rendered glyph ink - for the shipped default atlas (Liberation Sans) this undershot both bounds (`ascender` was smaller than the rendered top of "b"/"d"/"h"/"i"/"l", `descender` was smaller in magnitude than the rendered bottom of "("/")"/"j"), so every `verticalAlign` (`'top'`, `'middle'`, `'bottom'`) positioned text noticeably higher than intended, with `'top'`-aligned ascenders visibly poking above their anchor. `ascender`/`descender` are now the actual max/min glyph bounds across the atlas's charset; regenerate any existing atlas with `forge-generate-font-atlas` to pick up the fix
- **text:** Fix `TextEcsComponent.verticalAlign: 'middle'` centering on the font's own `ascender`/`descender` metrics instead of the shaped text's actual rendered ink - since a font's ascender is typically taller than its descender is deep (most glyphs have no descender at all), this systematically positioned every descender-less string (numbers, titles, most short UI labels, e.g. a `"Score: 1234"` HUD readout) above the true visual center of its box. `'middle'` now centers on this specific string's own rendered bounds instead; `'top'`/`'bottom'` are unchanged (still anchored to the font's metrics, so a line's position stays stable as its text is edited). **Behavior change** for existing content relying on the old, metrics-based `'middle'` centering.
- **ui:** Fix `createButton`'s label reading as shifted right of the button's true center - `horizontalAlign: 'center'` only re-centers text within an explicit `maxWidth` box, which `createButton` never set, so a label always started exactly at the button's center point and grew rightward from there instead of being centered on it. The label now sets `maxWidth`/`horizontalAlign` (defaulting `maxWidth` to `sizeDelta.x`, overridable via the new `labelMaxWidth` option for a stretch-anchored button, where `sizeDelta.x` is a margin rather than a width) so the engine's own centering keeps the label centered even as its text changes later, instead of a one-off pre-measured offset that only matched the label's *initial* text. This also fixes `createDropdown`'s header and option-row labels, which are built from `createButton` - including the header staying centered after selecting a different option, and the option rows (which stretch to the header's width) centering against that width instead of their own zero-width `sizeDelta`.

## [0.24.2] - 2026-08-03

#### Added

- **physics:** Add `TerrainCollider`, a static, non-convex 2D ground collider defined by a heightmap of surface points (rolling hills, a canyon profile, any left-to-right surface with more than one slope), resolved via `createBroadPhaseEcsSystem`/`createNarrowPhaseEcsSystem` against `CircleCollider`/`PolygonCollider` bodies exactly like other colliders

## [0.24.1] - 2026-08-03

#### Added

- **physics:** Add revolute (hinge) and prismatic (slider) joints, via `addRevoluteJointComponent`/`createRevoluteJointEcsSystem` and `addPrismaticJointComponent`/`createPrismaticJointEcsSystem`, constraining two entities together with a warm-started, soft-constraint velocity solve, with optional angle/translation limits
- **physics:** Add `AngularVelocityMotorEcsComponent`/`createAngularVelocityMotorEcsSystem`, driving a single entity's angular velocity towards a target speed within a per-tick torque budget
- **physics:** Add `LinearSpringEcsComponent`/`createLinearSpringEcsSystem` and `LinearDamperEcsComponent`/`createLinearDamperEcsSystem`, Hooke's-law and velocity-damping force generators connecting two entities' anchor points, for soft connections like vehicle suspension
- **physics:** Add `applyTorque`, a one-shot torque helper mirroring `applyImpulse` for angular-only forces (a thruster, a scripted nudge)
- **physics:** Add `applyExplosiveForce`, applying a radial impulse (falling off linearly with distance) to every dynamic body within a radius of a point, for area-effect blasts
- **physics:** Add `angularDrag` to `RigidBodyEcsComponent`, damping `angularVelocity` towards `0` every tick (applied by `createEulerIntegrationEcsSystem`); defaults to `0`, so existing bodies are unaffected
- **fphysics:** Add AABB broad-phase and SAT narrow-phase collision detection for `CircleCollider` and the new `PolygonCollider`, via `createBroadPhaseEcsSystem` and `createNarrowPhaseEcsSystem`
- **fphysics:** Add `createCollisionResolutionEcsSystem`, a sequential-impulse collision resolver with soft-constraint penetration correction, Coulomb friction, restitution, and warm-starting of accumulated impulses across ticks; `ColliderEcsComponent` gains `friction`/`restitution` properties

#### Changed

- **physics:** Renamed the physics module's source directory from `fphysics` back to `physics` now that the old physics engine it temporarily coexisted with has been removed; the published `@forge-game-engine/forge/physics` subpath is unchanged, but was previously unresolvable (it pointed at a `dist/physics` output that no longer existed) and is now fixed

#### Fixed

- **physics:** Fix `createCollisionResolutionEcsSystem`'s normal-impulse solve dividing its soft-constraint `impulseScale` correction term by effective mass a second time, making that correction scale with mass² instead of staying mass-invariant. This was unnoticeable for the small test-scale bodies covered by unit tests, but caused massive, growing interpenetration ("sinking"/tunneling through other bodies) for real-world-scale masses, most visibly as balls passing through each other in the Newton's Cradle demo, bricks sinking into each other in the wrecking-ball demo, and the car falling through terrain
- **rendering:** Fix sprites rotating in the opposite direction (mirrored) from their entity's actual `RotationEcsComponent.world`/physics rotation. `position.world.y` is negated when uploaded to the sprite shader (to convert the engine's Y-up world space to the shader's Y-down space), but rotation wasn't given the same treatment, so a positive rotation visually spun the sprite the wrong way relative to its (correctly rotating) collider. This only became visible once colliders had a distinguishable, non-symmetric shape (e.g. a rotating `PolygonCollider` triangle) to reveal the mismatch
- **rendering:** Fix `SpriteEcsComponent.pivot` applying only half of its intended offset (e.g. `pivot: (0, 0)` landed 25% in from the sprite's edge instead of at the edge, and a pivot matching a rotated collider's centroid left the sprite visibly adrift from its own collider - gapping off the ground on one side, sinking into it on another - as the entity rotated). A rendering-pipeline change had widened the vertex quad's coordinate range without widening the pivot term to match; nine-slice sprites were unaffected since they always render their regions with a centered pivot
- **common:** Fix `Time.update` clamping its very first call's delta (the gap between the timestamp's arbitrary clock offset, e.g. a `requestAnimationFrame` timestamp measured from page navigation start, and `Time`'s `0` baseline) against the same oversized-delta guard meant for mid-simulation hitches, permanently offsetting every subsequent `timeInMilliseconds`/`timeInSeconds` value behind the real elapsed time

## [0.24.0] - 2026-07-27

#### Added

- **rendering:** Add `preserveDrawingBuffer` option to `createRenderContext`/`RenderContext`, for consumers that need to read the canvas's pixels back (e.g. `toDataURL`, `drawImage`) after a frame has already been presented
- **rendering:** Add `calculateVisibleWorldSize` to compute the width/height, in world units, a camera's view spans at given destination dimensions, so game logic can size and position things relative to what's actually visible instead of reading canvas pixel dimensions directly

#### Changed

- **rendering:** Cameras now show a fixed number of vertical world units (`verticalWorldUnits`, default `10`) regardless of screen resolution or aspect ratio, replacing the old implicit 1-world-unit-equals-1-pixel behavior. This is a behavior change: existing sprite and physics sizes will render at a different scale until re-tuned to the new default

#### Fixed

- **input:** Fix `MouseInputSource` triggering `TriggerAction` bindings regardless of the active input group, ignoring `InputManager`'s active-group gating that `KeyboardInputSource` and every other action type already respect
- **demos:** Fix the linear-spring-damper, revolute-joint, torque, physics, prismatic-joint, car, wrecking-ball, and Newton's cradle demos naively non-uniformly stretching bordered sprites (ropes, doors, flywheels, walls, cradle frame) instead of nine-slicing them, and tinting already-colored artwork; the wrecking-ball and Newton's cradle demos also now render each ball's crane/pendulum arm, rotating correctly as it swings

## [0.23.1] - 2026-07-24

#### Fixed

- **rendering:** Fix nine-slice sprites rendering their top/bottom border and corner regions vertically flipped relative to their left/right regions, causing distorted or misaligned edges
- **rendering:** Fix nine-slice sprites tearing apart when rotated, instead of rotating as one intact sprite

## [0.23.0] - 2026-07-23

#### Added

- Add LinearSpring and LinearDamper for soft body connections
- **rendering:** Add nine-slice support for sprites
- **demos:** Add car demo
- **physics:** Add TerrainShape for 2D heightmap terrain

## [0.22.2] - 2026-07-20

#### Added

- Add pixelated filtering option for createImageSprite
- Add torque application and angular-velocity motor ECS systems

## [0.22.1] - 2026-07-17

#### Added

- Add Prismatic Joint implementation and demo
- Enhance `GamepadInputSource` to support hot-plugging and last-connected gamepad selection
- Add Wrecking Ball demo and implement RevoluteJoint functionality

## [0.22.0] - 2026-07-14

#### Changed

- Replace the custom shader include syntax with a `#pragma`-based shader pre-processing pipeline

## [0.21.1] - 2026-06-24

#### Added

- Add fullscreen to demos

## [0.21.0] - 2026-06-13

#### Added

- Implement physics simulation with RigidBody and PhysicsWorld
- Add force application API to the physics engine

#### Changed

- Add a physics demo showcasing `RigidBody` and `PhysicsWorld`

## [0.20.1] - 2026-06-09

_No user-facing changes._

## [0.20.0] - 2026-06-02

#### Added

- **ecs:** Add ECS core components, systems, and world implementation

#### Changed

- Add sprite-sheet creation and animation frame-selection utilities, and simplify the animation demo

## [0.19.1] - 2026-04-19

#### Added

- **render-context:** Implement resize method and update viewport handling

## [0.19.0] - 2026-04-18

#### Fixed

- **rendering:** Flip Y axis in screenToWorldSpace

## [0.18.0] - 2026-01-17

#### Added

- **BREAKING:** Replace the ECS implementation with a new architecture, and migrate all built-in components and systems to it

## [0.17.7] - 2026-01-03

#### Added

- Add shooting to spaceshooter demo

## [0.17.6] - 2026-01-01

#### Changed

- Refine animation input types and add lifecycle hooks to the ECS `System`/`World` classes

## [0.17.5] - 2025-12-28

#### Fixed

- Update import paths to include file extensions

## [0.17.4] - 2025-12-28

_No user-facing changes._

## [0.17.3] - 2025-12-27

#### Fixed

- Update default canvas dimensions to use container size

## [0.17.2] - 2025-12-27

#### Fixed

- Update import paths to include file extensions

## [0.17.1] - 2025-12-27

#### Added

- Export render context from index

## [0.17.0] - 2025-12-27

#### Added

- Add render context

## [0.16.0] - 2025-12-20

#### Added

- Adds tint to sprites

#### Fixed

- Fix camera zoom

## [0.15.3] - 2025-12-14

#### Fixed

- Update import path for Transition in AnimationTransition.ts

## [0.15.2] - 2025-12-14

#### Added

- Add finite state machine exports to package.json

## [0.15.1] - 2025-12-14

#### Added

- Implement resizing for render layers and add finite state machine exports

#### Changed

- Simplify the sprite animation system and demo integration

## [0.15.0] - 2025-11-01

#### Changed

- Rename `SoundComponent` to `AudioComponent` and refine the audio system

## [0.14.18] - 2025-11-01

#### Added

- Add BooleanModelProperty type for boolean value representation

## [0.14.17] - 2025-10-27

#### Fixed

- Change error throw to console warning when adding existing system

## [0.14.16] - 2025-10-27

#### Fixed

- Update RenderSystem constructor to use layer name in super call

## [0.14.15] - 2025-10-27

#### Fixed

- Correct system names in constructors for ResetInputSystem and UpdateInputSystem

## [0.14.14] - 2025-10-27

_No user-facing changes._

## [0.14.13] - 2025-10-24

#### Added

- Add .js extensions to all imports for ESM compliance

## [0.14.12] - 2025-10-22

#### Added

- Add error handling for duplicate components and systems in Entity and World classes

## [0.14.11] - 2025-10-21

#### Added

- Implement recursive entity removal in World class

## [0.14.10] - 2025-10-21

_No user-facing changes._

## [0.14.9] - 2025-10-21

_No user-facing changes._

## [0.14.8] - 2025-10-21

#### Added

- Export transform-system from index.ts

## [0.14.7] - 2025-10-20

#### Added

- Convert GLSL files to JavaScript modules in dist for tool-agnostic build

#### Fixed

- Include shader files in package after switching to tsc build

## [0.14.6] - 2025-10-19

#### Fixed

- Update import paths to use index.js for module exports

## [0.14.5] - 2025-10-19

_No user-facing changes._

## [0.14.4] - 2025-10-18

_No user-facing changes._

## [0.14.3] - 2025-10-17

#### Fixed

- Resolve duplicate type definitions in package build

## [0.14.2] - 2025-10-16

_No user-facing changes._

## [0.14.1] - 2025-10-15

#### Added

- Add the `common` module to package exports

## [0.14.0] - 2025-10-15

#### Added

- Add parent-child relationship support for entities
- Add multiple entry points to reduce bundle size
- Add optional parent and enabled parameters to Entity constructor and buildAndAddEntity via EntityOptions

#### Changed

- Move age/scale features into a new `lifecycle` module

## [0.13.3] - 2025-10-08

#### Added

- Added getEntityById to world.ts

## [0.13.2] - 2025-09-30

#### Added

- **math:** Implement radiansToVector function and add tests

## [0.13.1] - 2025-09-30

_No user-facing changes._

## [0.13.0] - 2025-09-20

#### Added

- **math:** Add `radiansToDegrees` and `signedSquare` functions with tests, and implement `smoothDampVector2` for position interpolation

## [0.12.1] - 2025-09-19

#### Fixed

- Make the sprite pivot use a new vector in the constructor

## [0.12.0] - 2025-09-19

#### Added

- **input:** Add mouse input support with 2D axis bindings and cursor value types

## [0.11.0] - 2025-09-18

#### Added

- **input:** Add 1D and 2D axis input bindings and integrate into keyboard input source

## [0.10.0] - 2025-09-18

#### Added

- Add keyboard axis input

## [0.9.0] - 2025-09-16

#### Added

- Add spritesheet animations to entities
- Add particle system with configurable emitters

#### Fixed

- Update sprite vertex shader to normalise the pivot, and apply the pivot before scaling

## [0.8.0] - 2025-07-25

#### Added

- Add input feature

## [0.7.0] - 2025-07-06

#### Changed

- Performance enhancements

## [0.6.0] - 2025-06-30

#### Added

- Add seconds api to time object

## [0.5.10] - 2025-06-28

#### Fixed

- Correct camera position adjustments in CameraSystem and RenderSystem

## [0.5.9] - 2025-06-26

_No user-facing changes._

## [0.5.8] - 2025-06-22

_No user-facing changes._

## [0.5.7] - 2025-06-20

#### Added

- Add world initialization to System and update World to call initialize on added systems

#### Fixed

- Update sprite creation to use `renderLayers[0]` instead of `foregroundRenderLayer.layer`

## [0.5.6] - 2025-06-16

_No user-facing changes._

## [0.5.5] - 2025-06-15

#### Changed

- Update scene design

## [0.5.4] - 2025-06-08

_No user-facing changes._

## [0.5.3] - 2025-06-08

_No user-facing changes._

## [0.5.2] - 2025-06-08

_No user-facing changes._

## [0.5.1] - 2025-06-08

#### Added

- Add a Docusaurus documentation site

## [0.5.0] - 2025-06-08

#### Added

- Add docs

## [0.4.13] - 2025-06-02

_No user-facing changes._

## [0.4.12] - 2025-05-27

_No user-facing changes._

## [0.4.11] - 2025-05-26

_No user-facing changes._

## [0.4.10] - 2025-05-26

_No user-facing changes._

## [0.4.9] - 2025-05-26

_No user-facing changes._

## [0.4.8] - 2025-05-24

_No user-facing changes._

## [0.4.7] - 2025-05-24

#### Fixed

- Ensure correct blending function is set during rendering

## [0.4.6] - 2025-05-24

#### Fixed

- Pass WebGL context to beforeBind method for improved customization

## [0.4.5] - 2025-05-23

#### Fixed

- Improve entity management in updateSystemEntities method

## [0.4.4] - 2025-05-23

#### Fixed

- Fix a bug where a system would not pick up an entity when a matching component was added after the entity was already registered in the world

## [0.4.3] - 2025-05-21

#### Added

- Added hexagon, triangle, octagon, rhombus, trapezoid

## [0.4.2] - 2025-05-20

#### Fixed

- Change listener type from `Promise<void>` to `void`

## [0.4.1] - 2025-05-19

#### Added

- **Time:** Add fps getter to return current frames per second

#### Changed

- Add a Rive data-binding example scene to the demo app

## [0.4.0] - 2025-05-14

#### Added

- Added raycast

## [0.3.5] - 2025-05-10

#### Fixed

- Ensure canvas styles match dimensions on creation

## [0.3.4] - 2025-05-10

_No user-facing changes._

## [0.3.3] - 2025-05-08

#### Added

- Add matterjs

## [0.3.2] - 2025-05-05

#### Added

- Refactor createSprite to use Material and add createImageSprite utility
- Add createScene utility
- Refactor createShipPilotScene and createScene
- Update createScene and createSprite functions to return types

## [0.3.1] - 2025-05-05

#### Fixed

- Added sdfBoxInclude to shaderstore

## [0.3.0] - 2025-05-05

#### Added

- Added sdf box shader

## [0.2.16] - 2025-05-04

_No user-facing changes._

## [0.2.15] - 2025-05-04

_No user-facing changes._

## [0.2.14] - 2025-05-04

_No user-facing changes._

## [0.2.13] - 2025-05-04

_No user-facing changes._

## [0.2.12] - 2025-05-04

#### Added

- Implement CircleCollider class with containment checks and bounding box calculations

## [0.2.11] - 2025-05-03

#### Added

- Enhance Color class to support RGBA and update related tests
- Add Float32Array conversion methods for Color and vector classes

## [0.2.10] - 2025-05-02

#### Added

- Export color module from rendering index

## [0.2.9] - 2025-05-01

#### Added

- Add create-shader-store utility for managing shader includes and shaders

## [0.2.8] - 2025-05-01

_No user-facing changes._

## [0.2.7] - 2025-04-30

#### Added

- Export shaders module in rendering index

## [0.2.6] - 2025-04-30

#### Added

- Refactor addForgeRenderLayers to use LayerDetail type for clarity

## [0.2.5] - 2025-04-30

#### Added

- Support for registering and deregistering multiple updatable and stoppable objects in Scene
- Add functions to create and register multiple Forge render layers with the layer service

## [0.2.4] - 2025-04-29

#### Added

- Add addInputs function and update exports in utilities
- Add buildAndAddEntity method to World class for entity creation
- Add addForgeRenderLayer and addRiveRenderLayer functions for rendering layers
- Remove Camera class and add addCamera utility function for camera setup
- Add createSprite function and update exports in utilities
- Remove unused Stoppable type import from RiveRenderLayer
- Implement Stoppable interface in RiveRenderLayer class

#### Fixed

- Correct canvas ID string in addForgeRenderLayer function

## [0.2.3] - 2025-04-28

#### Added

- Add Vector3 class with basic vector operations and tests
- Add gradient image for enhanced visual presentation
- Implement gradient material and update Perlin noise scene integration

## [0.2.2] - 2025-04-06

#### Added

- Enhance resolveIncludes to handle nested and circular includes
- Enhance resolveIncludes to support resolved variables and prevent duplicate declarations
- Add Perlin noise scene and material with shader includes for rendering
- Implement Perlin noise rendering with shader includes and update random gradient function
- Import Perlin noise scene in game module and update scene exports

## [0.2.1] - 2025-04-05

#### Added

- Implement star system and components, refactor starfield handling in ship pilot scene
- Implement resolveIncludes function for shader include handling and add tests

#### Fixed

- Add definite assignment assertion for velocity in StarComponent
- Improve error messages for shader syntax validation in resolveIncludes

## [0.2.0] - 2025-04-05

#### Added

- Implement ObjectPool class with basic functionality and tests

## [0.1.3] - 2025-04-04

_No user-facing changes._

## [0.1.2] - 2025-04-04

#### Changed

- Migrate from @rive-app/canvas to @rive-app/webgl

## [0.1.1] - 2025-03-30

Initial public release. This release establishes the foundation of the engine, assembled from the project's earliest prototyping.

#### Added

- WebGL2-based rendering pipeline, including sprite shaders, sprite batching, materials, and camera zoom/panning
- Core UI layer: hoverable components, a grid layout system, and a button/sprite factory
- Rive integration for interactive vector animations, with resize/stop/reload controls on `RiveRenderLayer`
- `PolygonCollider` and `Matrix3x3` as initial physics/math primitives
- `ImageCache` for asset loading, later migrated into the asset-loading module
- Ship and starfield entities/components for the initial demo scene

#### Fixed

- Magenta flashing in sprite debug mode, replaced with predefined debug colors
- Box collider calculation to require at least 2 points
- Rounded rectangle rendering line-width handling
- Camera translation and panning direction in `CameraSystem`

