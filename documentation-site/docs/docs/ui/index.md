---
sidebar_position: 12
---

# UI

The `ui` module is a retained-mode, ECS-native UI system built on an
**anchored rect tree**: a hierarchy of rectangle-shaped elements, each
anchored and pivoted against its parent's rectangle, resolved once per
frame by a layout pass, and drawn through the existing sprite/text
rendering pipeline. There's no immediate-mode API and no markup/stylesheet
language - a UI is a plain ECS entity hierarchy, assembled with factory
functions the same way any other composite entity in Forge is.

:::info Current scope
Layout (anchors, canvases, panels, labels), interaction (buttons,
hover/press/drag, gamepad/keyboard focus navigation, color transitions),
controls (toggles, sliders, progress bars, dropdowns), and layout groups
(horizontal/vertical/grid, content size fitting, aspect ratio fitting) are
implemented. Scroll views, text input, and rect clipping aren't yet.
:::

## Quick start

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import {
  createPanel,
  createUiCanvas,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

// Forge doesn't reserve or ship a "UI" render category - pick any bit your
// game isn't already using for another camera, and reuse it everywhere UI
// content needs to match this canvas's cullingMask.
const uiRenderCategory = 1 << 1;

// createUiCanvas registers the UI layout (and, unconditionally, navigation/
// transition) systems itself - call it before registering the transform/
// render systems, so layout runs first each frame. `time` drives its color
// transition tweens.
const canvas = createUiCanvas(world, renderContext, time, {
  cullingMask: uiRenderCategory,
});

const panelSprite = createImageSprite(panelImage, renderContext, {
  slices: { left: 12, right: 12, top: 12, bottom: 12 },
  layer: uiRenderCategory, // matches the UI camera's cullingMask above
});

createPanel(world, canvas, {
  anchor: UiAnchor.topLeft,
  anchoredPosition: { x: 20, y: -20 },
  sizeOrMargin: { x: 240, y: 96 },
  sprite: panelSprite,
});

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
// The UI camera renders into its own off-screen RenderTarget (see below) -
// createPresentEcsSystem is what actually composites it onto the canvas.
world.addSystem(createPresentEcsSystem(renderContext));
```

`createUiCanvas` creates a canvas root entity and a dedicated, static UI
camera - a transparent-cleared, off-screen `RenderTarget` composited onto
the canvas by `createPresentEcsSystem`, isolated from the world by
`cullingMask`/`Renderable.category` (see
[Multipass Rendering](../rendering/multipass-rendering.md) for how the
camera/render-target/present-pass pieces fit together generally).
`cullingMask` has no default - `createUiCanvas` requires it explicitly,
since Forge has no reserved "this bit means UI" value: pick one your game
isn't already using for another camera, and reuse that exact value for
every UI visual's own category. Give a panel's sprite that same category -
`createImageSprite`'s `layer` option sets a sprite's `Renderable.category`,
confusingly by that name (see `SpriteEcsComponent.layer`, a _different_,
draw-order-only field, for the usual meaning of "layer"). Without a
matching category, a world camera whose own `cullingMask` still matches
everything would draw the panel a second time wherever its UI-space
position happens to land in the world.

Text works the same way: `TextEcsComponent.category` defaults to
`TEXT_RENDER_CATEGORY`, shared by every text entity that doesn't override
it - not a value the engine reserves or forces, just an ordinary default,
and one that has nothing to do with any particular UI canvas's
`cullingMask`. [`createLabel`](/Forge/docs/api/functions/createLabel)
doesn't override it either, so a label needs its own `category` passed
explicitly - the same value you gave that canvas's `cullingMask` - to be
visible through it; `createButton`'s `labelCategory` option forwards the
same value to its own child label.

## RectTransform: anchors, pivots, and stretching

Every UI element - including a canvas's own root entity - has a
[`RectTransformEcsComponent`](/Forge/docs/api/type-aliases/RectTransformEcsComponent).
`createUiLayoutEcsSystem` resolves it against its parent's rect once per
frame (top-down, in hierarchy order) and writes the result to
`rectTransform.rect`, the entity's `PositionEcsComponent.local` (so the
existing `createTransformEcsSystem` composes the right
`position.world`), and - for elements with a `SpriteEcsComponent` - the
sprite's `width`/`height`/`pivot`.

Five fields drive resolution:

- **`anchorMin`/`anchorMax`** - normalized points within the parent's rect,
  `(0, 0)` its bottom-left corner and `(1, 1)` its top-right. Equal to each
  other, the element is **point-anchored**: it keeps its own size
  (`sizeOrMargin`) and moves with the anchor. Different, it's
  **stretch-anchored**: it resizes with the parent, and `sizeOrMargin` acts as
  a margin added to the anchor rect instead of a literal size.
- **`pivot`** - the point within the element's own rect that sits at the
  anchor (and that sprites/text position around).
- **`anchoredPosition`** - an offset from the anchor, in reference pixels.
- **`sizeOrMargin`** - the element's literal size when point-anchored, or a
  margin when stretched.

[`UiAnchor`](/Forge/docs/api/variables/UiAnchor) has presets for the common
cases, each setting `anchorMin`/`anchorMax`/`pivot` together: the nine point
anchors (`topLeft`, `topCenter`, `topRight`, `middleLeft`, `center`,
`middleRight`, `bottomLeft`, `bottomCenter`, `bottomRight`), edge-pinned
bands (`stretchTop`, `stretchBottom`, `stretchLeft`, `stretchRight` - the
common "HUD bar" and "side panel" anchors, where `sizeOrMargin` sets the
band's thickness), center bands (`stretchHorizontal`, `stretchVertical`),
`stretchAll`, and a few non-center-pivoted variants - `stretchTopLeft`,
`stretchHorizontalLeft`, and `stretchTopRight` - for when you specifically
want the rect's own local origin on a particular edge rather than the
center (see [Labels](#labels) below). Spread one into `addRectTransformComponent`'s
options, or into `createPanel`/`createLabel`'s `anchor` option:

```ts
addRectTransformComponent(world, entity, {
  ...UiAnchor.stretchTop,
  sizeOrMargin: { x: 0, y: 64 }, // a 64-unit-tall bar spanning the full width
});
```

A HUD top bar and a corner-anchored panel that both hold their layout
correctly across a resize (window resize, aspect ratio change) is the
module's own definition of done for this phase - `createUiLayoutEcsSystem`
does a full recompute every frame rather than tracking dirty state, so
there's no separate resize hook to wire up.

## Coordinate spaces and scale modes

UI world space uses **reference pixels**: author against a fixed
`referenceResolution` (`1920x1080` by default), and the same layout reads
correctly at any actual resolution. `CanvasEcsComponent.scaleMode`
controls how the canvas's root rect - and its camera's
`verticalWorldUnits` - responds to the destination's live size:

- `scaleWithScreenSize` (default) - height stays pinned to
  `referenceResolution.y`; width follows the destination's aspect ratio.
- `matchWidth` - width stays pinned to `referenceResolution.x`; height
  follows the aspect ratio instead.
- `constantPixelSize` - the root rect matches the destination's actual
  pixel size one-to-one (`referenceResolution` is ignored); UI elements
  keep a constant on-screen size at the cost of covering a different
  fraction of the screen on different displays.

## Labels

[`createLabel`](/Forge/docs/api/functions/createLabel) creates a
`RectTransformEcsComponent` + `TextEcsComponent` pair, accepting every
`addTextComponent` option directly (see [Text](../text/index.md) for
`fontAtlas`/shaping details, and its "Quick start" for the shipped default
atlas):

```ts
import { FontAtlasCache } from '@forge-game-engine/forge/text';
import { createLabel, UiAnchor } from '@forge-game-engine/forge/ui';

const fontAtlas = await new FontAtlasCache().getOrLoad(
  'assets/fonts/default.json',
);

createLabel(world, panel, {
  text: 'Play',
  fontAtlas,
  size: 32,
  category: uiRenderCategory,
  // horizontalAlign/verticalAlign (both default to 'left'/'top', i.e. the
  // entity's position is the text's top-left corner) only take effect once
  // maxWidth is set - with no box to align within, a single unwrapped line
  // always starts exactly at the entity's position regardless of
  // horizontalAlign. verticalAlign has no such caveat.
  horizontalAlign: 'center',
  verticalAlign: 'middle',
  // `UiAnchor.middleLeft` is point-anchored, so its `sizeOrMargin` is a
  // literal size - `maxWidth` needs to be set to match it explicitly.
  anchor: UiAnchor.middleLeft,
  sizeOrMargin: { x: 200, y: 40 },
  maxWidth: 200,
});
```

`horizontalAlign`'s alignment box is measured from the entity's own local
`x = 0` - which only lands on the resolved rect's actual left edge for a
`pivot.x: 0` anchor like `middleLeft`. A center-pivoted anchor (`center`,
`topCenter`, `stretchAll`, ...) would offset that box away from the rect's
real bounds, _except_ `createUiLayoutEcsSystem` compensates for this
automatically for any stretch-x anchor (`anchorMin.x !== anchorMax.x`,
e.g. `stretchAll`, `stretchHorizontal`) - it syncs both
`TextEcsComponent.maxWidth` and `horizontalAlignPivot` from the resolved
rect and its pivot every frame, so `horizontalAlign` works correctly under
any pivot for those anchors, with no `maxWidth` to set at all:

```ts
createLabel(world, topBar, {
  text: 'Forge UI Demo',
  fontAtlas,
  size: 40,
  category: uiRenderCategory,
  anchor: UiAnchor.stretchAll,
  // A stretch anchor's default sizeOrMargin ({100, 100}) is a margin, not a
  // literal size - omitting this widens maxWidth past topBar's actual
  // width by 100, off-centering the text instead of centering it.
  sizeOrMargin: { x: 0, y: 0 },
  horizontalAlign: 'center',
  verticalAlign: 'middle',
  // No maxWidth - createUiLayoutEcsSystem derives it (and the pivot
  // correction) from topBar's own resolved rect every frame, so the label
  // stays centered even if topBar itself resizes, and even if the label's
  // own text changes later (e.g. a dropdown header showing a newly-selected
  // option).
});
```

A **point** anchor doesn't get this automatic sync (there's no per-frame
resolved rect to derive it from beyond what `sizeOrMargin` already gives you
statically), so a point-anchored label centering against an explicit
`maxWidth` still needs a `pivot.x: 0` anchor - `middleLeft`,
`topLeft`/`bottomLeft` - as in the example above.
`stretchHorizontalLeft`/`stretchTopLeft`/`stretchTopRight` remain available
for when you specifically want a stretch rect's own local origin pinned to
a particular edge for some other reason (manual position math, a non-text
child), but they're no longer necessary just to make `horizontalAlign`
work.

### Sizing a label to its own text

`createLabel`'s `sizeToText` option attaches a
[`LayoutElementEcsComponent`](/Forge/docs/api/interfaces/LayoutElementEcsComponent)
with `sizeToText: true`, so a parent layout group (see
[Layout groups](#layout-groups) below) measures the label by its own shaped
`TextMeshEcsComponent.bounds` instead of a hand-set `sizeOrMargin`:

```ts
createLabel(world, optionsRow, {
  text: 'Music',
  fontAtlas,
  size: 20,
  sizeToText: true,
});
```

This re-reads the shaped bounds every frame, the same full-recompute model
the rest of this module uses - a label whose text changes at runtime (a
localized string, a live volume percentage) keeps sizing correctly with no
extra work. `sizeToText` requires a `TextEcsComponent` on the same entity
(throwing otherwise - it only applies to text entities). Its shaped
`TextMeshEcsComponent`, added by `createTextShapingEcsSystem` (registered by
`createUiCanvas`) once it actually shapes the label's text, may not exist yet
on the very first tick a brand-new label is created - that tick measures as
zero-width instead of throwing, the same one-frame lag every freshly-created
layout group child already has. An explicit
`LayoutElementEcsComponent.preferredWidth`/`preferredHeight` still overrides
`sizeToText`, the same precedence every other field on that component
already has.

`sizeToText` also defaults `verticalAlign` to `'bottom'` (unless you pass
your own): a layout-arranged child is always forced to a bottom-left pivot
(see [Layout groups](#layout-groups) below), and `verticalAlign`'s own
default (`'top'`) assumes a top pivot instead - without this, the text
renders a full line-height below its own `sizeToText`-measured box rather
than inside it. Pass an explicit `verticalAlign` to opt out (e.g. if you've
overridden the label's own pivot to something other than bottom-anchored).

## Interaction

Two calls put a working, clickable, gamepad/keyboard-navigable button on
screen:

```ts
const canvas = createUiCanvas(world, renderContext, time, {
  cullingMask: uiRenderCategory,
  // Pointer interaction needs a pointer source; omit it for a
  // gamepad/keyboard-only canvas. MouseInputSource satisfies this directly.
  pointerSource: new MouseInputSource(inputManager, game.container),
  // Optional - both InputActions the same way CameraEcsComponent takes
  // zoomInput/panInput. Omitted, the canvas is still fully clickable, just
  // not focus-navigable.
  submitInput: inputManager.getTriggerAction('ui-submit'),
  navigateInput: inputManager.getAxis2dAction('ui-navigate'),
});

const play = createButton(world, canvas, {
  sprite: panelSprite,
  label: 'Play',
  fontAtlas,
  labelSize: 32,
  labelCategory: uiRenderCategory,
});

play.onInvoke.registerListener(startGame);
```

`createButton` assembles a panel (`createPanel`) with a
[`UiInteractableEcsComponent`](/Forge/docs/api/interfaces/UiInteractableEcsComponent)
and a
[`UiColorTransitionEcsComponent`](/Forge/docs/api/interfaces/UiColorTransitionEcsComponent)
added, plus a centered child label - there's no `ButtonEcsComponent`. Every
piece is independently useful: add `UiInteractableEcsComponent` to any rect
(a toggle, a list row, a close icon) to make it clickable, hoverable, and
focus-navigable without it being a "button" at all.

### Source-agnostic invocation

`onInvoke` is raised the same way whether a pointer click, a gamepad/
keyboard submit, or a script (`interactable.onInvoke.raise()`, or
triggering `submitInput` directly) caused it - the listener can't tell
which. `isHovered` (pointer-only) and `isFocused` (source-agnostic - set by
directional navigation, and by the pointer hovering an element, so the
highlight follows the mouse) stay deliberately distinct; a `wasInvokedThisFrame`
flag is available for polling instead of registering a listener.

### Focus navigation

Every `interactable: true` element is automatically focus-navigable: on the
tick `navigateInput`'s magnitude first crosses a threshold, focus moves to
the nearest candidate on the same canvas in that direction. Add a
[`UiFocusEcsComponent`](/Forge/docs/api/interfaces/UiFocusEcsComponent) to
override the search on specific sides (e.g. to wrap focus from the last
item in a row back to the first). `cancelInput` clears focus; register your
own listener on `cancelInput.triggerEvent` for "close this menu" behavior.

### Hit testing and drag

`createUiRaycastEcsSystem` scans interactables topmost-first (reverse
hierarchy order) each tick, publishing `CanvasEcsComponent.hoveredEntity`/
`isPointerOverUi` - read the latter to gate world interaction ("don't fire
the weapon when the click landed on the pause button"). An element with
`blocksRaycasts: false` is transparent to the scan. A captured press that
moves beyond `dragThreshold` (measured in reference pixels) raises
`onBeginDrag`/`onDrag`/`onEndDrag` instead of `onInvoke` - useful for
building a slider handle or a scrollbar thumb.

## Controls

Toggles, sliders, progress bars, and dropdowns build on the same
`UiInteractableEcsComponent`/rect-transform pieces `createButton` does -
each is a plain data component (`UiToggleEcsComponent`,
`UiSliderEcsComponent`, `UiProgressBarEcsComponent`,
`UiDropdownEcsComponent`) plus a `create*` aggregate factory that assembles
the visual pieces around it, the same pattern as `createButton`.

### Toggles

[`createToggle`](/Forge/docs/api/functions/createToggle) creates a box (a
panel, like `createButton`'s background) with a
[`UiToggleEcsComponent`](/Forge/docs/api/interfaces/UiToggleEcsComponent)
added, plus a child checkmark panel whose `SpriteEcsComponent.enabled`
tracks `isOn`:

```ts
const toggle = createToggle(world, canvas, {
  sprite: boxSprite,
  checkmarkSprite: checkSprite,
  isOn: true,
});

toggle.onValueChanged.registerListener((isOn) => {
  musicMuted = !isOn;
});
```

`createUiToggleEcsSystem` (registered automatically by `createUiCanvas`)
flips `isOn` whenever the toggle's `UiInteractableEcsComponent` is invoked -
by a pointer click or a submit action, same as a button. Unlike a button, a
toggle doesn't assemble its own caption label; place one with a separate
`createLabel` call next to it, since where a caption goes (left, right,
above) - and whether one exists at all - varies more than a button's
centered label does.

Pass a shared
[`UiToggleGroupEcsComponent`](/Forge/docs/api/type-aliases/UiToggleGroupEcsComponent)
entity (`addUiToggleGroupComponent`) as `group` to make a set of toggles
mutually exclusive - radio-button behavior by default (`allowSwitchOff:
false`, so exactly one is always on and clicking the active one is a
no-op), or checkbox-like mutual exclusion that still allows none selected
with `allowSwitchOff: true`:

```ts
const difficultyGroup = world.createEntity();
addUiToggleGroupComponent(world, difficultyGroup);

const easy = createToggle(world, canvas, {
  sprite,
  checkmarkSprite,
  group: difficultyGroup,
  isOn: true,
});
const hard = createToggle(world, canvas, {
  sprite,
  checkmarkSprite,
  group: difficultyGroup,
});
```

### Sliders

[`createSlider`](/Forge/docs/api/functions/createSlider) creates a track (a
panel used as the drag surface) with a
[`UiSliderEcsComponent`](/Forge/docs/api/interfaces/UiSliderEcsComponent)
added, plus a child handle and, if `fillSprite` is given, a child fill:

```ts
const volume = createSlider(world, canvas, {
  trackSprite,
  handleSprite,
  fillSprite,
  minValue: 0,
  maxValue: 100,
  value: 75,
  wholeNumbers: true,
});

volume.onValueChanged.registerListener((value) => {
  audio.volume = value / 100;
});
```

The whole track is the drag surface - clicking anywhere on it, not just the
handle, jumps the handle there, and `createUiSliderEcsSystem` (registered
automatically once a `pointerSource` is given to `createUiCanvas`) keeps
tracking the drag even if the pointer strays outside the track's vertical
bounds. Because that system has to run after the interaction pipeline each
tick (it reads this tick's press state) but `createUiLayoutEcsSystem` runs
_before_ it (layout needs last tick's resolved rects for this tick's
raycasting), a value change - from a drag or an external `slider.value =`
write - is reflected one frame later; imperceptible at normal frame rates.

### Progress bars

[`createProgressBar`](/Forge/docs/api/functions/createProgressBar) creates
a track with a
[`UiProgressBarEcsComponent`](/Forge/docs/api/interfaces/UiProgressBarEcsComponent)
added and a child fill, driven purely by `value` - no
`UiInteractableEcsComponent`, since a progress bar reports state rather
than accepting input:

```ts
const health = createProgressBar(world, canvas, {
  trackSprite,
  fillSprite,
  minValue: 0,
  maxValue: playerMaxHealth,
  value: playerHealth,
});

// Later, whenever health changes:
health.progressBar.value = playerHealth;
```

Unlike a slider, `createUiProgressBarEcsSystem` runs _before_
`createUiLayoutEcsSystem` (it has no interaction dependency to wait on), so
a `value` write is reflected the same frame. Only a linear fill is
supported - a radial/clock-wipe fill would need a shader-level fill-amount
uniform, not just a rect resize, and hasn't been built yet.

### Dropdowns

[`createDropdown`](/Forge/docs/api/functions/createDropdown) creates a
header button (`createButton`, showing the currently selected option) with
a
[`UiDropdownEcsComponent`](/Forge/docs/api/interfaces/UiDropdownEcsComponent)
added, plus one option-row button per entry in `options`, stacked below the
header and hidden until it's clicked open. A chevron label sits on the
header's right edge, flipping between `v` (closed) and `^` (open) in step
with `dropdown.isOpen` - the bundled default font atlas is ASCII-only, so
these stand in for a down/up-pointing triangle rather than proper chevron
glyphs:

```ts
const quality = createDropdown(world, canvas, {
  headerSprite,
  optionSprite,
  options: ['Low', 'Medium', 'High'],
  fontAtlas,
  selectedIndex: 1,
});

quality.onValueChanged.registerListener((index) => {
  applyGraphicsPreset(quality.dropdown.options[index]);
});
```

Selecting an option updates the header's label, raises `onValueChanged`,
and closes the list. Unlike toggles and sliders, there's no generic
`createUiDropdownEcsSystem` - opening/closing the list touches several
sibling entities' `enabled`/`interactable` state at once, which only
`createDropdown`'s own wiring (registered as ordinary `onInvoke` listeners,
not a polled system) knows how to reach. Clicking outside the open list
doesn't close it - only clicking the header again or selecting an option
does; register your own listener (e.g. gated on `dropdown.isOpen`) if your
game needs that.

## Layout groups

Every element seen so far is positioned manually - an explicit anchor and
`anchoredPosition`/`sizeOrMargin`. A layout group instead arranges its own
direct children automatically, recomputing every frame just like
`createUiLayoutEcsSystem` itself does:

```ts
import {
  addVerticalLayoutGroupComponent,
  createButton,
  createPanel,
  uiAlignments,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

const menu = createPanel(world, canvas, {
  anchor: UiAnchor.center,
  sizeOrMargin: { x: 320, y: 400 },
  sprite: panelSprite,
});

addVerticalLayoutGroupComponent(world, menu, {
  padding: { left: 24, right: 24, top: 24, bottom: 24 },
  spacing: 16,
  childAlignment: uiAlignments.topCenter,
});

// createUiLayoutGroupEcsSystem (registered automatically by createUiCanvas)
// resizes and stacks every direct child added below - no anchor/sizeOrMargin
// of its own needed.
createButton(world, menu, { sprite: buttonSprite, label: 'Play', fontAtlas });
createButton(world, menu, {
  sprite: buttonSprite,
  label: 'Options',
  fontAtlas,
});
createButton(world, menu, { sprite: buttonSprite, label: 'Quit', fontAtlas });
```

[`addHorizontalLayoutGroupComponent`](/Forge/docs/api/functions/addHorizontalLayoutGroupComponent)/
[`addVerticalLayoutGroupComponent`](/Forge/docs/api/functions/addVerticalLayoutGroupComponent)
arrange direct children left-to-right/top-to-bottom, resizing each one (per
`childControlWidth`/`childControlHeight`) to its measured preferred size -
its own `RectTransformEcsComponent.sizeOrMargin`, unless overridden by a
[`LayoutElementEcsComponent`](/Forge/docs/api/interfaces/LayoutElementEcsComponent)
(`minWidth`/`minHeight`/`preferredWidth`/`preferredHeight`/`flexibleWidth`/
`flexibleHeight`) - plus, by default (`childForceExpandWidth`/
`childForceExpandHeight`), stretching every child to fill the whole cross
axis and distributing any leftover main-axis space, weighted by
`flexibleWidth`/`flexibleHeight` (or evenly, with none set). `childAlignment`
(see [`uiAlignments`](/Forge/docs/api/variables/uiAlignments), named the same
way as `UiAnchor`'s nine point presets) places the child block within any
leftover main-axis space, and aligns each child individually within the
cross axis. A child with `LayoutElementEcsComponent.ignoreLayout: true` is
skipped entirely - useful for a decorative element (a background flourish, a
badge) placed inside an otherwise-arranged panel.

[`addGridLayoutGroupComponent`](/Forge/docs/api/functions/addGridLayoutGroupComponent)
arranges direct children into cells - `constraint` picks whether the column
count is derived from the content box's width (`flexible`, the default) or
held fixed (`fixedColumnCount`/`fixedRowCount`), and `startCorner`/
`startAxis` control placement order. By default (`columnWidthMode`/
`rowHeightMode: 'fixed'`), every cell is exactly `cellSize`, without
measuring its child at all - the original behavior, unchanged.

Setting `columnWidthMode` and/or `rowHeightMode` to `'content'` instead
derives that axis's column/row size from the largest measured preferred size
among the cells placed in it - the same way an HTML `<table>` auto-sizes its
columns. This is the tool for the classic label/control form layout: give
every row a "label" cell and a "control" cell, size the label column to
`'content'`, and every row's control lands at the same x position
automatically, sized to whichever label is actually widest - no hand-computed
offsets:

```ts
import {
  addGridLayoutGroupComponent,
  createLabel,
  createSlider,
  createToggle,
  uiAlignments,
} from '@forge-game-engine/forge/ui';

addGridLayoutGroupComponent(world, optionsGrid, {
  constraint: 'fixedColumnCount',
  constraintCount: 2,
  columnWidthMode: 'content',
  rowHeightMode: 'fixed',
  cellSize: { x: 0, y: 40 }, // x is ignored (content mode); y is every row's fixed height
  spacing: { x: 16, y: 12 },
  cellAlignment: uiAlignments.middleLeft,
});

createLabel(world, optionsGrid, {
  text: 'Music',
  fontAtlas,
  size: 20,
  sizeToText: true,
});
createSlider(world, optionsGrid, {
  /* ... */
});
createLabel(world, optionsGrid, {
  text: 'Fullscreen',
  fontAtlas,
  size: 20,
  sizeToText: true,
});
createToggle(world, optionsGrid, {
  /* ... */
});
```

A cell on a `'content'` axis always keeps its own measured size - unlike a
`'fixed'` cell, it never stretches to fill its column/row - so `cellAlignment`
(a `uiAlignments` preset, same shape as `childAlignment`) controls where a
cell narrower/shorter than its shared column/row sits within it. It has no
effect on a `'fixed'` axis, where a cell always fills `cellSize` exactly.

`columnWidthMode`/`rowHeightMode: 'content'` requires `constraint` to be
`fixedColumnCount` or `fixedRowCount` - `addGridLayoutGroupComponent` throws
for `'flexible'`, since a flexible grid's column count depends on column
width, which would itself depend on column count.

Layout groups nest: a `VerticalLayoutGroupEcsComponent`'s own measured
content size (used when a parent group, or a `ContentSizeFitterEcsComponent`,
asks) comes from recursively measuring its own children, so a horizontal row
of buttons can itself be one "row" inside an outer vertical group.

[`addContentSizeFitterComponent`](/Forge/docs/api/functions/addContentSizeFitterComponent)
resizes its own entity's `sizeOrMargin` to match its measured content on each
axis (`unconstrained` leaves that axis alone; `minSize`/`preferredSize` fit
to it) - pair it with a layout group on the same entity to make a panel
shrink-wrap its arranged children, rather than the fixed size `createPanel`
was given.

[`addAspectRatioFitterComponent`](/Forge/docs/api/functions/addAspectRatioFitterComponent)
keeps an entity's `sizeOrMargin` at a constant width-to-height ratio -
`widthControlsHeight`/`heightControlsWidth` derive one axis from the other;
`fitInParent`/`envelopeParent` derive both from the parent's own resolved
rect, useful for a thumbnail or minimap that shouldn't stretch with its
container.

Every layout group/fitter runs in `createUiLayoutGroupEcsSystem`/
`createUiAspectRatioFitterEcsSystem`, registered automatically by
`createUiCanvas` _before_ `createUiLayoutEcsSystem` - both read
`RectTransformEcsComponent.rect` as it stood at the end of the previous
frame (the same rect `createUiLayoutEcsSystem` is about to recompute this
tick), so a group whose own size just changed (a fresh entity, a nested
group, a content size fitter reacting to a resized child) arranges its
children against a one-frame-stale box. Like the rest of this module, this
converges within a frame or two rather than being tracked with dirty state.

## Known limitations

- **No scroll views or text input yet.** Both are blocked on rect clipping
  ([#583](https://github.com/Forge-Game-Engine/Forge/issues/583)).
- **No clipping.** Content isn't clipped to its parent's rect - a scroll
  view isn't buildable yet.
- **No radial/clock-wipe progress fill.** Only the linear fill
  `createProgressBar` builds is supported; see its section above.
- **A dropdown doesn't close on an outside click.** See its section above.
- **No per-column/row `cellAlignment` on a content-sized grid.** One
  `cellAlignment` applies to every column/row in the grid - there's no way to,
  say, left-align a label column while centering a control column in the same
  grid.
