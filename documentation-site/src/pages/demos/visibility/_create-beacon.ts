import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { degreesToRadians, Vector2 } from '@forge-game-engine/forge/math';
import {
  addParticleEmitterComponent,
  ParticleEmitter,
} from '@forge-game-engine/forge/particles';
import {
  addSpriteComponent,
  addVisibilityComponent,
  Color,
  createImageSprite,
  createTexture,
  RenderContext,
  VisibilityEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const sparkColor = new Color(0.4, 0.8, 1);
const coneSpread = degreesToRadians(15);

/**
 * Creates a beacon in the world: a base sprite with a lamp sprite and a
 * spark emitter parented to it. Hiding the base hides the lamp and stops
 * the emitter too, while sparks already in the air finish their lives.
 * @param world - The ECS world to add the beacon's entities to.
 * @param renderContext - The render context used to load the spark sprite.
 * @param renderLayer - The render layer the beacon is drawn on.
 * @param position - The world position of the beacon's base.
 * @returns The `VisibilityEcsComponent` on the beacon's base.
 */
export async function createBeacon(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  position: Vector2,
): Promise<VisibilityEcsComponent> {
  const solidSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayer,
  };

  const base = world.createEntity();

  addPositionComponent(world, base, { local: position });
  addSpriteComponent(world, base, {
    ...solidSprite,
    width: 60,
    height: 24,
    tintColor: new Color(0.45, 0.48, 0.55, 1),
  });

  const lamp = world.createEntity();

  addPositionComponent(world, lamp, { local: { x: 0, y: 30 } });
  addSpriteComponent(world, lamp, {
    ...solidSprite,
    width: 24,
    height: 36,
    tintColor: sparkColor,
  });
  world.setParent(lamp, base);

  const sparkImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_particle-pack/PNG (Transparent)/circle_01.png'),
  );
  const sparkEmitter = new ParticleEmitter(
    {
      ...createImageSprite(createTexture(renderContext, sparkImage), {
        pixelsPerUnit: 1,
      }),
      category: renderLayer,
      tintColor: sparkColor,
    },
    {
      emissionRate: 30,
      speedRange: { min: 120, max: 200 },
      // Math.PI / 2 points straight up.
      directionRange: {
        min: Math.PI / 2 - coneSpread,
        max: Math.PI / 2 + coneSpread,
      },
      drag: 0.5,
      scaleRange: { min: 0.03, max: 0.07 },
      lifetimeSecondsRange: { min: 1, max: 1.6 },
      lifetimeScaleReduction: 0,
      lifetimeOpacity: { start: 1, end: 0 },
    },
  );

  const sparks = world.createEntity();

  addPositionComponent(world, sparks, { local: { x: 0, y: 50 } });
  addParticleEmitterComponent(world, sparks, {
    emitters: new Map([['sparks', sparkEmitter]]),
  });
  world.setParent(sparks, base);

  return addVisibilityComponent(world, base);
}
