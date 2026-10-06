import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTextEntry, TextEntry } from './text-entry';

describe('createTextEntry', () => {
  let container: HTMLDivElement;
  let entry: TextEntry;

  const keyDown = (
    code: string,
    init: KeyboardEventInit = {},
  ): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      code,
      key: code,
      bubbles: true,
      cancelable: true,
      ...init,
    });

    entry.element.dispatchEvent(event);

    return event;
  };

  const type = (value: string): void => {
    entry.element.value = value;
    entry.element.dispatchEvent(new Event('input', { bubbles: true }));
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    entry = createTextEntry(container);
  });

  afterEach(() => {
    entry.dispose();
    container.remove();
  });

  it('appends a hidden input to the container and makes the container a positioning context', () => {
    expect(entry.element.parentElement).toBe(container);
    expect(entry.element.style.position).toBe('absolute');
    expect(entry.element.style.pointerEvents).toBe('none');
    expect(container.style.position).toBe('relative');
  });

  it('leaves an already positioned container alone', () => {
    const positioned = document.createElement('div');

    positioned.style.position = 'absolute';

    const other = createTextEntry(positioned);

    expect(positioned.style.position).toBe('absolute');
    other.dispose();
  });

  it('places the element over a screen rect', () => {
    entry.setScreenRect({ left: 10, top: 20, width: 200, height: 40 });

    expect(entry.element.style.left).toBe('10px');
    expect(entry.element.style.top).toBe('20px');
    expect(entry.element.style.width).toBe('200px');
    expect(entry.element.style.height).toBe('40px');
  });

  it('sets and removes attributes', () => {
    entry.setAttributes({
      ariaLabel: 'Pilot name',
      inputMode: 'numeric',
      enterKeyHint: 'done',
      maxLength: 12,
    });

    expect(entry.element.getAttribute('aria-label')).toBe('Pilot name');
    expect(entry.element.getAttribute('inputmode')).toBe('numeric');
    expect(entry.element.getAttribute('enterkeyhint')).toBe('done');
    expect(entry.element.getAttribute('maxlength')).toBe('12');

    entry.setAttributes({ maxLength: Number.POSITIVE_INFINITY });

    expect(entry.element.hasAttribute('aria-label')).toBe(false);
    expect(entry.element.hasAttribute('maxlength')).toBe(false);
  });

  it('reports typing as a change and drains events once', () => {
    type('abc');

    expect(entry.value).toBe('abc');
    expect(entry.takeEvents().changed).toBe(true);
    expect(entry.takeEvents().changed).toBe(false);
  });

  it('keeps the selection inside the value when it is replaced', () => {
    entry.setValue('hello');
    entry.setSelection(5, 5);
    entry.setValue('hi');

    expect(entry.selectionStart).toBe(2);
    expect(entry.selectionEnd).toBe(2);
    expect(entry.takeEvents().changed).toBe(false);
  });

  it('tracks focus and reports blur', () => {
    entry.focus();
    expect(entry.isFocused).toBe(true);

    entry.blur();
    expect(entry.isFocused).toBe(false);
    expect(entry.takeEvents().blurred).toBe(true);
  });

  it('submits on Enter and cancels on Escape, without browser behavior', () => {
    const enter = keyDown('Enter');

    expect(enter.defaultPrevented).toBe(true);

    const escape = keyDown('Escape');

    expect(escape.defaultPrevented).toBe(true);

    const events = entry.takeEvents();

    expect(events.submitted).toBe(true);
    expect(events.cancelled).toBe(true);
  });

  it('submits once while Enter is held', () => {
    keyDown('Enter');
    entry.takeEvents();
    keyDown('Enter', { repeat: true });

    expect(entry.takeEvents().submitted).toBe(false);
  });

  it('does not submit or cancel during an IME composition', () => {
    keyDown('Enter', { isComposing: true });
    keyDown('Escape', { keyCode: 229 });

    const events = entry.takeEvents();

    expect(events.submitted).toBe(false);
    expect(events.cancelled).toBe(false);
  });

  it('cancels Tab', () => {
    expect(keyDown('Tab').defaultPrevented).toBe(true);
  });

  it('does not let a key held before focusing auto-repeat into the input', () => {
    entry.focus();

    const repeat = keyDown('KeyA', { repeat: true });
    const enterRepeat = keyDown('Enter', { repeat: true });

    expect(repeat.defaultPrevented).toBe(true);
    expect(enterRepeat.defaultPrevented).toBe(true);
    expect(entry.takeEvents().submitted).toBe(false);
  });

  it('lets a key pressed while focused auto-repeat', () => {
    entry.focus();
    keyDown('KeyA');

    expect(keyDown('KeyA', { repeat: true }).defaultPrevented).toBe(false);
  });

  it('tracks the IME composition range and reports its end as a change', () => {
    entry.setValue('ab');
    entry.setSelection(2, 2);

    entry.element.dispatchEvent(new CompositionEvent('compositionstart'));
    entry.element.dispatchEvent(
      new CompositionEvent('compositionupdate', { data: 'にほ' }),
    );

    expect(entry.composition).toEqual({ start: 2, end: 4 });

    entry.element.dispatchEvent(new CompositionEvent('compositionend'));

    expect(entry.composition).toBeNull();
    expect(entry.takeEvents().changed).toBe(true);
  });

  it('removes the element on dispose', () => {
    const { element } = entry;

    entry.dispose();

    expect(element.isConnected).toBe(false);
  });
});
