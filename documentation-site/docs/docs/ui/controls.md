---
sidebar_position: 6
---

# Controls

Toggles, sliders, progress bars and dropdowns each have a data component
(`UiToggleEcsComponent`, `UiSliderEcsComponent`,
`UiProgressBarEcsComponent`, `UiDropdownEcsComponent`) and a `create*`
factory that builds the control's panels and labels around it. Toggles,
sliders and dropdowns are [interactable](buttons-and-interaction.md), so
they respond to the pointer and to focus navigation like buttons do.

## Toggles

[`createToggle`](/Forge/docs/api/functions/createToggle) creates a box with
a [`UiToggleEcsComponent`](/Forge/docs/api/interfaces/UiToggleEcsComponent)
and a child checkmark panel that is drawn while the toggle is on:

```ts
import { createToggle } from '@forge-game-engine/forge/ui';

const musicToggle = createToggle(world, canvas, {
  sprite: boxSprite,
  checkmarkSprite,
  isOn: true,
});

musicToggle.onValueChanged.registerListener((isOn) => {
  settings.musicEnabled = isOn;
});
```

Invoking the toggle flips its `isOn` and raises `onValueChanged` with the
new value. A toggle has no label of its own: place one next to it with
[`createLabel`](labels-and-text.md).

:::caution
Writing `toggle.isOn` directly doesn't raise `onValueChanged`, and
`createToggle`'s checkmark is shown and hidden by an `onValueChanged`
listener that sets its
[`VisibilityEcsComponent`](../rendering/visibility.md), so it keeps its
previous state.
:::

### Grouping toggles

Toggles that share a group are mutually exclusive: turning one on turns the
others off. Add a
[`UiToggleGroupEcsComponent`](/Forge/docs/api/type-aliases/UiToggleGroupEcsComponent)
to any entity and pass that entity as each toggle's `group`:

```ts
import {
  addUiToggleGroupComponent,
  createToggle,
} from '@forge-game-engine/forge/ui';

const difficultyGroup = world.createEntity();

addUiToggleGroupComponent(world, difficultyGroup);

const easyToggle = createToggle(world, canvas, {
  sprite: boxSprite,
  checkmarkSprite,
  group: difficultyGroup,
  isOn: true,
});

const hardToggle = createToggle(world, canvas, {
  sprite: boxSprite,
  checkmarkSprite,
  group: difficultyGroup,
});
```

By default, invoking the toggle that's on does nothing, so one toggle in
the group stays on. With `allowSwitchOff: true`, it turns off, and the
group can have none on.

## Sliders

[`createSlider`](/Forge/docs/api/functions/createSlider) creates a track
with a [`UiSliderEcsComponent`](/Forge/docs/api/interfaces/UiSliderEcsComponent),
a child handle and, if `fillSprite` is given, a child fill:

```ts
import { createSlider } from '@forge-game-engine/forge/ui';

const volumeSlider = createSlider(world, canvas, {
  trackSprite,
  handleSprite,
  fillSprite,
  minValue: 0,
  maxValue: 100,
  value: 75,
  wholeNumbers: true,
});

volumeSlider.onValueChanged.registerListener((value) => {
  settings.musicVolume = value / 100;
});
```

Pressing anywhere on the track sets `value` from the pointer's horizontal
position, and dragging keeps setting it while the press lasts. Each change
raises `onValueChanged`. Every frame, the handle is moved to `value`, and
the fill is revealed from the left up to it by a linear
[mask](../rendering/masks.md), so a nine-slice fill keeps its end caps.
Writing `slider.value` moves the handle and the fill, and doesn't raise
`onValueChanged`.

:::caution
The slider system is registered only when `registerUiSystems` has a
`pointerSource`. Without one, sliders' handles and fills don't move.
:::

## Progress bars

[`createProgressBar`](/Forge/docs/api/functions/createProgressBar) creates a
track with a
[`UiProgressBarEcsComponent`](/Forge/docs/api/interfaces/UiProgressBarEcsComponent)
and a child fill. A progress bar isn't interactable: game code sets its
`value`.

```ts
import { createProgressBar } from '@forge-game-engine/forge/ui';

const healthBar = createProgressBar(world, canvas, {
  trackSprite,
  fillSprite,
  maxValue: 100,
  value: 100,
});

healthBar.progressBar.value = 40;
```

The fill covers the whole track, and a [mask](../rendering/masks.md) on it
reveals the share of it that `value` covers of the range from `minValue` to
`maxValue`. A nine-slice fill keeps its end caps at any value, and elements
parented to the fill are revealed with it.

### Choosing how the fill is revealed

`fillShape` is a linear or radial mask shape without its `amount`. It
defaults to a linear fill from the left. A linear fill can start from any
edge, and a radial fill reveals a sector around the bar's center, for a
ring or a cooldown:

```ts
const cooldownRing = createProgressBar(world, canvas, {
  anchor: UiAnchor.center({ x: 64, y: 64 }),
  trackSprite: ringTrackSprite,
  fillSprite: ringFillSprite,
  fillShape: { kind: 'radial', startAngle: Math.PI / 2, sweep: -2 * Math.PI },
});
```

## Dropdowns

[`createDropdown`](/Forge/docs/api/functions/createDropdown) creates a
header button that shows the selected option, with a
[`UiDropdownEcsComponent`](/Forge/docs/api/interfaces/UiDropdownEcsComponent),
and one option button per entry in `options`, below the header:

```ts
import { createDropdown } from '@forge-game-engine/forge/ui';

const qualityDropdown = createDropdown(world, canvas, {
  headerSprite,
  optionSprite,
  options: ['Low', 'Medium', 'High'],
  fontAtlas,
  labelCategory: uiRenderCategory,
  selectedIndex: 1,
});

qualityDropdown.onValueChanged.registerListener((index) => {
  applyQualityPreset(qualityDropdown.dropdown.options[index]);
});
```

Invoking the header opens or closes the option list, and `dropdown.isOpen`
says which. The option buttons are parented to the dropdown's `list`
entity, and while the list is closed its `VisibilityEcsComponent` hides
them, so they aren't drawn, hit or focused. Invoking an option sets `selectedIndex`, shows the option in
the header, raises `onValueChanged` with its index, and closes the list.
The chevron on the header's right edge is `v` while the list is closed
and `^` while it's open.

:::caution
The `list` entity is a child of the header, so elements that come
after the dropdown in hierarchy order, such as siblings parented after it,
are drawn over the open list and are hit before it. Add a `DrawOrderEcsComponent` with a positive `order` to the
header (see [Draw Order](../rendering/draw-order.md)) to draw the list
over them.
:::

:::note
Clicking outside the open list doesn't close it. Invoking the header or an
option does.
:::
