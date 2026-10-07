---
sidebar_position: 5
---

# Text Entry

A text entry is a hidden HTML `<input>` that receives typing for text the
game draws itself. The browser handles keyboard layouts, IME composition,
paste and phone keyboards; the entry exposes the text, the selection and
the composition as data. Forge's [text fields](../ui/text-input.md) are
built on it. Use it directly for something that isn't a UI field, such as
a debug console.

## Creating a text entry

```ts
import { createTextEntry } from '@forge-game-engine/forge/input';

const entry = createTextEntry(game.container);
```

[`createTextEntry`](/Forge/docs/api/functions/createTextEntry) appends the
input to the container, and makes the container `position: relative` if it
isn't positioned. The input is transparent and has
`pointer-events: none`.

## Placing the input

```ts
entry.setScreenRect({ left: 200, top: 120, width: 300, height: 40 });
```

`setScreenRect` takes CSS pixels relative to the container, with Y down.
Place the input over the text the game draws: a phone scrolls the focused
input into view above its keyboard, and an IME opens its candidate window
next to it.

## Focusing and blurring

`focus()` sends the player's typing to the input and `blur()` stops it.
`isFocused` tells which is the case. A phone opens its keyboard only when
`focus()` is called inside the event handler of a user gesture.

While the entry has focus:

- a key that was already held when it was focused doesn't auto-repeat into
  it;
- Enter and Escape have no browser behavior, and are reported as
  `submitted` and `cancelled`, except during an IME composition;
- Tab does nothing.

## Reading the text

`value`, `selectionStart` and `selectionEnd` read the input's current
state. `composition` is the range of text being composed with an IME, or
`null`. `setValue` and `setSelection` change them.

## Reading events

DOM events arrive between ticks. `takeEvents()` returns what happened since
its last call and clears it:

```ts
const events = entry.takeEvents();

if (events.submitted) {
  submitText(entry.value);
  entry.setValue('');
}
```

`changed` is set when typing, pasting or an IME changed the text,
`submitted` and `cancelled` by Enter and Escape, and `blurred` when the
input lost focus.

## Removing a text entry

`dispose()` removes the input and its event listeners.
