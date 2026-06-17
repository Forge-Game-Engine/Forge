import { afterEach, describe, expect, it } from 'vitest';
import { createUiTextInputSource } from './create-ui-text-input-source';

function makeContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);

  return div;
}

describe('createUiTextInputSource', () => {
  const containers: HTMLElement[] = [];

  afterEach(() => {
    for (const c of containers) {
      document.body.removeChild(c);
    }

    containers.length = 0;
  });

  it('appends hidden input to container', () => {
    const container = makeContainer();
    containers.push(container);

    createUiTextInputSource(container);

    const inputs = container.querySelectorAll('input');
    expect(inputs).toHaveLength(1);
  });

  it('fires onInput when DOM input event is dispatched', () => {
    const container = makeContainer();
    containers.push(container);

    const source = createUiTextInputSource(container);
    const received: string[] = [];
    source.onInput.registerListener((data) => received.push(data));

    const input = container.querySelector('input')!;

    // Simulate a character input event
    const event = new InputEvent('input', { data: 'a', bubbles: true });
    input.dispatchEvent(event);

    expect(received).toEqual(['a']);
  });

  it('fires onCompositionComplete on compositionend', () => {
    const container = makeContainer();
    containers.push(container);

    const source = createUiTextInputSource(container);
    const composed: string[] = [];
    source.onCompositionComplete.registerListener((d) => composed.push(d));

    const input = container.querySelector('input')!;

    input.dispatchEvent(new Event('compositionstart'));
    input.dispatchEvent(
      new CompositionEvent('compositionend', { data: '日本語' }),
    );

    expect(composed).toEqual(['日本語']);
  });

  it('also fires onInput after compositionend', () => {
    const container = makeContainer();
    containers.push(container);

    const source = createUiTextInputSource(container);
    const inputs: string[] = [];
    source.onInput.registerListener((d) => inputs.push(d));

    const input = container.querySelector('input')!;

    input.dispatchEvent(new Event('compositionstart'));
    input.dispatchEvent(new CompositionEvent('compositionend', { data: 'こ' }));

    expect(inputs).toContain('こ');
  });

  it('does not fire onInput during composition', () => {
    const container = makeContainer();
    containers.push(container);

    const source = createUiTextInputSource(container);
    const inputs: string[] = [];
    source.onInput.registerListener((d) => inputs.push(d));

    const input = container.querySelector('input')!;

    input.dispatchEvent(new Event('compositionstart'));
    // Fire an input event mid-composition — should be suppressed
    input.dispatchEvent(new InputEvent('input', { data: 'k' }));

    expect(inputs).toHaveLength(0);
  });

  it('focus sets input value and calls .focus()', () => {
    const container = makeContainer();
    containers.push(container);

    const source = createUiTextInputSource(container);
    const input = container.querySelector('input')!;

    source.focus('hello', 3);

    expect(input.value).toBe('hello');
  });

  it('stop removes input from container', () => {
    const container = makeContainer();
    containers.push(container);

    const source = createUiTextInputSource(container);

    source.stop();

    expect(container.querySelectorAll('input')).toHaveLength(0);
  });
});
