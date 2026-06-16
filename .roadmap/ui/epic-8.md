# Epic 8 — UI Animation Integration

Drive UI motion — transitions, hover/press feedback, open/close, caret blink,
etc. — through the **existing property animation system**, with **no separate
tween engine**. Plus examples, demos, and guides for animating UI properties.

## Status

- **Phase:** 5 — Animation, Performance & Documentation
- **Depends on:** the existing animation module
  ([AnimationEcsComponent](../../src/animations/components/animation-component.ts),
  [animation-system.ts](../../src/animations/systems/animation-system.ts),
  [createAnimatedProperty](../../src/animations/components/animation-component.ts),
  [easing-functions](../../src/animations/easing-functions/)), and every prior
  UI epic (it animates their state/style/layout).
- **Hard constraint:** reuse the property animation system. Do **not** add a
  bespoke tween layer.

## Architectural notes

- The animation system iterates `AnimationEcsComponent.animations` (each a
  `Required<AnimatedProperty>`), advancing `elapsed`, computing
  `start + (end - start) * easing(t)`, and invoking `updateCallback(value)` —
  values are **numbers**. To animate a UI property you push an
  `AnimatedProperty` whose `updateCallback` writes that number into a UI
  component field (then marks layout/render dirty). Vectors/colors animate as
  several scalar properties (one per channel) or via a small helper.

---

## Features

### F8.1 — UI property animation helpers

**Goal:** ergonomic, type-safe helpers to animate UI fields without hand-writing
`updateCallback`s everywhere.

**Implementation detail:**
- Add `animateUiProperty(world, entity, { getComponent, set, from?, to,
  duration, easing?, loop?, onFinished? })` that builds a
  `Required<AnimatedProperty>` via `createAnimatedProperty` and pushes it onto
  the entity's `AnimationEcsComponent` (creating the component if absent). The
  `updateCallback` calls `set(value)` and flags the relevant dirty bit (UI
  transform dirty for layout-affecting fields; renderable style for visual
  fields).
- Add typed convenience wrappers: `animateUiOpacity`, `animateUiScale`,
  `animateUiPosition`/`offset`, `animateUiTint`/`animateUiColor` (color animates
  r/g/b/a as 4 properties, or lerps via a single 0→1 driver calling
  `Color.lerp`), `animateUiCornerRadius`, `animateUiRotation`.
- Respect "defaults in a `default…` object" and existing `LoopMode`
  (`none`/`loop`/`pingpong`) — pingpong is ideal for pulsing/caret blink.

### F8.2 — State-driven transition animations

**Goal:** make Epic 4 state changes animate instead of snap, consistently across
all widgets.

**Implementation detail:**
- Replace the snap in Epic 5's `applyUiStateStyle` with an animated version:
  subscribe to `UiStateEcsComponent` events (`onHoverEnter/Exit`,
  `onPressStart/End`, `onFocus/Blur`, `onDisabledChange`) and on each transition
  start an `animateUiProperty` toward the theme's target style for that state
  (Epic 6 `UiTheme`).
- Provide a small declarative `UiTransitionSpec` (per-state target style +
  duration + easing) attached via a component/theme so widgets share one
  mechanism. **Cancel/replace** any in-flight animation for the same property to
  avoid stacking (e.g. rapid hover-in/out) — important for Epic 9 robustness.
- Because everything routes through the existing animation system, these
  transitions are visible to the same update/stop lifecycle as gameplay
  animations.

### F8.3 — Open/close & layout animations

**Goal:** entrance/exit and container motion for dropdowns, popups, panels,
scroll.

**Implementation detail:**
- Provide reusable presets: `fadeIn/fadeOut` (opacity), `popIn/popOut`
  (scale + opacity with `ease-in-back`/`ease-out`), `slideIn/slideOut` (offset),
  used by Epic 7 dropdown open/close and modal panels.
- Animate scroll position (`UiScrollEcsComponent.scroll`) for smooth
  programmatic scrolling / ensure-visible, and animate the slider knob to snapped
  positions (Epic 5).
- For exit animations, sequence teardown: play the exit, then call the widget's
  `destroy()` (Epic 6) in the animation's `finishedCallback` so the entity isn't
  removed mid-animation.

### F8.4 — Caret/idle/looping effects

**Goal:** the small continuous animations widgets need.

**Implementation detail:**
- Caret blink (Epic 7 input box) as a `pingpong`/`loop` opacity animation;
  focus-ring pulse; loading spinners (animate rotation). All via F8.1 helpers —
  zero bespoke timers.

### F8.5 — Examples, demos & guides

**Goal:** satisfy the roadmap's explicit "examples, demos, and guides for
animating UI properties."

**Implementation detail:**
- A dedicated demo scene animating opacity/scale/position/color/corner-radius,
  plus state-transition and open/close presets, with controls to tweak
  duration/easing live.
- A guide "Animating UI" showing the helper API, the easing catalog
  ([easing-functions](../../src/animations/easing-functions/)), loop modes, and
  the cancel-in-flight pattern; emphasize that UI motion uses the **same** system
  as the rest of the engine.

---

## Cross-cutting (definition of done)

- Unit tests for: each helper pushes a correct `Required<AnimatedProperty>` and
  its `updateCallback` writes the expected field + sets dirty flags; color/vector
  decomposition reaches the right endpoints; cancel/replace removes the prior
  animation; exit-then-destroy ordering via `finishedCallback`. Drive time with a
  mock `Time` exactly as the existing animation tests do.
- Documentation guide (F8.5) + JSDoc on all helpers/presets.
- Demos as in F8.5, plus retrofitting Epic 5/7 demos to use animated transitions.
- Exports updated in `src/ui/index.ts`, `src/index.ts`, `package.json`.
- Audit: **no `setInterval`/`requestAnimationFrame`/bespoke tween** anywhere in
  `src/ui` — all motion goes through the animation system.
