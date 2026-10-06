# Design: Text Input Field

|                                       |                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                            | Draft, for review                                                                                                                                                                                                                                                                                                        |
| **Kind**                              | Missing feature                                                                                                                                                                                                                                                                                                          |
| **Found in**                          | Galactic Journey demo: `src/ui/create-text-input.ts`, `src/ui/text-input.component.ts`, `src/ui/text-input.system.ts`, `src/game-over/pilot-panel*.ts`                                                                                                                                                                   |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                                                                                                 |
| **Related**                           | [#586](https://github.com/Forge-Game-Engine/Forge/issues/586) (this design answers its open questions), `ui-system.md` DL-10, [#583](https://github.com/Forge-Game-Engine/Forge/issues/583) (clipping), [`input-action-state.md`](./input-action-state.md), [`hierarchical-visibility.md`](./hierarchical-visibility.md) |

## 0. Targeted modules

| Path                                                        | Change   | Notes                                                                                                      |
| ----------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `src/input/text-entry/text-entry.ts`                        | **New**  | `createTextEntry`: one hidden DOM `<input>` (value, selection, composition, focus, keyboard and IME rules) |
| `src/input/keyboard/input-sources/keyboard-input-source.ts` | Modified | Keys pressed in an editable element never count as held; their releases are ignored                        |
| `src/ui/components/text-input-component.ts`                 | **New**  | `TextInputEcsComponent`: a field's settings, its value and editing state (outputs) and its events          |
| `src/ui/systems/ui-text-input-system.ts`                    | **New**  | Owns each field's text entry: editing state, placement, value mirroring, caret and selection visuals       |
| `src/ui/systems/ui-raycast-system.ts`                       | Modified | Its hit test becomes a function the tap handler can call synchronously                                     |
| `src/ui/utilities/create-text-input.ts`                     | **New**  | `createTextInput`: background panel, text, placeholder, caret and selection entities in one call           |
| `src/ui/utilities/register-ui-systems.ts`                   | Modified | Registers the text input system in the UI pipeline                                                         |
| `src/text/utilities/shape-text.ts`                          | Modified | Also returns caret stops: the final position of every character boundary, whitespace included              |
| `src/text/components/text-mesh-component.ts`                | Modified | `TextMeshEcsComponent.caretStops`, written by the shaping system                                           |
| `documentation-site/docs/docs/ui/text-input.md`             | **New**  | Guide                                                                                                      |
| `documentation-site/src/pages/demos/ui-text-input/`         | **New**  | Demo page (a name entry form)                                                                              |

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
2. **`/src/ui`: a text input field.** A UI element with its own text entry
   and an editing state that's separate from UI focus. It mirrors its
   entry's value, draws a real caret and selection from the shaped text,
   filters characters the font can't draw, and raises submit, cancel and
   change events.

---

## 2. Scope

### In scope

- Single-line text fields on screen-space UI canvases.
- The DOM bridge: creation inside the game's container, positioning over
  the field's screen rect (so phone keyboards and IME candidate windows
  appear next to it), attributes (`aria-label`, `inputmode`,
  `autocomplete`, `autocapitalize`, `enterkeyhint`, `maxlength`), focus,
  blur, removal on cleanup.
- Keyboard rules: typed keys aren't game input; keys held before editing
  don't auto-repeat into the field; releases of keys the game saw go down
  always reach the game.
- IME rules: committing or cancelling a composition doesn't submit or
  cancel the field, and the value isn't rewritten mid-composition.
- An editing state separate from UI focus (§5.2).
- Starting to edit from a tap synchronously, inside the browser's gesture
  handler, so phone keyboards open (§5.4).
- Value, caret and selection rendering, including IME composition
  (underlined while composing).
- Character filtering: the field's font must have a glyph for each
  character (always), plus an optional game-supplied filter.
- `onValueChanged`, `onSubmit`, `onCancel` events.

### Out of scope

- **Multi-line fields** (`<textarea>`). Enter, caret movement and wrapping
  differ; designed later on the same primitive.
- **Scrolling a value wider than its field.** Needs per-sprite clipping
  ([#583](https://github.com/Forge-Game-Engine/Forge/issues/583)). Until
  then `maxLength` and the field's width have to agree; the guide says
  so.
- **Password masking**, rich text, and on-screen keyboards for gamepads
  (consoles provide their own; browsers don't).
- **Tab between fields.** Leaving a field is Escape or Enter (as in the
  demo); Tab does nothing inside a field. Tab order needs a way to ask
  the navigation system to move focus, which it doesn't have (open
  question 2).
- **World-space canvases.** The same conversion through the canvas's
  camera would place the element; they're left out only because a field
  in a moving world keeps the DOM element chasing it every frame, and
  nothing needs it yet.

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
up to the window, so the source has to look at where the key was typed.

### 3.3 The demo's lessons, kept as requirements

| Demo behavior                                            | Why it matters                                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Key presses typed into the field don't reach the game    | Enter would press the focused button; Escape would close the menu; arrows would move focus          |
| Key releases always reach the game                       | A movement key held while the field opened would otherwise stay held forever                        |
| Keys held at activation don't auto-repeat into the field | The Enter that opened the panel would otherwise auto-repeat and submit it immediately               |
| Refocus inside a click handler                           | A phone keyboard only opens from `focus()` called during a user gesture                             |
| Signals moved into the component once per tick           | DOM events arrive between ticks; systems must each see them once, in any order                      |
| Sanitize to the font's characters                        | Forge silently skips missing glyphs; a name with "é" would be stored with a letter nobody could see |
| UI focus stays on the submit button while typing         | The player types, then presses the focused button; focus and typing are different things            |

---

## 4. How established engines handle this

- **Browser engines** (PixiJS, Phaser plugins): an `<input>` positioned
  over the canvas, made transparent, with the game drawing the visible
  text. This is the approach DL-10 already chose. Godot's web export does
  the same for phone keyboards (a hidden input next to the canvas whose
  `input` events forward the value and selection).
- **Unity** (`TMP_InputField`): a selectable UI element with a caret and
  selection drawn by the UI, `characterValidation`/`onValidateInput` for
  filtering, `characterLimit`, and `onSubmit`/`onEndEdit`/`onValueChanged`
  events. On mobile it opens the platform keyboard
  (`TouchScreenKeyboard`) when selected. Unity can treat selection as
  editing because its selection doesn't follow the pointer's hover.
- **Godot** (`LineEdit`): since 4.4, editing is separate from focus:
  `edit()`, `unedit()`, `is_editing()` and an `editing_toggled` signal.
  Keyboard focus alone doesn't start editing; a click or the accept
  action does. `max_length`, `text_changed`/`text_submitted` signals, IME
  support through the display server. A focused `LineEdit` stops key
  events from reaching `_unhandled_input`, but polled input
  (`Input.is_action_pressed`) still sees keys typed into it.
- **Bevy**: 0.19 added a built-in editable text widget (`EditableText`);
  before that, community crates followed the same pattern (focusable node,
  events, IME through `winit`).

The common shape: the field is an ordinary UI element; while editing it
consumes key input; it validates characters; it reports change and submit
as events; the platform's own text machinery does the typing. Forge's
actions are polled, so ignoring typed keys at the keyboard source is
stricter than Godot's `accept_event`, and that's what the demo needs.

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
  /** Places the hidden element over a rect in CSS pixels, Y down, relative to the container. */
  setScreenRect(rect: CssRect): void;
  setAttributes(attributes: TextEntryAttributes): void;
  focus(): void;
  blur(): void;

  /** Events since the last `takeEvents()`; the UI system drains these once per tick. */
  takeEvents(): TextEntryEvents;
  dispose(): void;
}

/** A DOM rectangle: CSS pixels, origin top-left, Y down. */
interface CssRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TextEntryEvents {
  changed: boolean;
  submitted: boolean; // Enter, outside a composition
  cancelled: boolean; // Escape, outside a composition
  blurred: boolean; // the browser took focus away (a click elsewhere, a phone's "Done", a tab switch)
}

function createTextEntry(container: HTMLElement): TextEntry;
```

`CssRect` is deliberately not Forge's `Rect`, which is Y-up world space.

Rules the primitive enforces:

- **Placement.** The `<input>` is appended to the game's container (not
  `document.body`) and absolutely positioned over `setScreenRect`'s rect,
  with transparent text, caret, border and background, and
  `pointer-events: none` (taps go through the UI's hit test, §5.4). Forge
  doesn't position the container today, so the primitive makes it a
  positioning context (`position: relative` if it's `static`). Being over
  the field, rather than at the page's corner, is what makes a phone
  scroll the field into view above its keyboard and puts an IME candidate
  window next to the text.
- **Held keys don't repeat in.** The primitive records which keys went
  down while it was focused. A repeating `keydown` for any other key is
  cancelled (`preventDefault`), which is exactly the demo's
  `keysPressedHere` rule.
- **Enter and Escape** are cancelled (no form submission, no browser
  behavior) and recorded as `submitted`/`cancelled`, except during an IME
  composition (`event.isComposing`, or key code 229): there, Enter commits
  the composition and Escape cancels it, and neither ends editing. A
  repeating Enter doesn't submit twice.
- **Tab** is cancelled (§2).
- **Composition.** The primitive doesn't change the value while a
  composition is in progress; rewriting it would end the composition. The
  UI system filters on `compositionend` instead (§5.2).
- **Blur** is recorded as an event, so the field knows editing ended.
- Events accumulate between ticks and are drained by `takeEvents()`.

`KeyboardInputSource` gains one rule, which applies whether or not a
Forge text field exists, stated in terms of the source's own state so it
holds before or after [`input-action-state.md`](./input-action-state.md):

> A key whose `keydown` targets an editable element (`<input>`,
> `<textarea>`, `<select>`, or `isContentEditable`) never enters the
> source's set of held keys. A `keyup` for a key that isn't in that set is
> ignored: nothing is reported, and no up-moment trigger fires.

The target is read from `event.composedPath()[0]`, since at the window
`event.target` is the shadow host for elements inside a shadow
root. That's the demo's `stopPropagation` and "releases still reach
the game" logic as a general rule, so it also fixes games embedded next to
HTML forms. The source's unused `_keyPressesDown`/`_keyPressesUps` sets go
in the same change.

### 5.2 Layer 2: the field (`/src/ui`)

```ts
interface TextInputEcsComponent {
  /** The current text. Written by the text input system only. */
  readonly value: string;
  /** Whether the field is being typed into. Written by the text input system only. */
  readonly isEditing: boolean;
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
function setTextInputValue(world: EcsWorld, field: Entity, value: string): void;
/** Starts editing a field (e.g. when its panel opens), as a tap would. */
function editTextInput(world: EcsWorld, field: Entity): void;
```

`createTextInput(world, parent, options)` builds the field from existing
parts, the way `createButton` does: a panel for the background, a label
for the text (and one for the placeholder), a thin panel for the caret
and one behind the text for the selection highlight, and a
`UiInteractableEcsComponent` so the field is hoverable, focusable and
reachable by navigation.

**Editing is separate from focus.** Forge's UI focus follows the pointer's
hover and controller navigation, and games set it themselves (the demo
keeps it on its submit button while the player types). Tying typing to
focus would start typing whenever the pointer crossed a field, and stop
it when the pointer moved to the submit button. So, as in Godot 4.4, the
field has its own editing state, owned by the text input system:

- **Starts** on a tap or click on the field (§5.4), on the canvas's
  `submitInput` while the field has UI focus (a controller's A, Enter
  from navigation), or through `editTextInput`.
- **Ends** on Enter (`onSubmit`), Escape (`onCancel`), or the browser
  blurring the input (a tap elsewhere, a phone's "Done" key, switching
  tabs).
- UI focus can be anywhere meanwhile. At most one field per page is
  editing, since only one DOM element has focus.

`createUiTextInputEcsSystem` owns each field's text entry (one per field,
created when the field's component appears and disposed when it's removed
or in the system's `cleanup`; the container is the render context's
canvas parent):

1. **Editing.** Applies the rules above, focusing and blurring the entry,
   and writes `isEditing`.
2. **Placement.** Every tick, the editing field's resolved rect is
   converted from UI world space to a `CssRect` through the canvas's
   camera (the inverse of `resolveCanvasPointerPosition`, through the camera
   view's `worldToViewport`).
3. **Value.** On `changed` outside a composition (or on `compositionend`),
   the entry's value is run through the font filter (drop characters the
   field's `FontAtlas` has no glyph for), then `filter`, then `maxLength`;
   if the result differs, it's written back with `setValue` (the caret is
   kept at the same logical position). The component's `value` is
   updated and `onValueChanged` raised.
4. **Submit/cancel.** Raised from the drained events, with the value.
5. **Visuals.** The caret and selection are placed from the shaped
   text's caret stops (below). The caret blinks, restarting on every
   change. The selection highlight spans the stops between
   `selectionStart` and `selectionEnd`. Composed IME text is underlined.

`ui-system.md` DL-10 expected `TextMeshEcsComponent.glyphs` to be enough
for caret placement. It isn't: a `GlyphQuad` doesn't record which
character it came from, and whitespace and missing glyphs produce no quad
at all, so there's nothing to place a caret after a trailing space. So
`shapeText` also returns **caret stops**: for every UTF-16 boundary from
`0` to `text.length`, the final x and baseline y. They're computed at the
end of shaping, after pivot, alignment, justification and the vertical
offset are applied, because pen positions during shaping are relative to
each word and whitespace runs are advanced as a block. Shaping walks code
points while DOM selection indices are UTF-16, so the boundary inside a
surrogate pair gets the position of the pair's start.
`TextMeshEcsComponent.caretStops` carries them, written by the shaping
system like the rest of the mesh.

Because the DOM input holds the text, the component's `value` has one
writer: the system. Game code that wants to change it calls
`setTextInputValue`, which writes the field's own DOM input, and the value
comes back through step 3 like typed text. One entry per field is what
makes that work for a field that isn't being edited.

### 5.3 Navigation while typing

While a field is editing, keys typed into it are ignored by the keyboard
source (§5.1), so the canvas's keyboard-bound `navigateInput` and
`submitInput` don't fire. Enter submits the field and Escape cancels it,
both ending editing. Gamepad navigation still works, since the gamepad
source isn't affected: a controller user can move UI focus off the field
while typing on a physical keyboard, and editing continues until it's
submitted, cancelled or blurred.

### 5.4 Phone keyboards and the gesture rule

Browsers only open a phone's keyboard when `focus()` is called during a
user gesture (a `touchend`/`click` handler). An ECS tick runs later, from
`requestAnimationFrame`, so focusing from the system works on desktop but
not on phones.

So the text input system listens for `pointerup` on the container and,
inside the handler, runs the UI's hit test synchronously. The raycast
system's hit test (topmost interactable at a point, respecting
`blocksRaycasts`, canvas groups and draw order) becomes a function that
both the raycast system and this handler call, so a tap on a modal that
covers a field doesn't start editing the field underneath. If the topmost
hit is a field, its entry is focused right there, inside the gesture, and
the field starts editing on the next tick. Each field's entry already has
its value and attributes (`inputmode`, `autocapitalize`, `enterkeyhint`,
`maxlength`), which phone keyboards read at focus time.

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

| #   | Task                                                                                                                                          | Size |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `KeyboardInputSource`: keys pressed in editable elements (via `composedPath()`) never held; their releases ignored; unused press sets deleted | S    |
| 1.2 | Unit tests with keydown/keyup events targeting an `<input>`, including one in a shadow root                                                   | S    |
| 1.3 | Changelog under `#### Fixed`                                                                                                                  | S    |

**Definition of done:** typing into any HTML input next to (or over) the
game doesn't trigger game actions, and keys held before typing are still
released. Useful on its own for games embedded in pages with forms.

### Phase 2: Text entry primitive and the UI field

| #   | Task                                                                                                                                                           | Size |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 2.1 | `createTextEntry`: element in the container, positioning context, placement, attributes, events (blur included), held-key, IME and Enter/Escape rules, dispose | M    |
| 2.2 | The raycast hit test as a shared function; synchronous tap-to-edit (§5.4)                                                                                      | M    |
| 2.3 | `TextInputEcsComponent`, `setTextInputValue`, `editTextInput`, `createTextInput`                                                                               | M    |
| 2.4 | `createUiTextInputEcsSystem`: one entry per field, editing state, placement, value mirroring, font filter, events                                              | L    |
| 2.5 | `shapeText` caret stops (final positions, UTF-16) and `TextMeshEcsComponent.caretStops`; caret, selection and composition rendering                            | M    |
| 2.6 | Unit tests (jsdom `<input>`), e2e: typing, Enter submits, Escape cancels, typed keys don't move UI focus, hovering another element doesn't end editing         | M    |
| 2.7 | Guide `ui/text-input.md`, docs-site demo, changelog under `#### Added`                                                                                         | M    |

**Definition of done:** the demo's pilot panel can be rebuilt with two
`createTextInput` fields and no DOM code of its own (its inactivity
countdown resets on `onValueChanged` and submit instead of on any key); a
phone opens its keyboard when a field is tapped; IME input works.

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
IME and the selection live, and with one entry per field every field's
text is in the DOM, whether or not it's being edited.

### DL-4: Filter to the font's glyphs by default, without an option

**Options.** (a) Accept anything and let shaping skip what it can't draw.
(b) Drop characters the font can't draw, always. (c) An option to choose.

**Decision: (b).**

**Rationale.** A field that stores characters the player can't see is
never what a game wants. Games that need wider coverage generate an atlas
with a wider charset (`forge-generate-font-atlas --charset`). No option,
because no game wants (a).

### DL-5: Editing is separate from UI focus

**Options.** (a) A focused field is being typed into (Unity). (b) Editing
is its own state, started by a tap, a submit or code, and ended by
submit, cancel or blur (Godot 4.4).

**Decision: (b).**

**Rationale.** Forge's focus follows hover, so (a) would start and stop
typing as the pointer moves. (b) also lets a game keep UI focus on a
button while the player types, as the demo does. The alternative would be
to remove hover-follows-focus from the UI, which is a larger change to
the UI's design than this feature justifies.

### DL-6: One text entry per field

**Options.** (a) One entry per canvas, rebound to the field being edited.
(b) One entry per field.

**Decision: (b).**

**Rationale.** A field's value, attributes and selection live in its DOM
input (DL-3), and a phone keyboard reads the attributes at focus time, so
a shared entry would have to swap all of them inside the tap handler and
would leave fields that aren't being edited with nowhere to keep their
text. One hidden input per field is a few DOM nodes per screen.

### DL-7: Tap-to-edit runs the UI's own hit test

**Rationale.** It's the only way phone keyboards open (§5.4). Calling the
raycast's hit test, rather than testing field rects, keeps occlusion
(modals, `blocksRaycasts`, canvas groups) identical to every other
pointer interaction.

---

## 8. Open questions

1. **Should hover still set UI focus?** DL-5 keeps it. If the team would
   rather focus mean "selected" (Unity's model), editing could follow
   focus, but hover-follows-focus would have to go for every UI element.
   - (a) Keep hover focus; editing is separate (proposed). (b) Remove
     hover focus from the UI and let editing follow focus.
2. **Tab between fields.** Needs a way for the field to ask the navigation
   system to move focus, and probably an explicit tab order, since Forge
   navigation is spatial.
   - (a) Leave it out (proposed). (b) Add a navigation request and tab
     order first.
3. **Selection by pointer drag inside the field.** The hidden input has
   `pointer-events: none`, so drags don't reach it. Forwarding them would
   make selection-by-mouse work.
   - (a) Phase 2 supports keyboard selection only (proposed). (b) Forward
     pointer drags to the input in Phase 2.

---

## 9. Testing considerations

- Unit (jsdom): `KeyboardInputSource` with events dispatched on an
  `<input>` (and one inside a shadow root) versus on `window`; the
  held-key repeat rule; Enter and Escape during a composition; blur as an
  event; `takeEvents` draining; filter order (font, then game filter,
  then length), and no filtering mid-composition.
- Unit (system): editing starts on submit while focused and through
  `editTextInput`; hovering another element doesn't end it; blur does;
  entries are disposed with their fields.
- e2e: real keyboard typing into a field via Playwright
  (`page.keyboard.type`), asserting the rendered value changed (relative
  pixel check, per the `write-e2e-test` skill), that UI focus didn't move
  while typing arrows, and that Enter submits once even when held; a tap
  on a panel covering a field doesn't start editing it.

## 10. Documentation and demo follow-up

- New guide `ui/text-input.md`: creating a field, editing versus focus,
  filters, events, the phone keyboard rule, the `maxLength`/width caveat
  until clipping lands.
- Update `input/keyboard.md`: keys typed into HTML inputs aren't game
  input.
- Demo: `create-text-input.ts`, `text-input.component.ts` and
  `text-input.system.ts` are deleted; the pilot panel creates two fields,
  listens to their events, and keeps its UI focus on the submit button.
