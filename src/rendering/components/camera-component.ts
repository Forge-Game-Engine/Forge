import { Component } from '../../ecs/index.js';
import { Axis1dAction, Axis2dAction } from '../../input/index.js';
import { Rect } from '../../math/index.js';

/**
 * Options for configuring the `CameraComponent`.
 */
export type CameraComponentOptions = {
  /** The current zoom level of the camera. */
  zoom: number;

  /** The sensitivity of the zoom controls. */
  zoomSensitivity: number;

  /** The sensitivity of the panning controls. */
  panSensitivity: number;

  /** The minimum zoom level allowed. */
  minZoom: number;

  /** The maximum zoom level allowed. */
  maxZoom: number;

  /** Indicates if the camera is static (non-movable). */
  isStatic: boolean;

  /** Optional input action for zooming the camera. */
  zoomInput?: Axis1dAction;

  /** Optional input action for panning the camera. */
  panInput?: Axis2dAction;

  /** Optional scissor rectangle to limit the camera's rendering area. */
  scissorRect?: Rect;
};

/**
 * Default options for the `CameraComponent`.
 */
const defaultOptions: CameraComponentOptions = {
  zoomSensitivity: 1,
  panSensitivity: 3,
  minZoom: 0.5,
  maxZoom: 3,
  isStatic: false,
  zoom: 1,
};

/**
 * The `CameraComponent` class implements the `Component` interface and represents
 * a camera in the rendering system. It provides properties for zooming and panning
 * sensitivity, as well as options to restrict zoom levels and enable/disable panning
 * and zooming.
 */
export class CameraComponent extends Component {
  /** The current zoom level of the camera. */
  public zoom: number;

  /** The sensitivity of the zoom controls. */
  public zoomSensitivity: number;

  /** The sensitivity of the panning controls. */
  public panSensitivity: number;

  /** The minimum zoom level allowed. */
  public minZoom: number;

  /** The maximum zoom level allowed. */
  public maxZoom: number;

  /** Indicates if the camera is static (non-movable). */
  public isStatic: boolean;

  public scissorRect?: Rect;

  public zoomInput?: Axis1dAction;

  public panInput?: Axis2dAction;

  /**
   * Constructs a new instance of the `CameraComponent` class with the given options.
   * @param options - Partial options to configure the camera component.
   */
  constructor(options: Partial<CameraComponentOptions> = defaultOptions) {
    super();

    const mergedOptions: CameraComponentOptions = {
      ...defaultOptions,
      ...options,
    };

    this.zoom = mergedOptions.zoom;
    this.zoomSensitivity = mergedOptions.zoomSensitivity;
    this.panSensitivity = mergedOptions.panSensitivity;
    this.minZoom = mergedOptions.minZoom;
    this.maxZoom = mergedOptions.maxZoom;
    this.isStatic = mergedOptions.isStatic;
    this.zoomInput = mergedOptions.zoomInput;
    this.panInput = mergedOptions.panInput;
    this.scissorRect = mergedOptions.scissorRect;
  }

  /**
   * Creates a default camera component with the option to set it as static.
   * @param isStatic - Indicates if the camera should be static (default: false).
   * @returns A new `CameraComponent` instance with default settings.
   */
  public static createDefaultCamera(
    isStatic: boolean = false,
  ): CameraComponent {
    const camera = new CameraComponent();
    camera.isStatic = isStatic;

    return camera;
  }
}
