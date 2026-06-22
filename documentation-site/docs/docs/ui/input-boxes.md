---
sidebar_position: 15
---

# Input Boxes

[`createUiInputBox`](/Forge/docs/api/functions/createUiInputBox) builds an
editable text field: a clipped background panel with a text label, a caret,
and a selection highlight. Use it for anything a player types into, a
username field, a chat box, a search filter, a password prompt, rather than
a read-only [text element](./text-rendering.md).

```ts
import { createUiInputBox, createUiRenderable } from '@forge-game-engine/forge/ui';

const inputRenderable = createUiRenderable(renderContext);
const caretRenderable = createUiRenderable(renderContext);
const selectionRenderable = createUiRenderable(renderContext);

const usernameField = createUiInputBox(world, {
  renderable: inputRenderable,
  caretRenderable,
  selectionRenderable,
  renderContext,
  font,
  rect: { x: 0, y: 0, width: 240, height: 32 },
  parent: canvasEntity,
  placeholder: 'Username',
  maxLength: 20,
  textInputSource,
  onSubmit: (event) => console.log('submitted:', event.value),
});
```

## The text input source is required for typing

Forge's UI is canvas-rendered, there's no DOM element backing an input box
that the browser could naturally focus and send `keydown`/`composition`
events to. [`createUiTextInputSource`](/Forge/docs/api/functions/createUiTextInputSource)
fills that gap with a single hidden, off-screen `<input>` element appended to
your game container. It captures real keyboard, IME composition, and
clipboard events and republishes them as Forge events.

Create **one** text input source per canvas (not one per input box) and pass
it to every `createUiInputBox` call via `textInputSource`, and to
[`createUiInputEcsSystem`](/Forge/docs/api/functions/createUiInputEcsSystem):

```ts
import {
  createUiTextInputSource,
  createUiInputEcsSystem,
} from '@forge-game-engine/forge/ui';

const textInputSource = createUiTextInputSource(container);

world.addSystem(createUiInputEcsSystem(inputManager, textInputSource));
```

**This is the most common reason an input box renders correctly but never
produces characters when typed into**: omitting `textInputSource` entirely.
The box will still focus, show its caret, and respond to Backspace/Delete/
arrow keys (those come from registered input actions, not the DOM element),
but no characters will ever be inserted, because there's nothing forwarding
`keypress`/`input` events into the edit pipeline. Pass `undefined` only for
headless or test scenarios where you don't need real character input.

Call `textInputSource.stop()` once when tearing down the whole UI (not per
input box) to remove the hidden DOM element and detach its listeners.

## Single-line vs multiline

`multiline` (default `false`) changes what Enter does. In single-line mode,
Enter raises `onSubmit` with the current value and returns keyboard focus to
the canvas, the field doesn't keep focus after submitting. In multiline mode,
Enter inserts a literal `\n` into the value instead, and `onSubmit` is never
raised by Enter, there's no separate "submit" key for a multiline field; call
`destroy()` or read `input.value` on whatever event ends the editing session
in your UI (a separate Save button, for example).

```ts
// Single-line: Enter submits.
createUiInputBox(world, { ...common, multiline: false, onSubmit });

// Multiline: Enter inserts a newline, never submits.
createUiInputBox(world, { ...common, multiline: true });
```

## Masked (password) fields

`masked: true` replaces the rendered text with `•` characters while leaving
`input.value` as the real, unmasked string, so `onChange`/`onSubmit` payloads
always carry the actual value. Masking is purely a display concern handled
by the input ECS system when it updates the text entity; it has no effect on
editing commands, copy/paste, or `maxLength`.

```ts
createUiInputBox(world, {
  ...common,
  masked: true,
  placeholder: 'Password',
});
```

## `maxLength`

`maxLength` is enforced inside [`applyEditCommand`](/Forge/docs/api/functions/applyEditCommand)
for both typed insertion and paste: characters beyond the limit are silently
dropped rather than rejecting the whole edit. Pasting 40 characters into a
field with 12 remaining capacity keeps the first 12 and discards the rest,
it doesn't refuse the paste outright.

## `onChange` and `onSubmit`

`onChange` fires once per committed edit (insert, backspace, delete, paste)
whenever the resulting value differs from before the edit, not on every
keystroke that doesn't change the text (an arrow key press alone doesn't
raise it). `onSubmit` only fires from Enter in single-line mode. Both
deliver the field's entity id alongside the value, so one shared handler can
distinguish multiple fields if needed:

```ts
createUiInputBox(world, {
  ...common,
  onChange: (event) => validateUsername(event.value),
  onSubmit: (event) => login(event.value),
});
```

## Gotchas

- **The hidden `<input>` lives in your game container, not the canvas
  element.** Pass the same container element you used for `createGame` to
  `createUiTextInputSource`, not `renderContext.canvas`, or focus calls won't
  find an element positioned correctly relative to your layout.
- **Caret and selection positions use an approximate fixed character
  width** (`fontSize * 0.6`), not real text shaping/kerning from the font
  atlas. For most UI fonts this is close enough that users won't notice, but
  don't rely on pixel-perfect caret alignment with proportional fonts at
  large sizes.
- **Focus, not just `enabled`, controls whether typing reaches a field.**
  Multiple input boxes can exist and render simultaneously, but only the one
  with keyboard focus (`UiStateEcsComponent.focused`) receives characters
  from the shared `textInputSource`. Clicking a box focuses it the same way
  any other focusable widget does; see
  [Focus and Keyboard Navigation](./focus-and-keyboard-navigation.md).
- **`destroy()` clears the selection but doesn't blur the DOM input for
  you implicitly beyond what the `onBlur` listener already wires up.** If
  you destroy a focused input box, also call `setFocus` to move focus
  elsewhere (or to `null`) so the hidden DOM element doesn't remain focused
  with no corresponding visible field.

## Common mistake

```ts
// Wrong: typing produces no characters, only navigation/deletion works.
createUiInputBox(world, { renderable, caretRenderable, selectionRenderable, renderContext, font, rect });
world.addSystem(createUiInputEcsSystem(inputManager));

// Right: construct one text input source per canvas, pass it to both the
// widget and the system.
const textInputSource = createUiTextInputSource(container);
createUiInputBox(world, { renderable, caretRenderable, selectionRenderable, renderContext, font, rect, textInputSource });
world.addSystem(createUiInputEcsSystem(inputManager, textInputSource));
```
