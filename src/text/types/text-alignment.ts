/**
 * Horizontal alignment values for `TextEcsComponent.horizontalAlign`. See
 * that field's own doc comment for what each value does.
 */
export const textHorizontalAlignments = {
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'justify',
} as const;

/** A value of {@link textHorizontalAlignments}. */
export type TextHorizontalAlign =
  (typeof textHorizontalAlignments)[keyof typeof textHorizontalAlignments];

/**
 * Vertical alignment values for `TextEcsComponent.verticalAlign`. See that
 * field's own doc comment for what each value does.
 */
export const textVerticalAlignments = {
  top: 'top',
  middle: 'middle',
  bottom: 'bottom',
  baseline: 'baseline',
  capline: 'capline',
} as const;

/** A value of {@link textVerticalAlignments}. */
export type TextVerticalAlign =
  (typeof textVerticalAlignments)[keyof typeof textVerticalAlignments];
