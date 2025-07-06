import { ViewModelInstanceString } from '@rive-app/webgl2';
import { ModelProperty } from './model-property';

/**
 * Represents a model property that holds a string value.
 * This is used to define properties in a view model that can take on string values.
 */
export type StringModelProperty = ModelProperty<
  ViewModelInstanceString,
  string
>;
