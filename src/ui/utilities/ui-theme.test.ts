import { describe, expect, it } from 'vitest';
import { Color } from '../../rendering/color.js';
import {
  defaultUiTheme,
  mergeUiStyle,
  uiThemeToBaseStyle,
} from './ui-theme.js';
import { UiStyleOverride } from './apply-ui-state-style.js';

describe('defaultUiTheme', () => {
  it('has a white background color', () => {
    expect(defaultUiTheme.backgroundColor).toEqual(Color.white);
  });

  it('has state styles for hover, pressed, focused, disabled', () => {
    expect(defaultUiTheme.stateStyles.hover).toBeDefined();
    expect(defaultUiTheme.stateStyles.pressed).toBeDefined();
    expect(defaultUiTheme.stateStyles.focused).toBeDefined();
    expect(defaultUiTheme.stateStyles.disabled).toBeDefined();
  });

  it('has a positive corner radius', () => {
    expect(defaultUiTheme.cornerRadius).toBeGreaterThan(0);
  });

  it('has a positive font size', () => {
    expect(defaultUiTheme.fontSize).toBeGreaterThan(0);
  });
});

describe('mergeUiStyle', () => {
  it('returns a copy of base when overrides is undefined', () => {
    const base: UiStyleOverride = { borderWidth: 2, cornerRadius: 4 };
    const result = mergeUiStyle(base);

    expect(result).toEqual(base);
    expect(result).not.toBe(base);
  });

  it('layers overrides on top of base', () => {
    const base: UiStyleOverride = {
      tintColor: Color.white,
      borderWidth: 0,
      cornerRadius: 4,
    };
    const overrides: UiStyleOverride = {
      tintColor: new Color(1, 0, 0),
      borderWidth: 2,
    };
    const result = mergeUiStyle(base, overrides);

    expect(result.tintColor).toBe(overrides.tintColor);
    expect(result.borderWidth).toBe(2);
    expect(result.cornerRadius).toBe(4);
  });

  it('keeps base fields that are not in overrides', () => {
    const base: UiStyleOverride = {
      opacity: 0.5,
      cornerRadius: 8,
      borderWidth: 1,
    };
    const overrides: UiStyleOverride = { opacity: 1 };
    const result = mergeUiStyle(base, overrides);

    expect(result.opacity).toBe(1);
    expect(result.cornerRadius).toBe(8);
    expect(result.borderWidth).toBe(1);
  });

  it('does not mutate the base object', () => {
    const base: UiStyleOverride = { borderWidth: 0 };
    mergeUiStyle(base, { borderWidth: 5 });

    expect(base.borderWidth).toBe(0);
  });

  it('does not mutate the overrides object', () => {
    const base: UiStyleOverride = { borderWidth: 0 };
    const overrides: UiStyleOverride = { borderWidth: 5 };
    mergeUiStyle(base, overrides);

    expect(overrides.borderWidth).toBe(5);
  });

  it('overrides with undefined values do not overwrite base values', () => {
    const base: UiStyleOverride = { borderWidth: 2 };
    const overrides: UiStyleOverride = {};
    const result = mergeUiStyle(base, overrides);

    expect(result.borderWidth).toBe(2);
  });
});

describe('uiThemeToBaseStyle', () => {
  it('maps theme backgroundColor to tintColor', () => {
    const style = uiThemeToBaseStyle(defaultUiTheme);

    expect(style.tintColor).toBe(defaultUiTheme.backgroundColor);
  });

  it('maps theme borderColor and borderWidth', () => {
    const style = uiThemeToBaseStyle(defaultUiTheme);

    expect(style.borderColor).toBe(defaultUiTheme.borderColor);
    expect(style.borderWidth).toBe(defaultUiTheme.borderWidth);
  });

  it('maps theme cornerRadius', () => {
    const style = uiThemeToBaseStyle(defaultUiTheme);

    expect(style.cornerRadius).toBe(defaultUiTheme.cornerRadius);
  });

  it('sets opacity to 1', () => {
    const style = uiThemeToBaseStyle(defaultUiTheme);

    expect(style.opacity).toBe(1);
  });

  it('can be fed directly into mergeUiStyle', () => {
    const base = uiThemeToBaseStyle(defaultUiTheme);
    const tint = new Color(0, 1, 0);
    const result = mergeUiStyle(base, { tintColor: tint });

    expect(result.tintColor).toBe(tint);
    expect(result.cornerRadius).toBe(defaultUiTheme.cornerRadius);
  });
});
