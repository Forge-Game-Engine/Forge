import { describe, expect, it } from 'vitest';
import { Color } from '../../rendering/color.js';
import { parseRichText } from './parse-rich-text.js';

describe('parseRichText', () => {
  it('returns plain text unchanged with no runs', () => {
    expect(parseRichText('plain text')).toEqual({
      text: 'plain text',
      colorRuns: [],
      boldRuns: [],
    });
  });

  it('strips a color tag into a run over the stripped text', () => {
    const { text, colorRuns } = parseRichText('a <color=#ff0000>red</color> b');

    expect(text).toBe('a red b');
    expect(colorRuns).toEqual([
      { start: 2, end: 5, color: new Color(1, 0, 0, 1) },
    ]);
  });

  it('strips a bold tag into a run', () => {
    const { text, boldRuns } = parseRichText('<b>bold</b> regular');

    expect(text).toBe('bold regular');
    expect(boldRuns).toEqual([{ start: 0, end: 4 }]);
  });

  it('keeps sequential color runs separate', () => {
    const { text, colorRuns } = parseRichText(
      '<color=#ff0000>red</color> and <color=#00ff00>green</color>',
    );

    expect(text).toBe('red and green');
    expect(colorRuns).toEqual([
      { start: 0, end: 3, color: new Color(1, 0, 0, 1) },
      { start: 8, end: 13, color: new Color(0, 1, 0, 1) },
    ]);
  });

  it('flattens nested colors, the innermost winning', () => {
    const { text, colorRuns } = parseRichText(
      '<color=#ff0000>a<color=#0000ff>b</color>c</color>',
    );

    expect(text).toBe('abc');
    expect(colorRuns).toEqual([
      { start: 0, end: 1, color: new Color(1, 0, 0, 1) },
      { start: 1, end: 2, color: new Color(0, 0, 1, 1) },
      { start: 2, end: 3, color: new Color(1, 0, 0, 1) },
    ]);
  });

  it('merges nested bold tags into one run', () => {
    expect(parseRichText('<b>a<b>b</b>c</b>').boldRuns).toEqual([
      { start: 0, end: 3 },
    ]);
  });

  it('applies bold and color independently over overlapping ranges', () => {
    const { text, colorRuns, boldRuns } = parseRichText(
      '<b>a<color=#00ff00>b</b>c</color>',
    );

    expect(text).toBe('abc');
    expect(boldRuns).toEqual([{ start: 0, end: 2 }]);
    expect(colorRuns).toEqual([
      { start: 1, end: 3, color: new Color(0, 1, 0, 1) },
    ]);
  });

  it.each([
    ['#f00', new Color(1, 0, 0, 1)],
    ['#f008', new Color(1, 0, 0, 0x88 / 255)],
    ['#00FF00', new Color(0, 1, 0, 1)],
    ['#0000ff80', new Color(0, 0, 1, 0x80 / 255)],
  ])('parses the color value %s, alpha included', (value, expected) => {
    expect(parseRichText(`<color=${value}>x</color>`).colorRuns).toEqual([
      { start: 0, end: 1, color: expected },
    ]);
  });

  it('runs an unclosed tag to the end of the string', () => {
    const { text, colorRuns, boldRuns } = parseRichText(
      'a <b>b <color=#ff0000>c',
    );

    expect(text).toBe('a b c');
    expect(boldRuns).toEqual([{ start: 2, end: 5 }]);
    expect(colorRuns).toEqual([
      { start: 4, end: 5, color: new Color(1, 0, 0, 1) },
    ]);
  });

  it.each(['HP < 50%', 'a<3', 'x <b y', '<b', '< b>', '<>', '</>', 'tail <'])(
    'keeps "%s" as literal text',
    (markup) => {
      expect(parseRichText(markup)).toEqual({
        text: markup,
        colorRuns: [],
        boldRuns: [],
      });
    },
  );

  it.each([
    ['an unknown tag', '<i>x</i>'],
    ['an uppercase tag name', '<B>x</B>'],
    ['a color without a value', '<color>x</color>'],
    ['an invalid color value', '<color=red>x</color>'],
    ['a malformed hex color', '<color=#ff00f>x</color>'],
    ['bold with a value', '<b=1>x</b=1>'],
    ['a closing tag with nothing open', 'x</b>'],
  ])('keeps %s as literal text', (_, markup) => {
    expect(parseRichText(markup)).toEqual({
      text: markup,
      colorRuns: [],
      boldRuns: [],
    });
  });

  it('keeps a stray closing tag literal without closing other tags', () => {
    const { text, boldRuns } = parseRichText('<b>a</color>b</b>');

    expect(text).toBe('a</color>b');
    expect(boldRuns).toEqual([{ start: 0, end: 10 }]);
  });

  it('indexes runs by UTF-16 code unit', () => {
    const { text, colorRuns } = parseRichText('😀<color=#ff0000>a</color>');

    expect(text).toBe('😀a');
    expect(colorRuns).toEqual([
      { start: 2, end: 3, color: new Color(1, 0, 0, 1) },
    ]);
  });
});
