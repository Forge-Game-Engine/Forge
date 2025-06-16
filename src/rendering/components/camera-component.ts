import type { Component } from '../../ecs';

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

  /** Indicates if panning is allowed. */
  allowPanning: boolean;

  /** Indicates if zooming is allowed. */
  allowZooming: boolean;
};

/**
 * Default options for the `CameraComponent`.
 */
const defaultOptions: CameraComponentOptions = {
  zoomSensitivity: 0.001,
  panSensitivity: 0.5,
  minZoom: 0.5,
  maxZoom: 3,
  isStatic: false,
  zoom: 1,
  allowPanning: true,
  allowZooming: true,
};

/**
 * The `CameraComponent` class implements the `Component` interface and represents
 * a camera in the rendering system. It provides properties for zooming and panning
 * sensitivity, as well as options to restrict zoom levels and enable/disable panning
 * and zooming.
 */
export class CameraComponent implements Component {
  /** A static symbol property that uniquely identifies the `CameraComponent`. */
  public static readonly symbol = Symbol('Camera');

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

  /** The name property holds the unique symbol for this component. */
  public name: symbol;

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

  /** Indicates if panning is allowed. */
  public allowPanning: boolean;

  /** Indicates if zooming is allowed. */
  public allowZooming: boolean;

  /**
   * Constructs a new instance of the `CameraComponent` class with the given options.
   * @param options - Partial options to configure the camera component.
   */
  constructor(options: Partial<CameraComponentOptions> = defaultOptions) {
    const mergedOptions: CameraComponentOptions = {
      ...defaultOptions,
      ...options,
    };

    this.name = CameraComponent.symbol;
    this.zoom = mergedOptions.zoom;
    this.zoomSensitivity = mergedOptions.zoomSensitivity;
    this.panSensitivity = mergedOptions.panSensitivity;
    this.minZoom = mergedOptions.minZoom;
    this.maxZoom = mergedOptions.maxZoom;
    this.isStatic = mergedOptions.isStatic;
    this.allowPanning = mergedOptions.allowPanning;
    this.allowZooming = mergedOptions.allowZooming;
  }
}
