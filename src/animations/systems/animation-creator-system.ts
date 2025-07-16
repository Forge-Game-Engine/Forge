import { Entity } from '../../ecs';
import {
  createQuadGeometry,
  ForgeRenderLayer,
  Renderable,
  ShaderStore,
  SpriteMaterial,
} from '../../rendering';

export class AnimationCreator {
  private _renderLayer: ForgeRenderLayer;
  private _shaderStore: ShaderStore;
  private _cameraEntity: Entity;

  constructor(
    renderLayer: ForgeRenderLayer,
    shaderStore: ShaderStore,
    cameraEntity: Entity,
  ) {
    this._renderLayer = renderLayer;
    this._shaderStore = shaderStore;
    this._cameraEntity = cameraEntity;
  }

  public createAnimation(
    spriteSheet: HTMLImageElement,
    numColumns: number,
    numRows: number,
    numFrames: number = numColumns * numRows,
  ): Renderable[] {
    let frames: Renderable[] = new Array(numFrames);
    const spriteSheetMaterial = new SpriteMaterial(
      this._renderLayer.context,
      this._shaderStore,
      spriteSheet,
      this._cameraEntity,
    );
    // TODO: Should this store an array of renderables, or an array of quad geometries?
    for (let i = 0; i < numFrames; i++) {
      const renderable = new Renderable(
        createQuadGeometry(this._renderLayer.context, {
          spritesPerColumn: numColumns,
          spritesPerRow: numRows,
          spriteIndex: i,
        }),
        spriteSheetMaterial,
      );
      frames[i] = renderable;
    }

    return frames;
  }
}
