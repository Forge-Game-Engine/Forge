import { Entity } from '../../ecs';
import {
  createQuadGeometry,
  ForgeRenderLayer,
  Renderable,
  ShaderStore,
  SpriteMaterial,
} from '../../rendering';

export class AnimationCreator {
  private readonly _renderLayer: ForgeRenderLayer;
  private readonly _shaderStore: ShaderStore;
  private readonly _cameraEntity: Entity;

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
    spritesPerColumn: number,
    spritesPerRow: number,
    numFrames: number = spritesPerColumn * spritesPerRow,
  ): Renderable[] {
    const frames: Renderable[] = [];
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
          spritesPerColumn: spritesPerColumn,
          spritesPerRow: spritesPerRow,
          spriteIndex: i,
        }),
        spriteSheetMaterial,
      );
      frames.push(renderable);
    }

    return frames;
  }
}
