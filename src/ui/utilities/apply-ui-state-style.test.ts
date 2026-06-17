import { describe, expect, it } from 'vitest';
import { Color } from '../../rendering/color';
import { UiRenderableEcsComponent } from '../components/ui-renderable-component';
import {
  createUiState,
  UiStateEcsComponent,
} from '../components/ui-state-component';
import { Renderable } from '../../rendering/renderable';
import { UiInstanceComponents } from '../components/ui-instance-components';
import {
  applyUiStateStyle,
  UiStateStyleConfig,
  UiStyleOverride,
} from './apply-ui-state-style';

function makeRenderable(): UiRenderableEcsComponent {
  return {
    renderable: {} as Renderable<UiInstanceComponents>,
    enabled: true,
    tintColor: Color.white,
    borderColor: Color.transparent,
    borderWidth: 0,
    cornerRadius: 0,
    opacity: 1,
    zIndex: 0,
  };
}

const base: UiStyleOverride = {
  tintColor: Color.white,
  borderColor: Color.transparent,
  borderWidth: 0,
  cornerRadius: 0,
  opacity: 1,
};

describe('applyUiStateStyle', () => {
  it('applies base style when no state is active', () => {
    const renderable = makeRenderable();
    const state = createUiState();
    const config: UiStateStyleConfig = {};

    renderable.tintColor = Color.red;
    applyUiStateStyle(renderable, state, base, config);

    expect(renderable.tintColor).toBe(Color.white);
    expect(renderable.opacity).toBe(1);
  });

  it('applies hover override when hovered', () => {
    const renderable = makeRenderable();
    const state = createUiState();
    const hoverTint = new Color(0.8, 0.8, 0.8);
    const config: UiStateStyleConfig = { hover: { tintColor: hoverTint } };

    state.hovered = true;
    applyUiStateStyle(renderable, state, base, config);

    expect(renderable.tintColor).toBe(hoverTint);
  });

  it('applies pressed override on top of hover', () => {
    const renderable = makeRenderable();
    const state = createUiState();
    const hoverTint = new Color(0.8, 0.8, 0.8);
    const pressedTint = new Color(0.6, 0.6, 0.6);
    const config: UiStateStyleConfig = {
      hover: { tintColor: hoverTint },
      pressed: { tintColor: pressedTint },
    };

    state.hovered = true;
    state.pressed = true;
    applyUiStateStyle(renderable, state, base, config);

    expect(renderable.tintColor).toBe(pressedTint);
  });

  it('applies focused override independently of hover', () => {
    const renderable = makeRenderable();
    const state = createUiState();
    const focusBorder = new Color(0, 0.5, 1);
    const config: UiStateStyleConfig = {
      focused: { borderColor: focusBorder, borderWidth: 2 },
    };

    state.focused = true;
    applyUiStateStyle(renderable, state, base, config);

    expect(renderable.borderColor).toBe(focusBorder);
    expect(renderable.borderWidth).toBe(2);
  });

  it('applies disabled override over all other states', () => {
    const renderable = makeRenderable();
    const state = createUiState();
    const disabledOpacity = 0.4;
    const config: UiStateStyleConfig = {
      hover: { tintColor: new Color(0.8, 0.8, 0.8) },
      disabled: { opacity: disabledOpacity },
    };

    state.hovered = true;
    state.disabled = true;
    applyUiStateStyle(renderable, state, base, config);

    expect(renderable.opacity).toBe(disabledOpacity);
    // disabled takes priority over hover for opacity, hover tint was applied too but disabled doesn't override tint
    expect(renderable.tintColor).toBeInstanceOf(Color);
  });

  it('resets to base when state clears', () => {
    const renderable = makeRenderable();
    const state = createUiState();
    const hoverTint = new Color(0.8, 0.8, 0.8);
    const config: UiStateStyleConfig = { hover: { tintColor: hoverTint } };

    state.hovered = true;
    applyUiStateStyle(renderable, state, base, config);
    expect(renderable.tintColor).toBe(hoverTint);

    state.hovered = false;
    applyUiStateStyle(renderable, state, base, config);
    expect(renderable.tintColor).toBe(Color.white);
  });

  it('only applies defined override fields, leaving others unchanged from base', () => {
    const renderable = makeRenderable();
    const state: UiStateEcsComponent = createUiState();
    const config: UiStateStyleConfig = { hover: { borderWidth: 3 } };

    state.hovered = true;
    applyUiStateStyle(renderable, state, base, config);

    expect(renderable.borderWidth).toBe(3);
    expect(renderable.tintColor).toBe(Color.white);
    expect(renderable.opacity).toBe(1);
  });
});
