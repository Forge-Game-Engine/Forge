---
sidebar_position: 9
---

# Text Input

A text input is a single-line field the player types into. The typing goes
to a hidden HTML `<input>` the field owns, so keyboard layouts, IME
composition, paste, phone keyboards and screen readers work the way they
do in any web page, and the field draws its text, caret and selection with
ordinary UI entities.

## Parts of a text input

[`createTextInput`](/Forge/docs/api/functions/createTextInput) creates:

- a background panel with a
  [`UiInteractableEcsComponent`](/Forge/docs/api/interfaces/UiInteractableEcsComponent),
  so the field is hoverable, focusable and reachable by navigation like a
  button;
- a [`TextInputEcsComponent`](/Forge/docs/api/interfaces/TextInputEcsComponent)
  on the same entity, holding the field's `value`, its `isEditing` state,
  its settings and its events;
- a [`TextEntry`](/Forge/docs/api/interfaces/TextEntry) (the
  component's `entry`): the hidden `<input>`, added to the element the
  game's canvas is in;
- child entities for the text label, the placeholder label, the caret, the
  selection highlight and the IME composition underline.

`registerUiSystems` registers `createUiTextInputEcsSystem`, which runs
every field.

## Creating a text input

```ts
import { createTextInput, UiAnchor } from '@forge-game-engine/forge/ui';

const nameField = createTextInput(world, canvas, {
  renderContext,
  sprite: fieldSprite,
  fillSprite: whiteSprite,
  fontAtlas,
  size: 28,
  anchor: UiAnchor.center({ x: 420, y: 64 }),
  placeholder: 'Your name',
  maxLength: 16,
  attributes: { ariaLabel: 'Your name', autocapitalize: 'words' },
  category: uiRenderCategory,
});
```

`sprite` draws the background. `fillSprite` is a plain sprite (a white
pixel, for example) that the caret, the selection and the composition
underline are drawn with, tinted by `caretColor` and `selectionColor`.
`attributes` are set on the hidden input: phone keyboards read them
(`inputMode`, `autocapitalize`, `enterKeyHint`) and screen readers announce
`ariaLabel`.

:::caution
A field doesn't scroll or clip text that's wider than it. Pick a
`maxLength` whose longest value fits the field's width.
:::

## Editing and focus

Editing is separate from UI focus. A field is being edited while its hidden
input has focus, and `isEditing` is `true` exactly then. Editing starts
when:

- the player clicks or taps the field;
- the canvas's `submitInput` triggers while the field has UI focus;
- the game calls [`editTextInput`](/Forge/docs/api/functions/editTextInput).

Editing ends when the player presses Enter or Escape, or when the browser
takes focus away from the input (a click elsewhere, a phone keyboard's
"Done" key, switching tabs). Moving UI focus, by hovering or navigating to
another element, doesn't end editing, so a game can keep UI focus on a
submit button while the player types.

```ts
import { editTextInput } from '@forge-game-engine/forge/ui';

editTextInput(world, nameField.entity);
```

A field that isn't interactable, or whose canvas group isn't, can't be
edited.

:::note
A phone only opens its keyboard when an input is focused inside the event
handler of a user gesture. A tap on a field focuses its input inside the
tap's `pointerup` handler, using the same hit test as every other UI
pointer interaction, so the keyboard opens. `editTextInput` called from a
system runs outside any gesture, so it focuses the field without opening a
phone keyboard.
:::

Keys typed into the field aren't game input:
[`KeyboardInputSource`](../input/keyboard.md) ignores keys typed into an
editable element, so the canvas's keyboard-bound `navigateInput` and
`submitInput` don't trigger while the player types. Tab does nothing inside
a field. A gamepad still navigates UI focus.

The text label and placeholder have `richText` set to `false`, so text the
player types is drawn as written: typing `<b>` doesn't make the text bold.

## Reading the value

`value` holds the field's text. It's updated by the text input system, once
per tick, from what was typed:

1. Characters the field's font atlas has no glyph for are removed (spaces
   are kept).
2. The field's `filter`, if it has one, runs on the result.
3. The result is cut to `maxLength`.

If filtering changed the text, the filtered text is written back to the
hidden input, with the caret after the same characters. Text that's still
being composed with an IME is drawn, underlined, but isn't filtered or
part of `value` until the composition ends.

```ts
const codeField = createTextInput(world, canvas, {
  // ...
  filter: (text) => text.toUpperCase(),
});
```

## Setting the value

[`setTextInputValue`](/Forge/docs/api/functions/setTextInputValue) replaces
a field's text, for example to clear or prefill it. The text goes through
the same filters as typed text, and `value` and `onValueChanged` update on
the next tick.

```ts
import { setTextInputValue } from '@forge-game-engine/forge/ui';

setTextInputValue(world, nameField.entity, '');
```

## Reacting to changes, submit and cancel

```ts
nameField.onValueChanged.registerListener((value) => {
  previewLabelText.text = value;
});

nameField.onSubmit.registerListener((value) => {
  savePlayerName(value);
});

nameField.onCancel.registerListener(() => {
  closeNamePanel();
});
```

- `onValueChanged` is raised with the new `value` whenever it changes.
- `onSubmit` is raised with `value` when the player presses Enter outside
  an IME composition. Holding Enter submits once.
- `onCancel` is raised when the player presses Escape outside an IME
  composition. `value` is kept.

Enter and Escape during an IME composition commit or cancel the
composition, and don't submit or cancel the field.

## Placeholder

The placeholder label is drawn instead of the text while the field is
empty. Its text and color are the `placeholder` and `placeholderColor`
options; change them later through the label's
[`TextEcsComponent`](/Forge/docs/api/interfaces/TextEcsComponent)
(`nameField.placeholderLabel`).

## Caret and selection

The caret and the selection highlight are placed from the text label's
[`TextMeshEcsComponent.caretStops`](/Forge/docs/api/interfaces/TextMeshEcsComponent#caretstops):
the position of every boundary between characters in the shaped text. The
caret blinks while the field is being edited, and restarts its blink when
the text or the selection changes. Selection uses the keyboard (Shift with
the arrow keys, or select-all); the hidden input doesn't receive pointer
drags.

## Removing a text input

Removing the field's entity, or its `TextInputEcsComponent`, removes its
hidden input on the next tick. When the text input system is removed from
the world, or the world is stopped, every field's hidden input is removed.
