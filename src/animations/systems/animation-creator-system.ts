import {
  createQuadGeometry,
  ForgeRenderLayer,
  Geometry,
} from '../../rendering';

export class AnimationCreator {
  constructor() {}

  public createAnimation(
    renderLayer: ForgeRenderLayer,
    spritesPerColumn: number,
    spritesPerRow: number,
    numFrames: number = spritesPerColumn * spritesPerRow,
  ): Geometry[] {
    const frameGeometry: Geometry[] = [];

    // TODO: Should this store an array of renderables, or an array of quad geometries?
    for (let i = 0; i < numFrames; i++) {
      const geometry = createQuadGeometry(renderLayer.context, {
        spritesPerColumn: spritesPerColumn,
        spritesPerRow: spritesPerRow,
        spriteIndex: i,
      });

      frameGeometry.push(geometry);
      console.log(geometry)
    }

    return frameGeometry;
  }
}
