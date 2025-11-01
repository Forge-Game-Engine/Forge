import Rive from '@rive-app/webgl2';
import { ModelProperty } from './model-property.js';

/**
 * Represents a model property that holds a boolean value.
 * This is used to define properties in a view model that can take on boolean values.
 */
export type BooleanModelProperty = ModelProperty<
  Rive.ViewModelInstanceBoolean,
  boolean
>;
