/** A DOM rectangle: CSS pixels, origin at the container's top-left, Y down. */
export interface CssRect {
  /** Distance from the container's left edge, in CSS pixels. */
  left: number;

  /** Distance from the container's top edge, in CSS pixels. */
  top: number;

  /** Width, in CSS pixels. */
  width: number;

  /** Height, in CSS pixels. */
  height: number;
}

/**
 * The HTML attributes a text entry's hidden `<input>` carries. Phone
 * keyboards read them when the input is focused, and screen readers
 * announce `ariaLabel`. Leave a field `undefined` to use the browser's
 * default.
 */
export interface TextEntryAttributes {
  /** The input's accessible name (`aria-label`), announced by screen readers. */
  ariaLabel?: string;

  /** Which on-screen keyboard to show (`inputmode`), e.g. `'numeric'`. */
  inputMode?:
    | 'none'
    | 'text'
    | 'decimal'
    | 'numeric'
    | 'tel'
    | 'search'
    | 'email'
    | 'url';

  /** Whether and how the browser may autofill the input (`autocomplete`), e.g. `'off'` or `'nickname'`. */
  autocomplete?: string;

  /** How phone keyboards capitalize what's typed (`autocapitalize`). */
  autocapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';

  /** The label of a phone keyboard's Enter key (`enterkeyhint`). */
  enterKeyHint?:
    'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';

  /**
   * The most UTF-16 code units the player can type (`maxlength`). A
   * non-finite value means no limit.
   */
  maxLength?: number;
}

/** What happened to a text entry since the last {@link TextEntry.takeEvents}. */
export interface TextEntryEvents {
  /** The value changed through typing, pasting or an IME. */
  changed: boolean;

  /** Enter was pressed outside an IME composition. */
  submitted: boolean;

  /** Escape was pressed outside an IME composition. */
  cancelled: boolean;

  /** The browser took focus away (a click elsewhere, a phone's "Done", a tab switch). */
  blurred: boolean;
}

/** A range of UTF-16 code units in a text entry's value. */
export interface TextRange {
  /** The index of the range's first code unit. */
  start: number;

  /** The index one past the range's last code unit. */
  end: number;
}

/**
 * One hidden DOM `<input>` that receives typing for text the game draws
 * itself. The browser does the hard parts (keyboard layouts, IME
 * composition, clipboard, phone keyboards, screen readers); the entry
 * exposes the result as data.
 */
export interface TextEntry {
  /** The current text, as the DOM input holds it. */
  readonly value: string;

  /** The start of the selection, in UTF-16 code units. Equal to `selectionEnd` when it's just a caret. */
  readonly selectionStart: number;

  /** The end of the selection, in UTF-16 code units. */
  readonly selectionEnd: number;

  /** The IME composition range, or `null` when the player isn't composing. */
  readonly composition: TextRange | null;

  /** Whether the hidden input has focus, so the player's typing goes to it. */
  readonly isFocused: boolean;

  /** The hidden `<input>` element, for tests and for advanced integrations. */
  readonly element: HTMLInputElement;

  /**
   * Replaces the text, for clearing or prefilling it. The selection is
   * clamped to the new text. Doesn't count as a change in
   * {@link TextEntryEvents}, the same way setting a DOM input's value
   * doesn't raise `input`.
   * @param value - The new text.
   */
  setValue(value: string): void;

  /**
   * Selects a range of the text, or places the caret when `start` equals
   * `end`.
   * @param start - The selection's start, in UTF-16 code units.
   * @param end - The selection's end, in UTF-16 code units.
   */
  setSelection(start: number, end: number): void;

  /**
   * Places the hidden element over a rectangle, so phone keyboards scroll
   * it into view and IME candidate windows open next to it.
   * @param rect - The rectangle, in CSS pixels relative to the container.
   */
  setScreenRect(rect: CssRect): void;

  /**
   * Sets the element's HTML attributes. Fields left `undefined` are
   * removed.
   * @param attributes - The attributes to set.
   */
  setAttributes(attributes: TextEntryAttributes): void;

  /**
   * Focuses the hidden element. A phone only opens its keyboard when this
   * is called inside a user gesture's event handler (`pointerup`, `click`,
   * `touchend`).
   */
  focus(): void;

  /** Removes focus from the hidden element. */
  blur(): void;

  /**
   * Returns what happened since the last call, and clears it. Events
   * arrive from the DOM between ticks; draining them once per tick lets a
   * system react to each one exactly once.
   * @returns The events since the last call.
   */
  takeEvents(): TextEntryEvents;

  /** Removes the hidden element and its listeners. */
  dispose(): void;
}

const enterCode = 'Enter';
const escapeCode = 'Escape';
const tabCode = 'Tab';

/** The `keyCode` browsers report for a key event that's part of an IME composition. */
const imeProcessKeyCode = 229;

const attributeNames: Record<keyof TextEntryAttributes, string> = {
  ariaLabel: 'aria-label',
  inputMode: 'inputmode',
  autocomplete: 'autocomplete',
  autocapitalize: 'autocapitalize',
  enterKeyHint: 'enterkeyhint',
  maxLength: 'maxlength',
};

function createNoEvents(): TextEntryEvents {
  return {
    changed: false,
    submitted: false,
    cancelled: false,
    blurred: false,
  };
}

function toAttributeValue(
  key: keyof TextEntryAttributes,
  value: TextEntryAttributes[keyof TextEntryAttributes],
): string | null {
  if (value === undefined) {
    return null;
  }

  if (key === 'maxLength') {
    return Number.isFinite(value)
      ? String(Math.max(0, Math.floor(Number(value))))
      : null;
  }

  return String(value);
}

function createHiddenInput(): HTMLInputElement {
  const element = document.createElement('input');

  element.type = 'text';
  element.spellcheck = false;

  // Invisible but still focusable and still laid out over the field: a
  // phone scrolls a focused input into view above its keyboard, and an IME
  // opens its candidate window next to it, so it has to be where the field
  // is. `opacity: 0` also hides the browser's own caret and selection
  // highlight, which the game draws itself. `pointer-events: none` lets
  // taps through to the game's own hit test. A 16px font stops iOS from
  // zooming the page when the input is focused.
  Object.assign(element.style, {
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: '1px',
    height: '1px',
    margin: '0',
    padding: '0',
    border: '0',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'transparent',
    color: 'transparent',
    caretColor: 'transparent',
    fontSize: '16px',
    opacity: '0',
    pointerEvents: 'none',
  });

  return element;
}

function isComposingKey(event: KeyboardEvent): boolean {
  // `keyCode` is deprecated, but it's the only way to recognize the
  // keydown that some browsers send just before `compositionstart`.
  // eslint-disable-next-line sonarjs/deprecation
  return event.isComposing || event.keyCode === imeProcessKeyCode;
}

/**
 * Creates a text entry: a hidden `<input>` appended to `container` that
 * receives the player's typing for text the game draws itself.
 *
 * It enforces the keyboard rules a game needs around a text box:
 * - A key that was already held when the input was focused (e.g. the Enter
 *   that opened the menu) doesn't auto-repeat into it.
 * - Enter and Escape are recorded as `submitted`/`cancelled` and have no
 *   browser behavior, except during an IME composition, where Enter
 *   commits the composition and Escape cancels it. Holding Enter submits
 *   once.
 * - Tab does nothing, since there's no tab order between game text fields.
 *
 * `KeyboardInputSource` ignores every key typed into an editable element,
 * so keys typed here never reach the game's input actions.
 *
 * If `container` isn't positioned, it's made `position: relative`, so the
 * element can be placed over a rectangle of it.
 * @param container - The element the game's canvas is in.
 * @returns The text entry.
 */
export function createTextEntry(container: HTMLElement): TextEntry {
  const element = createHiddenInput();
  const keysPressedWhileFocused = new Set<string>();
  const attributes = new Map<string, string>();
  let lastRect: CssRect | null = null;
  let events = createNoEvents();
  let isFocused = false;
  let composition: TextRange | null = null;

  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat && !keysPressedWhileFocused.has(event.code)) {
      event.preventDefault();

      return;
    }

    keysPressedWhileFocused.add(event.code);

    if (isComposingKey(event)) {
      return;
    }

    if (event.code === enterCode || event.key === enterCode) {
      event.preventDefault();
      events.submitted ||= !event.repeat;

      return;
    }

    if (event.code === escapeCode || event.key === escapeCode) {
      event.preventDefault();
      events.cancelled ||= !event.repeat;

      return;
    }

    if (event.code === tabCode || event.key === tabCode) {
      event.preventDefault();
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    keysPressedWhileFocused.delete(event.code);
  };

  const onInput = (): void => {
    events.changed = true;
  };

  const onCompositionStart = (): void => {
    const start = element.selectionStart ?? element.value.length;

    composition = { start, end: start };
  };

  const onCompositionUpdate = (event: CompositionEvent): void => {
    if (composition === null) {
      onCompositionStart();
    }

    if (composition !== null) {
      composition = {
        start: composition.start,
        end: composition.start + event.data.length,
      };
    }
  };

  const onCompositionEnd = (): void => {
    composition = null;
    events.changed = true;
  };

  const onFocus = (): void => {
    isFocused = true;
    keysPressedWhileFocused.clear();
  };

  const onBlur = (): void => {
    isFocused = false;
    composition = null;
    keysPressedWhileFocused.clear();
    events.blurred = true;
  };

  element.addEventListener('keydown', onKeyDown);
  element.addEventListener('keyup', onKeyUp);
  element.addEventListener('input', onInput);
  element.addEventListener('compositionstart', onCompositionStart);
  element.addEventListener('compositionupdate', onCompositionUpdate);
  element.addEventListener('compositionend', onCompositionEnd);
  element.addEventListener('focus', onFocus);
  element.addEventListener('blur', onBlur);

  container.appendChild(element);

  return {
    get value(): string {
      return element.value;
    },
    get selectionStart(): number {
      return element.selectionStart ?? element.value.length;
    },
    get selectionEnd(): number {
      return element.selectionEnd ?? element.value.length;
    },
    get composition(): TextRange | null {
      return composition;
    },
    get isFocused(): boolean {
      return isFocused;
    },
    element,

    setValue(value: string): void {
      if (element.value === value) {
        return;
      }

      const start = element.selectionStart ?? value.length;
      const end = element.selectionEnd ?? value.length;

      element.value = value;
      element.setSelectionRange(
        Math.min(start, value.length),
        Math.min(end, value.length),
      );
    },

    setSelection(start: number, end: number): void {
      element.setSelectionRange(start, end);
    },

    setScreenRect(rect: CssRect): void {
      if (
        lastRect &&
        lastRect.left === rect.left &&
        lastRect.top === rect.top &&
        lastRect.width === rect.width &&
        lastRect.height === rect.height
      ) {
        return;
      }

      lastRect = { ...rect };
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
    },

    setAttributes(newAttributes: TextEntryAttributes): void {
      for (const key of Object.keys(attributeNames) as Array<
        keyof TextEntryAttributes
      >) {
        const name = attributeNames[key];
        const value = toAttributeValue(key, newAttributes[key]);

        if ((attributes.get(name) ?? null) === value) {
          continue;
        }

        if (value === null) {
          attributes.delete(name);
          element.removeAttribute(name);

          continue;
        }

        attributes.set(name, value);
        element.setAttribute(name, value);
      }
    },

    focus(): void {
      element.focus({ preventScroll: true });
    },

    blur(): void {
      element.blur();
    },

    takeEvents(): TextEntryEvents {
      const taken = events;

      events = createNoEvents();

      return taken;
    },

    dispose(): void {
      element.removeEventListener('keydown', onKeyDown);
      element.removeEventListener('keyup', onKeyUp);
      element.removeEventListener('input', onInput);
      element.removeEventListener('compositionstart', onCompositionStart);
      element.removeEventListener('compositionupdate', onCompositionUpdate);
      element.removeEventListener('compositionend', onCompositionEnd);
      element.removeEventListener('focus', onFocus);
      element.removeEventListener('blur', onBlur);
      element.remove();
    },
  };
}
