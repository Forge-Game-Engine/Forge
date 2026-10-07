import type {
  LinearMaskShape,
  RadialMaskShape,
} from '../../rendering/index.js';

/**
 * The shape a progress bar's fill is revealed with: a linear or radial
 * mask's shape (see `MaskEcsComponent`) without its `amount`, which the
 * progress bar sets from its value.
 */
export type UiFillShape =
  Omit<LinearMaskShape, 'amount'> | Omit<RadialMaskShape, 'amount'>;
