import { describe, expect, it } from 'vitest';
import { Entity } from '../../ecs/entity';
import { World } from '../../ecs/world';
import { PositionComponent } from '../components/position-component';
import { RotationComponent } from '../components/rotation-component';
import { ScaleComponent } from '../components/scale-component';
import { TransformSystem } from './transform-system';

describe('TransformSystem', () => {
  it('should set world transform equal to local transform for root entities', () => {
    const world = new World('test-world');
    const system = new TransformSystem();

    const entity = new Entity('root', world, [
      new PositionComponent(10, 20),
      new RotationComponent(Math.PI / 4),
      new ScaleComponent(2, 3),
    ]);

    system.run(entity);

    const position = entity.getComponent<PositionComponent>(
      PositionComponent.symbol,
    );
    const rotation = entity.getComponent<RotationComponent>(
      RotationComponent.symbol,
    );
    const scale = entity.getComponent<ScaleComponent>(ScaleComponent.symbol);

    expect(position?.world.x).toBe(10);
    expect(position?.world.y).toBe(20);
    expect(rotation?.world).toBe(Math.PI / 4);
    expect(scale?.world.x).toBe(2);
    expect(scale?.world.y).toBe(3);
  });

  it('should apply parent position to child', () => {
    const world = new World('test-world');
    const system = new TransformSystem();

    const parent = new Entity('parent', world, [
      new PositionComponent(100, 200),
      new RotationComponent(0),
      new ScaleComponent(1, 1),
    ]);

    const child = new Entity('child', world, [
      new PositionComponent(10, 20),
      new RotationComponent(0),
      new ScaleComponent(1, 1),
    ]);

    child.parentTo(parent);

    // Process parent first to set its world transform
    system.run(parent);
    // Then process child
    system.run(child);

    const childPosition = child.getComponent<PositionComponent>(
      PositionComponent.symbol,
    );

    expect(childPosition?.world.x).toBe(110);
    expect(childPosition?.world.y).toBe(220);
  });

  it('should apply parent rotation to child position', () => {
    const world = new World('test-world');
    const system = new TransformSystem();

    const parent = new Entity('parent', world, [
      new PositionComponent(0, 0),
      new RotationComponent(Math.PI / 2), // 90 degrees
      new ScaleComponent(1, 1),
    ]);

    const child = new Entity('child', world, [
      new PositionComponent(10, 0),
      new RotationComponent(0),
      new ScaleComponent(1, 1),
    ]);

    child.parentTo(parent);

    system.run(parent);
    system.run(child);

    const childPosition = child.getComponent<PositionComponent>(
      PositionComponent.symbol,
    );

    // After 90-degree rotation, (10, 0) becomes approximately (0, 10)
    expect(childPosition?.world.x).toBeCloseTo(0, 5);
    expect(childPosition?.world.y).toBeCloseTo(10, 5);
  });

  it('should apply parent scale to child position', () => {
    const world = new World('test-world');
    const system = new TransformSystem();

    const parent = new Entity('parent', world, [
      new PositionComponent(0, 0),
      new RotationComponent(0),
      new ScaleComponent(2, 3),
    ]);

    const child = new Entity('child', world, [
      new PositionComponent(10, 20),
      new RotationComponent(0),
      new ScaleComponent(1, 1),
    ]);

    child.parentTo(parent);

    system.run(parent);
    system.run(child);

    const childPosition = child.getComponent<PositionComponent>(
      PositionComponent.symbol,
    );

    // Child position scaled by parent scale
    expect(childPosition?.world.x).toBe(20);
    expect(childPosition?.world.y).toBe(60);
  });

  it('should combine parent rotation with child rotation', () => {
    const world = new World('test-world');
    const system = new TransformSystem();

    const parent = new Entity('parent', world, [
      new PositionComponent(0, 0),
      new RotationComponent(Math.PI / 4),
      new ScaleComponent(1, 1),
    ]);

    const child = new Entity('child', world, [
      new PositionComponent(0, 0),
      new RotationComponent(Math.PI / 4),
      new ScaleComponent(1, 1),
    ]);

    child.parentTo(parent);

    system.run(parent);
    system.run(child);

    const childRotation = child.getComponent<RotationComponent>(
      RotationComponent.symbol,
    );

    // Child rotation = parent rotation + child local rotation
    expect(childRotation?.world).toBeCloseTo(Math.PI / 2, 5);
  });

  it('should multiply parent scale with child scale', () => {
    const world = new World('test-world');
    const system = new TransformSystem();

    const parent = new Entity('parent', world, [
      new PositionComponent(0, 0),
      new RotationComponent(0),
      new ScaleComponent(2, 3),
    ]);

    const child = new Entity('child', world, [
      new PositionComponent(0, 0),
      new RotationComponent(0),
      new ScaleComponent(4, 5),
    ]);

    child.parentTo(parent);

    system.run(parent);
    system.run(child);

    const childScale = child.getComponent<ScaleComponent>(
      ScaleComponent.symbol,
    );

    // Child scale = parent scale * child local scale
    expect(childScale?.world.x).toBe(8);
    expect(childScale?.world.y).toBe(15);
  });

  it('should work with deeply nested hierarchies', () => {
    const world = new World('test-world');
    const system = new TransformSystem();

    const grandparent = new Entity('grandparent', world, [
      new PositionComponent(100, 100),
      new RotationComponent(0),
      new ScaleComponent(2, 2),
    ]);

    const parent = new Entity('parent', world, [
      new PositionComponent(10, 10),
      new RotationComponent(0),
      new ScaleComponent(2, 2),
    ]);

    const child = new Entity('child', world, [
      new PositionComponent(5, 5),
      new RotationComponent(0),
      new ScaleComponent(2, 2),
    ]);

    parent.parentTo(grandparent);
    child.parentTo(parent);

    system.run(grandparent);
    system.run(parent);
    system.run(child);

    const childPosition = child.getComponent<PositionComponent>(
      PositionComponent.symbol,
    );
    const childScale = child.getComponent<ScaleComponent>(
      ScaleComponent.symbol,
    );

    // Position: grandparent(100,100) + parent_local(10,10)*2 + child_local(5,5)*4
    // = 100 + 20 + 20 = 140
    expect(childPosition?.world.x).toBe(140);
    expect(childPosition?.world.y).toBe(140);

    // Scale: 2 * 2 * 2 = 8
    expect(childScale?.world.x).toBe(8);
    expect(childScale?.world.y).toBe(8);
  });

  it('should handle entities with missing components gracefully', () => {
    const world = new World('test-world');
    const system = new TransformSystem();

    const parent = new Entity('parent', world, [new PositionComponent(10, 20)]);

    const child = new Entity('child', world, [new PositionComponent(5, 5)]);

    child.parentTo(parent);

    // Should not throw
    expect(() => {
      system.run(parent);
      system.run(child);
    }).not.toThrow();

    const childPosition = child.getComponent<PositionComponent>(
      PositionComponent.symbol,
    );

    expect(childPosition?.world.x).toBe(15);
    expect(childPosition?.world.y).toBe(25);
  });
});
