import { beforeEach, describe, expect, it } from 'vitest';
import { TransformSystem } from './transform-system';
import { World } from '../../ecs';
import {
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  WorldPositionComponent,
  WorldRotationComponent,
  WorldScaleComponent,
} from '../components';
import { degreesToRadians } from '../../math';

describe('TransformSystem', () => {
  let world: World;
  let system: TransformSystem;

  beforeEach(() => {
    world = new World('test');
    system = new TransformSystem();
    world.addSystem(system);
  });

  it('should compute world transform for entity without parent', () => {
    // Arrange
    const position = new PositionComponent(10, 20);
    const rotation = new RotationComponent(45);
    const scale = new ScaleComponent(2, 3);

    const entity = world.buildAndAddEntity('test', [position, rotation, scale]);

    // Act
    world.update(0.1);

    // Assert
    const worldPosition = entity.getComponent<WorldPositionComponent>(
      WorldPositionComponent.symbol,
    );
    const worldRotation = entity.getComponent<WorldRotationComponent>(
      WorldRotationComponent.symbol,
    );
    const worldScale = entity.getComponent<WorldScaleComponent>(
      WorldScaleComponent.symbol,
    );

    expect(worldPosition).not.toBeNull();
    expect(worldRotation).not.toBeNull();
    expect(worldScale).not.toBeNull();

    expect(worldPosition!.x).toBe(10);
    expect(worldPosition!.y).toBe(20);
    expect(worldRotation!.radians).toBeCloseTo(degreesToRadians(45), 5);
    expect(worldScale!.x).toBe(2);
    expect(worldScale!.y).toBe(3);
  });

  it('should compute world transform for entity with parent (position only)', () => {
    // Arrange
    const parentPosition = new PositionComponent(10, 20);
    const childPosition = new PositionComponent(5, 10);

    const parent = world.buildAndAddEntity('parent', [parentPosition]);
    const child = world.buildAndAddEntity('child', [childPosition]);

    child.parentTo(parent);

    // Act
    world.update(0.1);

    // Assert
    const childWorldPosition = child.getComponent<WorldPositionComponent>(
      WorldPositionComponent.symbol,
    );

    expect(childWorldPosition).not.toBeNull();
    expect(childWorldPosition!.x).toBe(15);
    expect(childWorldPosition!.y).toBe(30);
  });

  it('should compute world transform for entity with parent (position and rotation)', () => {
    // Arrange
    const parentPosition = new PositionComponent(10, 0);
    const parentRotation = new RotationComponent(90); // 90 degrees
    const childPosition = new PositionComponent(10, 0);

    const parent = world.buildAndAddEntity('parent', [
      parentPosition,
      parentRotation,
    ]);
    const child = world.buildAndAddEntity('child', [childPosition]);

    child.parentTo(parent);

    // Act
    world.update(0.1);

    // Assert
    const childWorldPosition = child.getComponent<WorldPositionComponent>(
      WorldPositionComponent.symbol,
    );
    const childWorldRotation = child.getComponent<WorldRotationComponent>(
      WorldRotationComponent.symbol,
    );

    expect(childWorldPosition).not.toBeNull();
    expect(childWorldRotation).not.toBeNull();

    // After 90 degree rotation, (10, 0) becomes approximately (0, 10)
    expect(childWorldPosition!.x).toBeCloseTo(10, 5);
    expect(childWorldPosition!.y).toBeCloseTo(10, 5);
    expect(childWorldRotation!.radians).toBeCloseTo(degreesToRadians(90), 5);
  });

  it('should compute world transform for entity with parent (all transforms)', () => {
    // Arrange
    const parentPosition = new PositionComponent(10, 20);
    const parentRotation = new RotationComponent(0);
    const parentScale = new ScaleComponent(2, 2);

    const childPosition = new PositionComponent(5, 5);
    const childRotation = new RotationComponent(45);
    const childScale = new ScaleComponent(0.5, 0.5);

    const parent = world.buildAndAddEntity('parent', [
      parentPosition,
      parentRotation,
      parentScale,
    ]);
    const child = world.buildAndAddEntity('child', [
      childPosition,
      childRotation,
      childScale,
    ]);

    child.parentTo(parent);

    // Act
    world.update(0.1);

    // Assert
    const childWorldPosition = child.getComponent<WorldPositionComponent>(
      WorldPositionComponent.symbol,
    );
    const childWorldRotation = child.getComponent<WorldRotationComponent>(
      WorldRotationComponent.symbol,
    );
    const childWorldScale = child.getComponent<WorldScaleComponent>(
      WorldScaleComponent.symbol,
    );

    expect(childWorldPosition).not.toBeNull();
    expect(childWorldRotation).not.toBeNull();
    expect(childWorldScale).not.toBeNull();

    // Child position (5, 5) scaled by parent (2, 2) = (10, 10), plus parent position (10, 20) = (20, 30)
    expect(childWorldPosition!.x).toBeCloseTo(20, 5);
    expect(childWorldPosition!.y).toBeCloseTo(30, 5);
    expect(childWorldRotation!.radians).toBeCloseTo(degreesToRadians(45), 5);
    // Child scale (0.5, 0.5) * parent scale (2, 2) = (1, 1)
    expect(childWorldScale!.x).toBe(1);
    expect(childWorldScale!.y).toBe(1);
  });

  it('should compute world transform for deep hierarchy', () => {
    // Arrange
    const grandparentPosition = new PositionComponent(10, 10);
    const parentPosition = new PositionComponent(5, 5);
    const childPosition = new PositionComponent(2, 2);

    const grandparent = world.buildAndAddEntity('grandparent', [
      grandparentPosition,
    ]);
    const parent = world.buildAndAddEntity('parent', [parentPosition]);
    const child = world.buildAndAddEntity('child', [childPosition]);

    parent.parentTo(grandparent);
    child.parentTo(parent);

    // Act
    world.update(0.1);

    // Assert
    const childWorldPosition = child.getComponent<WorldPositionComponent>(
      WorldPositionComponent.symbol,
    );

    expect(childWorldPosition).not.toBeNull();
    // 10 + 5 + 2 = 17
    expect(childWorldPosition!.x).toBe(17);
    expect(childWorldPosition!.y).toBe(17);
  });

  it('should handle entity with only position component', () => {
    // Arrange
    const position = new PositionComponent(10, 20);
    const entity = world.buildAndAddEntity('test', [position]);

    // Act
    world.update(0.1);

    // Assert
    const worldPosition = entity.getComponent<WorldPositionComponent>(
      WorldPositionComponent.symbol,
    );
    const worldRotation = entity.getComponent<WorldRotationComponent>(
      WorldRotationComponent.symbol,
    );
    const worldScale = entity.getComponent<WorldScaleComponent>(
      WorldScaleComponent.symbol,
    );

    expect(worldPosition).not.toBeNull();
    expect(worldRotation).not.toBeNull();
    expect(worldScale).not.toBeNull();

    expect(worldPosition!.x).toBe(10);
    expect(worldPosition!.y).toBe(20);
    expect(worldRotation!.radians).toBe(0);
    expect(worldScale!.x).toBe(1);
    expect(worldScale!.y).toBe(1);
  });

  it('should update world transform when parent changes', () => {
    // Arrange
    const parentPosition = new PositionComponent(10, 10);
    const childPosition = new PositionComponent(5, 5);

    const parent = world.buildAndAddEntity('parent', [parentPosition]);
    const child = world.buildAndAddEntity('child', [childPosition]);

    child.parentTo(parent);

    // Act - first update
    world.update(0.1);

    let childWorldPosition = child.getComponent<WorldPositionComponent>(
      WorldPositionComponent.symbol,
    );
    expect(childWorldPosition!.x).toBe(15);
    expect(childWorldPosition!.y).toBe(15);

    // Change parent position
    parentPosition.x = 20;
    parentPosition.y = 20;

    // Act - second update
    world.update(0.1);

    // Assert
    childWorldPosition = child.getComponent<WorldPositionComponent>(
      WorldPositionComponent.symbol,
    );
    expect(childWorldPosition!.x).toBe(25);
    expect(childWorldPosition!.y).toBe(25);
  });
});
