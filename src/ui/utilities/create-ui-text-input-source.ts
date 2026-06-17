import { ParameterizedForgeEvent } from '../../events/index.js';

/**
 * A thin wrapper around an off-screen DOM `<input>` element that captures
 * character input — including IME composition — and exposes it as Forge
 * events.
 *
 * This is the Path 2 text-input integration described in the UI roadmap:
 * the DOM element lives strictly behind this utility boundary and is never
 * referenced from widget logic.
 *
 * Usage:
 * 1. Call {@link createUiTextInputSource} once per canvas / root container.
 * 2. When an input box gains focus, call {@link UiTextInputSource.focus}.
 * 3. Subscribe to {@link UiTextInputSource.onInput} to receive character
 *    insertions (drives the `insert` edit command).
 * 4. On blur, call {@link UiTextInputSource.blur}.
 * 5. On cleanup, call {@link UiTextInputSource.stop} to remove the DOM element.
 *
 * IME / composition:
 * - `onInput` fires for every committed character, including composed text.
 * - `onCompositionComplete` fires when an IME composition session completes
 *   with the full composed string. Callers may choose to handle only this
 *   event and ignore individual `onInput` events during composition.
 */
export interface UiTextInputSource {
  /**
   * Fires when the user types a character or pastes text.
   * The payload is the inserted text (may be empty string for delete-style
   * InputEvents or when `InputEvent.data` is null).
   */
  onInput: ParameterizedForgeEvent<string>;

  /**
   * Fires when an IME composition session ends.
   * The payload is the full composed string (`CompositionEvent.data`).
   */
  onCompositionComplete: ParameterizedForgeEvent<string>;

  /**
   * Focuses the hidden input element, placing it in capture mode.
   *
   * @param value - The current field value (written to the DOM input so
   *   that clipboard operations see the correct content).
   * @param caretIndex - The current caret position within `value`.
   */
  focus(value: string, caretIndex: number): void;

  /** Removes focus from the hidden input element. */
  blur(): void;

  /**
   * Removes the hidden input element from the container and deregisters all
   * DOM event listeners. Call when the owning UI is destroyed.
   */
  stop(): void;
}

/**
 * Creates a {@link UiTextInputSource} backed by an off-screen `<input>` element
 * appended to `container`.
 *
 * The element is positioned at `(−9999 px, −9999 px)` so it is off-screen but
 * still reachable by the browser's focus manager and IME system.
 *
 * @param container - The HTML element to append the hidden input to. Use the
 *   same container that the game canvas is rendered in.
 * @returns A {@link UiTextInputSource} that exposes character-input events.
 */
export function createUiTextInputSource(
  container: HTMLElement,
): UiTextInputSource {
  const input = document.createElement('input');

  input.type = 'text';
  input.autocomplete = 'off';
  input.style.cssText =
    'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';

  container.appendChild(input);

  const onInput = new ParameterizedForgeEvent<string>('ui.textInput');
  const onCompositionComplete = new ParameterizedForgeEvent<string>(
    'ui.compositionComplete',
  );

  let composing = false;

  const handleInput = (event: Event): void => {
    if (composing) {
      return;
    }

    const inputEvent = event as InputEvent;
    const data = inputEvent.data ?? '';

    onInput.raise(data);

    // Reset the DOM input value after each keystroke so its contents do not
    // accumulate. The Forge state is the authoritative source.
    input.value = '';
  };

  const handleCompositionStart = (): void => {
    composing = true;
  };

  const handleCompositionEnd = (event: CompositionEvent): void => {
    composing = false;
    onCompositionComplete.raise(event.data ?? '');
    // Also fire onInput with the composed text so callers only need to
    // subscribe to onInput.
    onInput.raise(event.data ?? '');
    input.value = '';
  };

  input.addEventListener('input', handleInput);
  input.addEventListener('compositionstart', handleCompositionStart);
  input.addEventListener('compositionend', handleCompositionEnd);

  return {
    onInput,
    onCompositionComplete,

    focus(value: string, caretIndex: number): void {
      input.value = value;
      input.setSelectionRange(caretIndex, caretIndex);
      input.focus();
    },

    blur(): void {
      input.blur();
    },

    stop(): void {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('compositionstart', handleCompositionStart);
      input.removeEventListener('compositionend', handleCompositionEnd);
      container.removeChild(input);
      onInput.clear();
      onCompositionComplete.clear();
    },
  };
}
