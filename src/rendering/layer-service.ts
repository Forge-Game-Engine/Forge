import type { Stoppable } from '../common/index.js';
import { Vector2 } from '../math/index.js';
import { RenderLayer } from './render-layers/render-layer.js';
import { ForgeRenderLayer } from './render-layers/forge-render-layer.js';
import { type CLEAR_STRATEGY_KEYS } from './enums/index.js';
import type { Game } from '../ecs/index.js';

/**
 * Options for creating a new render layer.
 */
export interface CreateLayerOptions {
  /** The dimensions of the layer. */
  dimensions?: { width: number; height: number };

  /** The strategy for clearing the layer. */
  clearStrategy?: CLEAR_STRATEGY_KEYS;
}

/**
 * The `LayerService` class manages the creation, registration, and resizing of render layers.
 */
export class LayerService implements Stoppable {
  private readonly _game: Game;
  private readonly _layers: Map<string, RenderLayer>;
  private readonly _resizeListener: () => void;

  /**
   * Constructs a new instance of the `LayerService` class.
   */
  constructor(game: Game) {
    this._game = game;
    this._layers = new Map();

    this._resizeListener = () => {
      this.resizeAllLayers();
    };

    game.onWindowResize.registerListener(this._resizeListener);
  }

  /**
   * Creates a new Forge render layer with a canvas and registers it.
   * @param layerName - The name of the layer.
   * @param clearStrategy - The strategy for clearing the layer (optional).
   * @param sortEntities - Whether to sort entities by their y position before rendering (optional).
   * @returns The created `ForgeRenderLayer` instance.
   */
  public createForgeRenderLayer(
    layerName: string,
    clearStrategy?: CLEAR_STRATEGY_KEYS,
    sortEntities?: boolean,
  ): ForgeRenderLayer {
    const canvas = this._createCanvas(`forge-layer-${layerName}`);
    const layer = new ForgeRenderLayer(
      layerName,
      canvas,
      clearStrategy,
      sortEntities,
    );

    this.registerLayer(layer);

    return layer;
  }

  /**
   * Registers an existing canvas element as a render layer.
   * @param layer - The render layer.
   * @returns The registered `RenderLayer` instance.
   */
  public registerLayer(layer: RenderLayer): void {
    this._layers.set(layer.name, layer);
  }

  /**
   * Retrieves a render layer by its name.
   * @param name - The name of the layer.
   * @returns The `RenderLayer` instance.
   * @throws An error if the layer is not found.
   */
  public getLayer<T extends RenderLayer>(name: string): T {
    const layer = this._layers.get(name);

    if (!layer) {
      throw new Error(`Layer ${name} not found`);
    }

    return layer as T;
  }

  /**
   * Resizes all registered layers to the specified dimensions.
   * @param dimensions - The new dimensions for the layers. If not provided, the window dimensions are used.
   */
  public resizeAllLayers(dimensions?: Vector2): void {
    const newDimensions =
      dimensions || new Vector2(window.innerWidth, window.innerHeight);

    for (const layer of this._layers.values()) {
      layer.resize(newDimensions.x, newDimensions.y);
    }
  }

  /**
   * Cleans up the layer service by removing the resize event listener.
   */
  public stop(): void {
    this._game.onWindowResize.deregisterListener(this._resizeListener);
  }

  /**
   * Creates a canvas element and appends it to the game container.
   * @param id - The ID to assign to the canvas element.
   * @returns The created canvas element.
   */
  private _createCanvas(id: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;

    this._game.container.appendChild(canvas);

    return canvas;
  }
}
