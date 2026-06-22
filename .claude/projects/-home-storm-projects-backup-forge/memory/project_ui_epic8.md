---
name: project-ui-epic8
description: UI Epic 8 — Animation Integration implemented on 2026-06-17; animateUiProperty helpers, state transitions, presets, idle animations
metadata:
  type: project
---

UI Epic 8 (Animation Integration) implemented on 2026-06-17. All features route through the existing animation system (`AnimationEcsComponent`/`createAnimatedProperty`) — zero bespoke tween layer.

**Why:** Epic 8 mandates reuse of the property animation system for all UI motion.
**How to apply:** Use helpers below for any new animated UI work; never add `setInterval`/`requestAnimationFrame` inside `src/ui`.

## What was added

### Foundation changes
- `AnimatedProperty.tag?: string` — cancel/replace animations by tag (default `''` in `animationDefaults`)
- `Color.lerp(a, b, t)` — used by color animation wrappers
- `easeOutBack.ts` — new easing function for pop-in overshoot

### F8.1 — `src/ui/utilities/animate-ui-property.ts`
Core helper + typed wrappers:
- `animateUiProperty(world, entity, options)` — pushes `AnimatedProperty`, cancel/replace by tag
- `cancelUiPropertyAnimation(world, entity, tag)` — removes animations matching tag
- Renderable wrappers: `animateUiOpacity`, `animateUiCornerRadius`, `animateUiBorderWidth`, `animateUiTintColor`, `animateUiBorderColor`
- Transform wrappers: `animateUiScale`, `animateUiScaleX`, `animateUiScaleY`, `animateUiRotation`, `animateUiOffsetMinX/Y`, `animateUiOffsetMaxX/Y`

### F8.2 — `src/ui/utilities/create-ui-state-transition.ts`
- `UiTransitionSpec { duration, easing? }`
- `computeUiTargetStyle(state, base, config)` — returns target style for current flags
- `createUiStateTransition(world, entity, renderable, state, base, config, transition?)` — registers animated listeners on all state events; returns cleanup fn

### F8.3 — `src/ui/utilities/ui-animation-presets.ts`
- `fadeIn / fadeOut` — opacity 0→1 / 1→0
- `popIn / popOut` — scale+opacity with `easeOutBack` / `easeInBack`
- `slideIn / slideOut` — offsetMin animation in given direction
- `animateScrollTo(world, viewportEntity, target, options?)` — smooth scroll
- `destroyWithFadeOut / destroyWithPopOut / destroyWithSlideOut` — exit + destroyUiSubtree in finishedCallback

### F8.4 — `src/ui/utilities/ui-idle-animations.ts`
- `startCaretBlink(world, entity, options?)` → stop fn — pingpong opacity
- `startFocusPulse(world, entity, options?)` → stop fn — pingpong borderWidth
- `startLoadingSpinner(world, entity, options?)` → stop fn — loop rotation 0→2π

All exports added to `src/ui/utilities/index.ts` → `src/ui/index.ts` → `src/index.ts`.

[[project-ui-epic1]]
