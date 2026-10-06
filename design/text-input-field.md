# Design: Text Input Field

|                                       |                                                                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                       |
| **Kind**                              | Missing feature                                                                                                                                                         |
| **Found in**                          | Galactic Journey demo: `src/ui/create-text-input.ts`, `src/ui/text-input.component.ts`, `src/ui/text-input.system.ts`, `src/game-over/pilot-panel*.ts`                 |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                |
| **Related**                           | [#586](https://github.com/Forge-Game-Engine/Forge/issues/586) (this design answers its open questions), `ui-system.md` DL-10, [#583](https://github.com/Forge-Game-Engine/Forge/issues/583) (clipping), [`camera-views.md`](./camera-views.md), [`hierarchical-visibility.md`](./hierarchical-visibility.md) |

## 0. Targeted modules

| Path                                                          | Change   | Notes                                                                                                      |
| ------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `src/input/text-entry/text-entry.ts`                          | **New**  | `createTextEntry`: the hidden DOM `<input>` bridge (value, selection, composition, focus, keyboard rules)  |
| `src/input/keyboard/input-sources/keyboard-input-source.ts`   | Modified | Ignores key presses aimed at an editable element; still releases keys it saw go down                      |
| `src/ui/components/text-input-component.ts`                   | **New**  | `TextInputEcsComponent`: a focusable field's settings, its value (output) and its events                   |
| `src/ui/systems/ui-text-input-system.ts`                      | **New**  | Binds fields to text entries: focus, positioning, value mirroring, caret and selection visuals             |
| `src/ui/utilities/create-text-input.ts`                       | **New**  | `createTextInput`: background panel, text, placeholder, caret and selection entities in one call           |
| `src/ui/utilities/register-ui-systems.ts`                     | Modified | Registers the text input system in the UI pipeline                                                         |
| `src/text/utilities/shape-text.ts`                            | Modified | Also returns caret stops: the pen position at every character boundary, whitespace included                |
| `src/text/components/text-mesh-component.ts`                  | Modified | `TextMeshEcsComponent.caretStops`, written by the shaping system                                           |
| `documentation-site/docs/docs/ui/text-input.md`               | **New**  | Guide                                                                                                      |
| `documentation-site/src/pages/demos/ui-text-input/`           | **New**  | Demo page (a name entry form)                                                                              |

---

## 1. Summary

Forge has no way to type text. The demo needed one for its flight log
("BADGE NUMBER" and "PILOT NAME" entry) and built it from scratch, around
200 lines across three files:

- a hidden, 1-pixel, transparent DOM `<input>` appended to `document.body`
  to receive the typing, so keyboard layouts, paste and phone keyboards
  work;
- `stopPropagation` on its `keydown`, because Forge's
  `KeyboardInputSource` listens on the window, and every key typed would
  otherwise also move UI focus or press the focused button (Enter) or
  back out of the menu (Escape);
- deliberately _not_ stopping `keyup`, so a key held down before typing
  started is still released in the game;
- a set of keys pressed since activation, so a key already held when the
  field activated (Enter, from pressing the menu button that opened it)
  doesn't auto-repeat into it and submit at once;
- a document-wide `click` listener that re-focuses the input, because
  clicking a button blurs it, and because a phone's keyboard only opens
  from a focus inside a tap;
- an ECS component that copies the DOM events into per-tick signals
  (`isChanged`, `isSubmitted`, `isCancelled`, `isKeyPressed`) so systems
  read them once each, in any order;
- a system that sanitizes what was typed (the font atlas has printable
  ASCII only, and Forge silently drops missing glyphs), and draws the value
  with a blinking `_` caret appended as a character, because there is no
  caret rendering.

The approach is the one `ui-system.md` already chose in DL-10 and split
out as [#586](https://github.com/Forge-Game-Engine/Forge/issues/586): a
hidden DOM input for the hard parts (IME, soft keyboards, clipboard,
accessibility), Forge rendering for the visible field. This design fills
in #586 using what the demo learned, in two layers:

1. **`/src/input`: a text entry primitive.** It owns one hidden input
   positioned over a screen rectangle, exposes its value, selection and
   IME composition as data, and enforces the keyboard rules above. The
   keyboard input source stops treating keys typed into an editable
   element as game input.
2. **`/src/ui`: a text input field.** A focusable UI element that binds a
   text entry while it's focused, mirrors its value, draws a real caret
   and selection from the shaped glyphs, filters characters the font
   can't draw, and raises submit/cancel/change events.

---

## 2. Scope

### In scope

- Single-line text fields on screen-space UI canvases.
- The DOM bridge: creation inside the game's container, positioning over
  the field's screen rect (so phone keyboards and IME candidate windows
  appear next to it), attributes (`aria-label`, `inputmode`,
  `autocomplete`, `autocapitalize`, `enterkeyhint`, `maxlength`), focus,
  blur, removal on cleanup.
- Keyboard rules: typed keys aren't game input; keys held before focus
  don't auto-repeat into the field; releases always reach the game.
- Focusing a field from a tap synchronously, inside the browser's gesture
  handler, so phone keyboards open (§5.4).
- Value, caret and selection rendering, including IME composition
  (underlined while composing).
- Character filtering: the field's font must have a glyph for each
  character (default), plus an optional game-supplied filter.
- `onValueChanged`, `onSubmit`, `onCancel` events; focus integration with
  the UI navigation system.

### Out of scope

- **Multi-line fields** (`<textarea>`). Enter, caret movement and wrapping
  differ; designed later on the same primitive.
- **Scrolling a value wider than its field.** Needs per-sprite clipping
  ([#583](https://github.com/Forge-Game-Engine/Forge/issues/583)). Until
  then `maxLength` and the field's width have to agree; the guide says
  so.
- **Password masking**, rich text, and on-screen keyboards for gamepads
  (consoles provide their own; browsers don't).
- **World-space canvases.** Positioning the DOM element needs a camera's
  world-to-screen conversion, which [`camera-views.md`](./camera-views.md)
  adds. The bridge takes a CSS-pixel rect, so world-space support is a
  follow-up that only computes a different rect.

---

## 3. Background

### 3.1 Why typing can't be built from `KeyboardInputSource`

`ui-system.md` DL-10 and #586 already record this: IME composition,
phone keyboards (which only open on a focused DOM element), clipboard,
autocorrect and screen-reader access are all things browsers do for a
real `<input>`, and would each be a project to rebuild over raw key
events. The demo confirms the choice: its hidden input handled a phone's
keyboard and paste with no extra code.

### 3.2 What the engine gets wrong around a DOM input today

`KeyboardInputSource` (`src/input/keyboard/input-sources/keyboard-input-source.ts`)
listens for `keydown`/`keyup` on `globalThis` and dispatches every key to
the bindings, whatever element the key was typed into. Any game embedded
in a page with a form has the same problem the demo worked around: typing
in a text box moves the player. Browsers bubble a key typed into an input
up to the window, so the source has to look at `event.target`.

### 3.3 The demo's lessons, kept as requirements

| Demo behavior                                            | Why it matters                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Key presses typed into the field don't reach the game    | Enter would press the focused button; Escape would close the menu; arrows would move focus              |
| Key releases always reach the game                       | A movement key held while the field opened would otherwise stay held forever                            |
| Keys held at activation don't auto-repeat into the field | The Enter that opened the panel would otherwise auto-repeat and submit it immediately                   |
| Refocus inside a click handler                           | A phone keyboard only opens from `focus()` called during a user gesture                                 |
| Signals moved into the component once per tick           | DOM events arrive between ticks; systems must each see them once, in any order                          |
| Sanitize to the font's characters                        | Forge silently skips missing glyphs; a name with "é" would be stored with a letter nobody could see     |

---

## 4. How established engines handle this

- **Browser engines** (PixiJS, Phaser plugins): an `<input>` positioned
  over the canvas, made transparent, with the game drawing the visible
  text. This is the approach DL-10 already chose.
- **Unity** (`TMP_InputField`): a selectable UI element with a caret and
  selection drawn by the UI, `characterValidation`/`onValidateInput` for
  filtering, `characterLimit`, and `onSubmit`/`onEndEdit`/`onValueChanged`
  events. On mobile it opens the platform keyboard
  (`TouchScreenKeyboard`) when selected. While it's focused, keyboard
  navigation of the rest of the UI pauses.
- **Godot** (`LineEdit`): a focusable `Control`; a focused control
  consumes key events (`accept_event`), so they don't reach game input
  handlers. `max_length`, `text_changed`/`text_submitted` signals, IME
  support through the display server.
- **Bevy**: no built-in text field yet; community crates follow the same
  pattern (focusable node, events, IME through winit).

The common shape: the field is an ordinary focusable UI element; while
focused it _consumes_ key input; it validates characters; it reports
change and submit as events; the platform's own text machinery does the
typing.

---

## 5. Design

### 5.1 Layer 1: the text entry primitive (`/src/input`)

```ts
interface TextEntry {
  /** The current text, as the DOM input holds it. */
  readonly value: string;
  /** Selection (equal when it's just a caret), in UTF-16 code units. */
  readonly selectionStart: number;
  readonly selectionEnd: number;
  /** The IME composition range, if the player is composing. */
  readonly composition: { start: number; end: number } | null;
  readonly isFocused: boolean;

  /** Replaces the text (for clearing or prefilling the field). */
  setValue(value: string): void;
  /** Places the hidden element over a rect in CSS pixels, relative to the container. */
  setScreenRect(rect: Rect): void;
  setAttributes(attributes: TextEntryAttributes): void;
  focus(): void;
  blur(): void;

  /** Events since the last `takeEvents()`; the UI system drains these once per tick. */
  takeEvents(): TextEntryEvents;
  dispose(): void;
}

interface TextEntryEvents {
  changed: boolean;
  submitted: boolean; // Enter
  cancelled: boolean; // Escape
}

function createTextEntry(container: HTMLElement): TextEntry;
```

Rules the primitive enforces:

- **Placement.** The `<input>` is appended to the game's container (not
  `document.body`), absolutely positioned over `setScreenRect`'s rect,
  with transparent text, caret, border and background. Being over the
  field, rather than at the page's corner, is what makes a phone scroll
  the field into view above its keyboard and puts an IME candidate window
  next to the text.
- **Held keys don't repeat in.** The primitive records which keys went
  down while it was focused. A repeating `keydown` for any other key is
  cancelled (`preventDefault`), which is exactly the demo's
  `keysPressedHere` rule.
- **Enter and Escape** are cancelled (no form submission, no browser
  behavior) and recorded as `submitted`/`cancelled`. A repeating Enter
  doesn't submit twice.
- **Tab** is cancelled; leaving the field by keyboard is the UI navigation
  system's job (§5.3).
- Events accumulate between ticks and are drained by `takeEvents()`.

`KeyboardInputSource` gains one rule, which applies whether or not a
Forge text field exists:

> A `keydown` whose target is an editable element (`<input>`,
> `<textarea>`, `<select>`, or `isContentEditable`) isn't dispatched to
> bindings. A `keyup` is dispatched only for keys whose `keydown` the
> source dispatched.

That's the demo's `stopPropagation` and "releases still reach the game"
logic as a general rule, so it also fixes games embedded next to HTML
forms. Because the source never saw the press, the release of a key that
was typed into the field doesn't fire `buttonMoments.up` triggers either.

### 5.2 Layer 2: the field (`/src/ui`)

```ts
interface TextInputEcsComponent {
  /** The current text. Written by the text input system only. */
  readonly value: string;
  /** Shown, in the placeholder's color, while `value` is empty. */
  placeholder: string;
  maxLength: number;
  /**
   * Transforms what was typed before it's accepted, e.g. upper-casing a
   * code or dropping leading spaces. Runs after the font filter.
   */
  filter?: (text: string) => string;
  attributes: TextEntryAttributes; // aria-label, inputmode, autocapitalize...
  readonly onValueChanged: ParameterizedForgeEvent<string>;
  readonly onSubmit: ParameterizedForgeEvent<string>;
  readonly onCancel: ForgeEvent;
}

/** Replaces a field's text; the value updates on the next tick. */
function setTextInputValue(world: EcsWorld, field: number, value: string): void;
```

`createTextInput(world, parent, options)` builds the field from existing
parts, the way `createButton` does: a panel for the background, a label
for the text (and one for the placeholder), a thin panel for the caret
and one behind the text for the selection highlight, and a
`UiInteractableEcsComponent` so the field is focusable, hoverable and
reachable by navigation.

`createUiTextInputEcsSystem` owns the binding between fields and entries:

1. **Focus.** When a field gains UI focus (pointer press, or navigation),
   the system focuses its text entry; when it loses UI focus, blur. One
   text entry per canvas is enough, since only one field can be focused
   at a time; the system rebinds it to whichever field is focused.
2. **Placement.** Every tick, the focused field's resolved rect is
   converted from reference pixels to CSS pixels (the same conversion
   `resolveCanvasPointerPosition` uses, in reverse) and passed to
   `setScreenRect`.
3. **Value.** On `changed`, the entry's value is run through the font
   filter (drop characters the field's `FontAtlas` has no glyph for), then
   `filter`, then `maxLength`; if the result differs, it's written back
   with `setValue` (the caret is kept at the same logical position). The
   component's `value` is updated and `onValueChanged` raised.
4. **Submit/cancel.** Raised from the drained events, with the value.
5. **Visuals.** The caret and selection are placed from the shaped
   text's caret stops (below). The caret blinks, restarting on every
   change. The selection highlight spans the stops between
   `selectionStart` and `selectionEnd`. Composed IME text is underlined.

`ui-system.md` DL-10 expected `TextMeshEcsComponent.glyphs` to be enough
for caret placement. It isn't quite: a `GlyphQuad` doesn't record which
character it came from, and whitespace and missing glyphs produce no quad
at all, so there's nothing to place a caret after a trailing space. So
`shapeText` also returns **caret stops**: for every UTF-16 boundary from
`0` to `text.length`, the pen's x and the line it's on. Shaping already
walks every character, whitespace included, to advance the pen, so this is
one array write per character. `TextMeshEcsComponent.caretStops` carries
them, written by the shaping system like the rest of the mesh.

Because the DOM input holds the text, the component's `value` has one
writer: the system. Game code that wants to change it calls
`setTextInputValue`, which writes the DOM input, and the value comes back
through step 3 like typed text. That keeps the "one writer per value"
rule without a second source of truth.

### 5.3 Navigation while typing

A focused field consumes keyboard input (the keyboard source ignores it,
§5.1), so the canvas's `navigateInput` and `submitInput` bound to the
keyboard don't fire while typing, which is the behavior Unity and Godot
both have. Enter submits the field. To leave a field with the keyboard,
the player presses Escape (`onCancel`), or Tab, which the system forwards
to the navigation system as "move focus to the next element". Gamepad
navigation still works, since the gamepad source isn't affected: a
controller user moves focus off the field as with any other element.

### 5.4 Phone keyboards and the gesture rule

Browsers only open a phone's keyboard when `focus()` is called during a
user gesture (a `touchend`/`click` handler). An ECS tick runs later, from
`requestAnimationFrame`, so focusing from the system works on desktop
but not on phones.

The primitive therefore also listens for `pointerup` on the container.
The UI system gives it the focusable fields' current CSS rects each tick;
when a tap lands inside one, the primitive calls `focus()` synchronously,
inside the gesture, and records which field it was. The UI system then
gives that field UI focus on the next tick, so both agree. This is the
general version of the demo's "re-focus on any click" listener, minus the
side effect of grabbing focus back after clicks elsewhere.

### 5.5 Character filtering

Shaping silently skips characters with no glyph (`shapeText` documents
this as a content problem, not an error). For a text field, that would
mean storing characters the player can't see. So a field accepts only the
characters its font atlas has a glyph for (and the space character), by
default and always. The demo's `sanitizeName` keeps only its second rule
(no leading spaces) as its `filter`; its badge sanitizer (upper-casing and
an alphabet) stays a game filter.

### 5.6 Accessibility

The hidden input is a real, labelled form control (`aria-label` from the
field's attributes), so screen readers announce the field and what's
typed into it. This is the one part of canvas UI that gets screen-reader
access for free; the wider problem is
[#634](https://github.com/Forge-Game-Engine/Forge/issues/634).

---

## 6. Phases

### Phase 1: Keyboard input stops reading typed keys

| #   | Task                                                                                               | Size |
| --- | -------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `KeyboardInputSource`: ignore key presses aimed at editable elements; release only keys it pressed | S    |
| 1.2 | Unit tests with keydown/keyup events targeting an `<input>`                                        | S    |
| 1.3 | Changelog under `#### Fixed`                                                                       | S    |

**Definition of done:** typing into any HTML input next to (or over) the
game doesn't trigger game actions, and keys held before typing are still
released. Useful on its own for games embedded in pages with forms.

### Phase 2: Text entry primitive and the UI field

| #   | Task                                                                                                          | Size |
| --- | ------------------------------------------------------------------------------------------------------------- | ---- |
| 2.1 | `createTextEntry`: element in the container, placement, attributes, events, held-key repeat rule, dispose     | M    |
| 2.2 | Synchronous tap-to-focus with registered field rects (§5.4)                                                   | M    |
| 2.3 | `TextInputEcsComponent`, `setTextInputValue`, `createTextInput`                                               | M    |
| 2.4 | `createUiTextInputEcsSystem`: focus binding, placement, value mirroring, font filter, events                  | L    |
| 2.5 | `shapeText` caret stops and `TextMeshEcsComponent.caretStops`; caret, selection and composition rendering     | M    |
| 2.6 | Unit tests (jsdom `<input>`), e2e: typing, Enter submits, Escape cancels, typed keys don't move UI focus      | M    |
| 2.7 | Guide `ui/text-input.md`, docs-site demo, changelog under `#### Added`                                        | M    |

**Definition of done:** the demo's pilot panel can be rebuilt with two
`createTextInput` fields and no DOM code of its own; a phone opens its
keyboard when a field is tapped; IME input works.

### Phase 3 (future): long values and multi-line

Horizontal scrolling of a value wider than the field (needs #583's
clipping) and a `<textarea>`-backed multi-line field. Listed so Phase 2's
component shape leaves room for them.

---

## 7. Decision log

### DL-1: Two layers, split between `/src/input` and `/src/ui`

**Decision.** Keep #586's split: the DOM bridge in `/src/input`, the field
in `/src/ui`.

**Rationale.** The bridge is reusable (a debug console, a chat box drawn
by the game itself) and keeps all DOM access out of the UI module, which
restores the UI module's "no DOM-backed widgets" invariant recorded in
`ui-system.md`.

### DL-2: The keyboard source ignores keys typed into editable elements

**Options.** (a) Each text field stops propagation of its own key events
(the demo). (b) The keyboard source ignores `keydown` events targeting
editable elements.

**Decision: (b).**

**Rationale.** It fixes the layer that owns the behavior: "is this key
game input?" is the keyboard source's question. (a) needs every
DOM-based widget, including ones outside Forge, to cooperate.

### DL-3: The DOM input is the source of truth for the text

**Options.** (a) The component's `value` is writable and the system syncs
it to the DOM. (b) The DOM holds the text; the component mirrors it, and
game code changes it through `setTextInputValue`.

**Decision: (b).**

**Rationale.** With (a), the game and the system both write `value`, and
a write on the same tick as a keystroke loses one of them. (b) has one
writer per value. The DOM must hold the text anyway, since that's where
IME and the selection live.

### DL-4: Filter to the font's glyphs by default, without an option

**Options.** (a) Accept anything and let shaping skip what it can't draw.
(b) Drop characters the font can't draw, always. (c) An option to choose.

**Decision: (b).**

**Rationale.** A field that stores characters the player can't see is
never what a game wants. Games that need wider coverage generate an atlas
with a wider charset (`forge-generate-font-atlas --charset`). No option,
because no game wants (a).

### DL-5: Focus from a tap happens in the DOM handler, not the tick

**Rationale.** It's the only way phone keyboards open (§5.4). The cost is
that the primitive hit-tests fields' rects itself, from rects the UI
system hands it each tick, which is a duplicate of the UI raycast for this
one case.

---

## 8. Open questions

1. **Should one text entry be shared per canvas, or one per field?**
   Sharing (proposed) means one hidden element and no DOM churn as fields
   are created. One per field would let a browser's autofill see several
   fields at once (a login form), which a game rarely needs.
   - (a) One per canvas (proposed). (b) One per field.
2. **Tab behavior.** Forwarding Tab to the navigation system (§5.3) makes
   Tab move focus to the "next" element, which Forge navigation defines
   spatially, not by order.
   - (a) Tab navigates spatially "down" (proposed, simple). (b) Add
     explicit tab order to `UiInteractableEcsComponent` first.
3. **Selection by pointer drag inside the field.** The hidden input
   supports it natively if pointer events reach it, but the canvas is on
   top. Forwarding drags would make selection-by-mouse work.
   - (a) Phase 2 supports keyboard selection only (proposed). (b) Forward
     pointer drags to the input in Phase 2.

---

## 9. Testing considerations

- Unit (jsdom): `KeyboardInputSource` with events dispatched on an
  `<input>` versus on `window`; the held-key repeat rule; `takeEvents`
  draining; filter order (font, then game filter, then length).
- e2e: real keyboard typing into a focused field via Playwright
  (`page.keyboard.type`), asserting the rendered value changed (relative
  pixel check, per the `write-e2e-test` skill) and that the UI focus did
  not move while typing arrows; Enter submits once even when held.

## 10. Documentation and demo follow-up

- New guide `ui/text-input.md`: creating a field, filters, events, the
  phone keyboard rule, the `maxLength`/width caveat until clipping lands.
- Update `input/keyboard.md`: keys typed into HTML inputs aren't game
  input.
- Demo: `create-text-input.ts`, `text-input.component.ts` and
  `text-input.system.ts` are deleted; the pilot panel creates two fields
  and listens to their events.
