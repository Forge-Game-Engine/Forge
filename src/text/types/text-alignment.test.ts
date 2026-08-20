import { describe, expect, it } from 'vitest';
import {
  textHorizontalAlignments,
  textVerticalAlignments,
} from './text-alignment.js';

describe('textHorizontalAlignments', () => {
  it('maps every horizontal alignment value to itself', () => {
    expect(textHorizontalAlignments).toEqual({
      left: 'left',
      center: 'center',
      right: 'right',
      justify: 'justify',
    });
  });
});

describe('textVerticalAlignments', () => {
  it('maps every vertical alignment value to itself', () => {
    expect(textVerticalAlignments).toEqual({
      top: 'top',
      middle: 'middle',
      bottom: 'bottom',
      baseline: 'baseline',
      capline: 'capline',
    });
  });
});
