---
sidebar_position: 17
---

# Animating UI

UI motion is driven entirely through Forge's existing property animation
system, the same `AnimationEcsComponent`/`createAnimatedProperty` machinery
used to animate any other numeric value in the engine. There is no separate
tween engine for UI: `animateUiOpacity`, `popIn`, `startCaretBlink`, and
every other helper in this guide are thin, typed wrappers that push an
`AnimatedProperty` onto the entity and write the interpolated value back
into a `UiRenderableEcsComponent` or `UiTransformEcsComponent` field each
frame.

```ts
import { animateUiOpacity, animateUiScale } from '@forge-game-engine/forge/ui';
import { easeOutBack } from '@forge-game-engine/forge/animations';

animateUiOpacity(world, panelEntity, { to: 1, duration: 200 });
animateUiScale(world, panelEntity, {
  from: 0.8,
  to: 1,
  duration: 250,
  easing: easeOutBack,
});
```

Make sure `createAnimationEcsSystem(time)` is registered on the world, the
same system that drives sprite/transform animations elsewhere, the UI
wrappers don't register their own system.

## Tags prevent stacking

Every typed wrapper (`animateUiOpacity`, `animateUiScale`, `animateUiRotation`,
...) tags its animation with a fixed string (`'ui.opacity'`, `'ui.scale'`,
`'ui.rotation'`, ...). Calling the same wrapper again on an entity that
already has one in flight cancels the previous one first, rather than
stacking two competing animations on the same field. This matters a lot for
hover/press feedback: a user wiggling the pointer in and out of a button
shouldn't queue up a backlog of opacity animations that all have to finish
playing out.

If you call the lower-level [`animateUiProperty`](/Forge/docs/api/functions/animateUiProperty)
directly for a custom field, pass your own `tag` to get the same
cancel-and-replace behaviour; without a tag, repeated calls do stack.

## Presets

[`fadeIn`/`fadeOut`](/Forge/docs/api/functions/fadeIn),
[`popIn`/`popOut`](/Forge/docs/api/functions/popIn), and
[`slideIn`/`slideOut`](/Forge/docs/api/functions/slideIn) cover the common
enter/exit transitions:

```ts
import { popIn, slideOut } from '@forge-game-engine/forge/ui';

popIn(world, dialogEntity); // scale + fade in with an overshoot ease
slideOut(world, toastEntity, { direction: 'right', distance: 300 });
```

`slideIn`/`slideOut` animate `offsetMin`, so they only work as expected on
elements using a point anchor (a fixed-size widget positioned by
`offsetMin`/`offsetMax`); on a stretch-anchored element the offsets mean
something different (margins, not position) and the slide will distort the
element's size instead of moving it. See [Layout and Anchors](./layout-and-anchors.md#point-anchors-vs-stretch-anchors).

To remove a widget once its exit animation finishes, use
[`destroyWithFadeOut`/`destroyWithPopOut`/`destroyWithSlideOut`](/Forge/docs/api/functions/destroyWithFadeOut)
instead of calling the preset and `destroy()` separately:

```ts
import { destroyWithPopOut } from '@forge-game-engine/forge/ui';

destroyWithPopOut(world, toastHandle.entity);
```

These call `destroyUiSubtree` from the animation's `onFinished` callback, so
the entity is never removed mid-animation (which would otherwise leave the
animation system holding a reference to a renderable/transform component
that no longer exists).

## Idle animations

[`startCaretBlink`](/Forge/docs/api/functions/startCaretBlink),
[`startFocusPulse`](/Forge/docs/api/functions/startFocusPulse), and
[`startLoadingSpinner`](/Forge/docs/api/functions/startLoadingSpinner) start
an indefinite looping animation (text caret blink, a pulsing focus ring, a
spinner) and return a stop function:

```ts
import { startLoadingSpinner } from '@forge-game-engine/forge/ui';

const stopSpinner = startLoadingSpinner(world, spinnerIconEntity);

// later, once loading completes:
stopSpinner();
```

Always keep the returned stop function and call it when the widget is
removed or the loading state ends. An idle animation with `loopCount: -1`
runs forever and is not implicitly stopped by `destroyUiSubtree`, since the
animation lives on `AnimationEcsComponent`, not on a relationship the
destroy logic inspects; an orphaned infinite loop on a still-live entity
elsewhere in the tree is a real, easy-to-introduce leak.

## Animated state transitions

[`createUiStateTransition`](/Forge/docs/api/functions/createUiStateTransition)
is the animated counterpart to the snap `applyUiStateStyle` that widget
factories use by default: instead of jumping straight to the hover/press/
focus/disabled style, it animates toward it.

```ts
import { createUiStateTransition } from '@forge-game-engine/forge/ui';

const stopTransitions = createUiStateTransition(
  world,
  buttonHandle.entity,
  renderableComponent,
  buttonHandle.state,
  baseStyle,
  { hover: { tintColor: hoverTint }, pressed: { tintColor: pressedTint } },
  { duration: 120 },
);
```

It registers listeners on all seven state events
(`onHoverEnter`/`onHoverExit`/`onPressStart`/`onPressEnd`/`onFocus`/
`onBlur`/`onDisabledChange`) and computes the target style with the same
priority order `applyUiStateStyle` uses internally (`base`, then hover, then
focused, then pressed, then disabled, each layering on top of the last), so
swapping one for the other doesn't change which state wins when several are
active at once. Call the returned cleanup function when the widget is
destroyed, in addition to (not instead of) the widget's own `destroy()`,
since these are listeners on the state component that `destroy()` doesn't
know about unless you also clear them yourself.

## Common mistake

Animating `offsetMin`/`offsetMax`/`rotation`/`scale` directly by mutating
the transform every frame in your own system, instead of through
`animateUiProperty` or one of its wrappers:

```ts
// Wrong: hand-rolled animation competes with the animation system for the
// same field, and won't be cancelled/replaced by tag like the rest of the UI.
let t = 0;
function tick(dt: number) {
  t += dt;
  transform.offsetMin.x = lerp(start, end, t / duration);
  transform.isDirty = true;
}

// Right: let the existing animation system own the interpolation.
animateUiOffsetMinX(world, entity, { from: start, to: end, duration: durationMs });
```

The wrappers already set `isDirty = true` for you on every update, so the
layout system picks up the change the same frame.

## Performance

Each `animateUiProperty` call adds one entry to the entity's
`AnimationEcsComponent.animations` array; the animation system removes
finished, non-looping entries automatically. Hundreds of simultaneous UI
animations (e.g. a staggered list entrance) are cheap, the cost is a linear
scan per entity per frame, not per animation globally. See
[UI Performance](./ui-performance.md) for how this was measured under load.
