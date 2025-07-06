import { ViewModelInstanceEnum } from '@rive-app/webgl2';
import { ModelProperty } from './model-property';

/**
 * Represents a model property that holds an enum value.
 * This is used to define properties in a view model that can take on specific enumerated values.
 */
export type EnumModelProperty = ModelProperty<ViewModelInstanceEnum, string>;
