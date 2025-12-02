import { beforeEach, describe, expect, it } from 'vitest';
import {
  FlipComponent,
  PositionComponent,
  RotationComponent,
  ScaleComponent,
} from '../../common/index.js';
import { Entity, World } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { SpriteComponent } from '../components/index.js';
import { Sprite } from '../sprite.js';
import {
  defaultSpriteInstanceDataPopulator,
  SpriteInstanceDataPopulator,
} from './sprite-instance-data-populator.js';
import {
  FLOATS_PER_INSTANCE,
  HEIGHT_OFFSET,
  PIVOT_X_OFFSET,
  PIVOT_Y_OFFSET,
  POSITION_X_OFFSET,
  POSITION_Y_OFFSET,
  ROTATION_OFFSET,
  SCALE_X_OFFSET,
  SCALE_Y_OFFSET,
  TEX_OFFSET_X_OFFSET,
  TEX_OFFSET_Y_OFFSET,
  TEX_SIZE_X_OFFSET,
  TEX_SIZE_Y_OFFSET,
  WIDTH_OFFSET,
} from './render-constants.js';

describe('SpriteInstanceDataPopulator', () => {
  let populator: SpriteInstanceDataPopulator;
  let world: World;

  beforeEach(() => {
    populator = new SpriteInstanceDataPopulator();
    world = new World('TestWorld');
  });

  describe('floatsPerInstance', () => {
    it('should return the correct number of floats per instance', () => {
      expect(populator.floatsPerInstance).toBe(FLOATS_PER_INSTANCE);
    });
  });

  describe('attributeSpecs', () => {
    it('should define all required sprite attributes', () => {
      const specs = populator.attributeSpecs;

      expect(specs).toHaveLength(7);

      const specMap = new Map(specs.map((s) => [s.name, s]));

      expect(specMap.get('a_instancePos')).toEqual({
        name: 'a_instancePos',
        numComponents: 2,
        offset: POSITION_X_OFFSET,
      });
      expect(specMap.get('a_instanceRot')).toEqual({
        name: 'a_instanceRot',
        numComponents: 1,
        offset: ROTATION_OFFSET,
      });
      expect(specMap.get('a_instanceScale')).toEqual({
        name: 'a_instanceScale',
        numComponents: 2,
        offset: SCALE_X_OFFSET,
      });
      expect(specMap.get('a_instanceSize')).toEqual({
        name: 'a_instanceSize',
        numComponents: 2,
        offset: WIDTH_OFFSET,
      });
      expect(specMap.get('a_instancePivot')).toEqual({
        name: 'a_instancePivot',
        numComponents: 2,
        offset: PIVOT_X_OFFSET,
      });
      expect(specMap.get('a_instanceTexOffset')).toEqual({
        name: 'a_instanceTexOffset',
        numComponents: 2,
        offset: TEX_OFFSET_X_OFFSET,
      });
      expect(specMap.get('a_instanceTexSize')).toEqual({
        name: 'a_instanceTexSize',
        numComponents: 2,
        offset: TEX_SIZE_X_OFFSET,
      });
    });
  });

  describe('populateInstanceData', () => {
    it('should populate instance data with position', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(100, 200),
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      expect(instanceData[POSITION_X_OFFSET]).toBe(100);
      expect(instanceData[POSITION_Y_OFFSET]).toBe(200);
    });

    it('should populate instance data with rotation', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(0, 0),
        rotation: new RotationComponent(Math.PI / 4),
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      expect(instanceData[ROTATION_OFFSET]).toBeCloseTo(Math.PI / 4);
    });

    it('should default rotation to 0 when no RotationComponent', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(0, 0),
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      expect(instanceData[ROTATION_OFFSET]).toBe(0);
    });

    it('should populate instance data with scale', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(0, 0),
        scale: new ScaleComponent(2, 3),
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      expect(instanceData[SCALE_X_OFFSET]).toBe(2);
      expect(instanceData[SCALE_Y_OFFSET]).toBe(3);
    });

    it('should default scale to 1 when no ScaleComponent', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(0, 0),
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      expect(instanceData[SCALE_X_OFFSET]).toBe(1);
      expect(instanceData[SCALE_Y_OFFSET]).toBe(1);
    });

    it('should apply flip to scale', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(0, 0),
        scale: new ScaleComponent(2, 3),
        flip: new FlipComponent(true, false),
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      expect(instanceData[SCALE_X_OFFSET]).toBe(-2);
      expect(instanceData[SCALE_Y_OFFSET]).toBe(3);
    });

    it('should apply flip Y to scale', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(0, 0),
        scale: new ScaleComponent(2, 3),
        flip: new FlipComponent(false, true),
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      expect(instanceData[SCALE_X_OFFSET]).toBe(2);
      expect(instanceData[SCALE_Y_OFFSET]).toBe(-3);
    });

    it('should populate sprite width and height', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(0, 0),
        spriteWidth: 64,
        spriteHeight: 32,
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      // Width and height include bleed (default 1)
      expect(instanceData[WIDTH_OFFSET]).toBe(65);
      expect(instanceData[HEIGHT_OFFSET]).toBe(33);
    });

    it('should populate sprite pivot', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(0, 0),
        pivot: new Vector2(0.25, 0.75),
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      expect(instanceData[PIVOT_X_OFFSET]).toBe(0.25);
      expect(instanceData[PIVOT_Y_OFFSET]).toBe(0.75);
    });

    it('should default texture offset to 0', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(0, 0),
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      expect(instanceData[TEX_OFFSET_X_OFFSET]).toBe(0);
      expect(instanceData[TEX_OFFSET_Y_OFFSET]).toBe(0);
    });

    it('should default texture size to 1', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(0, 0),
      });

      const instanceData = new Float32Array(FLOATS_PER_INSTANCE);
      populator.populateInstanceData(instanceData, 0, entity);

      expect(instanceData[TEX_SIZE_X_OFFSET]).toBe(1);
      expect(instanceData[TEX_SIZE_Y_OFFSET]).toBe(1);
    });

    it('should populate data at the correct offset', () => {
      const entity = createTestEntity(world, {
        position: new PositionComponent(100, 200),
      });

      const offset = FLOATS_PER_INSTANCE * 2; // Third entity's slot
      const instanceData = new Float32Array(FLOATS_PER_INSTANCE * 3);
      populator.populateInstanceData(instanceData, offset, entity);

      // First two slots should be empty
      expect(instanceData[POSITION_X_OFFSET]).toBe(0);
      expect(instanceData[POSITION_Y_OFFSET]).toBe(0);
      expect(instanceData[FLOATS_PER_INSTANCE + POSITION_X_OFFSET]).toBe(0);
      expect(instanceData[FLOATS_PER_INSTANCE + POSITION_Y_OFFSET]).toBe(0);

      // Third slot should have the entity data
      expect(instanceData[offset + POSITION_X_OFFSET]).toBe(100);
      expect(instanceData[offset + POSITION_Y_OFFSET]).toBe(200);
    });
  });

  describe('defaultSpriteInstanceDataPopulator', () => {
    it('should be a singleton instance of SpriteInstanceDataPopulator', () => {
      expect(defaultSpriteInstanceDataPopulator).toBeInstanceOf(
        SpriteInstanceDataPopulator,
      );
    });

    it('should have the same floatsPerInstance as a new instance', () => {
      expect(defaultSpriteInstanceDataPopulator.floatsPerInstance).toBe(
        FLOATS_PER_INSTANCE,
      );
    });
  });
});

interface TestEntityOptions {
  position: PositionComponent;
  rotation?: RotationComponent;
  scale?: ScaleComponent;
  flip?: FlipComponent;
  spriteWidth?: number;
  spriteHeight?: number;
  pivot?: Vector2;
}

function createTestEntity(world: World, options: TestEntityOptions): Entity {
  const {
    position,
    rotation,
    scale,
    flip,
    spriteWidth = 32,
    spriteHeight = 32,
    pivot = new Vector2(0.5, 0.5),
  } = options;

  const components = [position];

  if (rotation) {
    components.push(rotation);
  }

  if (scale) {
    components.push(scale);
  }

  if (flip) {
    components.push(flip);
  }

  // Create a mock sprite and sprite component
  const sprite = {
    width: spriteWidth + 1, // Include bleed
    height: spriteHeight + 1,
    pivot,
    renderLayer: null,
    renderable: null,
    bleed: 1,
  } as unknown as Sprite;

  const spriteComponent = new SpriteComponent(sprite);
  components.push(spriteComponent);

  return new Entity('TestEntity', world, components);
}
