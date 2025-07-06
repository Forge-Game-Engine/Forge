import { ViewModelInstanceNumber } from '@rive-app/webgl2';
import { ModelProperty } from './model-property';

/**
 * Represents a model property that holds a number value.
 * This is used to define properties in a view model that can take on numeric values.
 */
export type NumberModelProperty = ModelProperty<
  ViewModelInstanceNumber,
  number
>;
