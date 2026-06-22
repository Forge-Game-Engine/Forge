---
sidebar_position: 13
---

# Composing Widgets

Every `createUiX` factory in the UI stack, panels, buttons, checkboxes,
sliders, scroll groups, follows the same shape and is built from the same
small set of low-level helpers. This guide covers that contract so a new
composite widget you write fits the rest of the stack: callers can
`destroy()` it, batch it, theme it, and subscribe to its events the same
way they would for `createUiButton`.

## The `UiWidgetHandle` contract

[`UiWidgetHandle<TParts, TEvents>`](/Forge/docs/api/interfaces/UiWidgetHandle)
is the return shape every factory commits to:

```ts
interface UiWidgetHandle<TParts, TEvents> {
  entity: number;
  parts: TParts;
  events: TEvents;
  destroy(): void;
}
```

- `entity` is the root entity id of the widget's subtree.
- `parts` exposes named child entity ids (or nested handles), `{ label: number }`
  for a button, `{ fill: number; knob: number }` for a slider, `{}` for a
  plain panel with no children.
- `events` exposes the widget's primary `ParameterizedForgeEvent`s
  (`onClick`, `onChange`, ...) so callers can subscribe without reaching
  into the underlying component bag.
- `destroy()` tears down the entire subtree and clears every listener the
  factory registered.

Factories also return extra named fields beyond the handle shape when it
reads better at the call site, `createUiButton` returns `labelEntity` and
`state` directly, not just `parts.label` and a generic state lookup, but
the four fields above are always present, and any code generic over
"some widget" can rely on just those four.

## The low-level assembly helpers

[`createUiElement`](/Forge/docs/api/functions/createUiElement) is the
building block under every factory: it creates one entity with a transform,
and optionally attaches a renderable (`style`), interaction components
(`interactable`), and focus (`focusable`, which implies `interactable`).
Every `createUiPanel`/`createUiButton`/`createUiCheckbox`/`createUiSlider`
call is, underneath, a handful of `createUiElement`-equivalent entity
creations followed by event wiring; reach for it directly when assembling a
custom widget instead of hand-rolling the transform/renderable/interactable
boilerplate that `createUiPanel` itself wraps:

```ts
const { entity, transform, renderable, state } = createUiElement(world, {
  rect: { x: 0, y: 0, width: 200, height: 40 },
  style: { renderable: bgRenderable, tintColor: Color.white },
  interactable: { blocksPointer: true },
});
```

[`addUiChild`](/Forge/docs/api/functions/addUiChild) (and the equivalent
[`setUiParent`](/Forge/docs/api/functions/setUiParent)) attach or move the
`ParentEcsComponent` that the rest of the stack, layout, clipping,
`destroyUiSubtree`, relies on to find an entity's children. Use it instead
of attaching `parentId` by hand, both because it reads clearly at the call
site and because re-parenting (for example, moving a dropdown's popup panel
to the canvas root so it isn't clipped by its trigger's container) is then
a single call rather than a manual component swap.

## `destroyUiSubtree` and why factories call it from their own `destroy()`

[`destroyUiSubtree`](/Forge/docs/api/functions/destroyUiSubtree) walks the
`ParentEcsComponent` hierarchy depth-first and removes every descendant
entity before removing the root. Every factory's `destroy()` calls it on
the root entity rather than `world.removeEntity(entity)` directly, for two
reasons:

1. **Child entities would otherwise leak.** A button's label, a checkbox's
   check mark, a slider's fill and knob, are separate entities tied to the
   root only by `ParentEcsComponent`. Removing just the root leaves those
   children alive in the world with no parent to ever clean them up.
2. **Event listeners on `ParameterizedForgeEvent`s would otherwise leak.**
   `removeEntity` deletes component data from the ECS's sparse sets, but a
   `UiStateEcsComponent`'s `onClick`/`onHoverEnter`/... events are plain
   objects with their own listener arrays; removing the component doesn't
   call `.clear()` on them. A widget's `destroy()` always clears its own
   events (`state.onHoverEnter.clear()`, `checkbox.onChange.clear()`, ...)
   *before* calling `destroyUiSubtree`, so a closure captured by a listener
   isn't kept alive by a dangling registration.

A composite widget you write should follow the same order: clear every
event your factory registered a listener on or exposed through `events`,
then call `destroyUiSubtree(world, entity)` on the root.

## Sharing style with `UiTheme`

[`UiTheme`](/Forge/docs/api/interfaces/UiTheme) and
[`defaultUiTheme`](/Forge/docs/api/variables/defaultUiTheme) hold the shared
palette (`backgroundColor`, `primaryColor`, `borderColor`, `cornerRadius`,
`stateStyles`, ...) a set of composed widgets should agree on instead of
each hardcoding its own `Color` literals.
[`uiThemeToBaseStyle`](/Forge/docs/api/functions/uiThemeToBaseStyle) maps a
theme onto the `UiStyleOverride` shape `createUiPanel`/`createUiButton`/etc
accept, and [`mergeUiStyle`](/Forge/docs/api/functions/mergeUiStyle) layers
a widget's own overrides on top:

```ts
import { defaultUiTheme, mergeUiStyle, uiThemeToBaseStyle } from '@forge-game-engine/forge/ui';

const baseStyle = uiThemeToBaseStyle(defaultUiTheme);
const dangerButtonStyle = mergeUiStyle(baseStyle, { tintColor: Color.fromHSLA(0, 70, 45, 1) });
```

Pass a `theme` through your own widget's options and call
`uiThemeToBaseStyle`/`mergeUiStyle` the same way internally, rather than
accepting only raw `Color` options, so a caller theming an entire screen
doesn't have to override every composed widget's colors individually.

## Worked example: composing a labelled stat row

This combines [`createUiPanel`](./panels.md) and `createUiText` the same
way `createUiButton` internally composes a background panel and a text
label, but as a standalone factory that follows the `UiWidgetHandle`
contract so it slots into the rest of the stack:

```ts
import {
  createUiPanel,
  createUiSlider,
  createUiText,
  destroyUiSubtree,
  UiWidgetHandle,
} from '@forge-game-engine/forge/ui';
import type { FontAsset, UiInstanceComponents } from '@forge-game-engine/forge/ui';
import type { EcsWorld } from '@forge-game-engine/forge/ecs';
import type { Renderable, RenderContext } from '@forge-game-engine/forge/rendering';

interface CreateStatRowOptions {
  renderable: Renderable<UiInstanceComponents>;
  renderContext: RenderContext;
  font: FontAsset;
  label: string;
  parent: number;
  rect: { x: number; y: number; width: number; height: number };
  knobWidth: number;
  knobHeight: number;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

type StatRowHandle = UiWidgetHandle<
  { label: number; slider: ReturnType<typeof createUiSlider> },
  { onChange: ReturnType<typeof createUiSlider>['events']['onChange'] }
>;

function createStatRow(world: EcsWorld, options: CreateStatRowOptions): StatRowHandle {
  const { renderable, renderContext, font, label, parent, rect, value, min, max, onChange } =
    options;

  // Root: a bare panel purely for layout, no fill of its own.
  const { entity } = createUiPanel(world, {
    renderable,
    rect,
    parent,
    opacity: 0,
  });

  const labelEntity = createUiText(world, renderContext, {
    text: label,
    font,
    fontSize: 14,
    rect: { x: 0, y: 0, width: rect.width * 0.4, height: rect.height },
    parent: entity,
  });

  const slider = createUiSlider(world, {
    renderable,
    fillRenderable: renderable,
    knobRenderable: renderable,
    knobWidth: options.knobWidth,
    knobHeight: options.knobHeight,
    rect: {
      x: rect.width * 0.4,
      y: rect.height / 2 - 4,
      width: rect.width * 0.6,
      height: 8,
    },
    parent: entity,
    value,
    min,
    max,
    onChange: (event) => onChange(event.value),
  });

  return {
    entity,
    parts: { label: labelEntity, slider },
    events: { onChange: slider.events.onChange },
    destroy: (): void => {
      slider.destroy();
      destroyUiSubtree(world, entity);
    },
  };
}
```

A few choices worth calling out:

- The root panel uses `opacity: 0`, it exists only to give the label and
  slider a shared parent and a single entity to position/destroy as a
  unit, the same reason `createUiButton`'s root entity is the background
  rather than a separate invisible container.
- `destroy()` calls the **child widget's own `destroy()`** (`slider.destroy()`)
  before `destroyUiSubtree` on the root. `slider.destroy()` already clears
  the slider's own listeners and removes its fill/knob children; calling
  `destroyUiSubtree(world, entity)` afterward removes the label and the
  root panel, which by then no longer has the slider's entities under it
  to walk into (they're already gone). Composing widgets out of other
  widgets means delegating teardown the same way, not flattening
  everything into one `destroyUiSubtree` call and hoping the listeners
  sort themselves out.
- `events.onChange` forwards the inner slider's event directly rather than
  wrapping it in a new `ParameterizedForgeEvent`, since nothing about the
  payload needs to change; only add a wrapper event when a composite
  widget's "change" means something the inner widget's event doesn't
  already express.

See [Panels](./panels.md), [Buttons](./buttons.md), [Checkboxes](./checkboxes.md),
and [Sliders](./sliders.md) for the primitives this guide builds on, and
[Default Styling](./default-styling.md) for the `UiStyleOverride` fields
`mergeUiStyle` operates on.
