---
sidebar_position: 6
---

# Controls

Toggles, sliders, progress bars, and dropdowns build on the same
`UiInteractableEcsComponent`/rect-transform pieces `createButton` does -
each is a plain data component (`UiToggleEcsComponent`,
`UiSliderEcsComponent`, `UiProgressBarEcsComponent`,
`UiDropdownEcsComponent`) plus a `create*` aggregate factory that assembles
the visual pieces around it, the same pattern as `createButton` (see
[Buttons and Interaction](./buttons-and-interaction.md)).

## Toggles

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

`createUiToggleEcsSystem` (registered by `registerUiSystems`) flips `isOn`
whenever the toggle's `UiInteractableEcsComponent` is invoked - by a
pointer click or a submit action, same as a button. Unlike a button, a
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

## Sliders

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
by `registerUiSystems` once a `pointerSource` is given) keeps tracking the
drag even if the pointer strays outside the track's vertical bounds.
Because that system has to run after the interaction pipeline each tick
(it reads this tick's press state) but `createUiLayoutEcsSystem` runs
_before_ it (layout needs last tick's resolved rects for this tick's
raycasting), a value change - from a drag or an external `slider.value =`
write - is reflected one frame later; imperceptible at normal frame rates.

## Progress bars

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
a `value` write is reflected the same frame. The fill is linear (the fill
child's rect grows/shrinks along one axis) - there's no radial/clock-wipe
fill mode.

## Dropdowns

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
not a polled system) knows how to reach.

:::info[Known limitation]
Clicking outside the open list doesn't close it - only clicking the header
again or selecting an option does. Register your own listener (e.g. gated
on `dropdown.isOpen`) if your game needs that.
:::
