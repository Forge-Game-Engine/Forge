import { beforeEach, describe, expect, it } from 'vitest';
import { AgeSystem } from './age-system';
import { World } from '../../ecs';
import { AgeComponent } from '../../common/components/age-component';

describe('AgeSystem', () => {
  let world: World;
  beforeEach(() => {
    world = new World('test');
  });
  it('should handle entities with ageSeconds within lifetimeSeconds', () => {
    // Arrange
    const ageComponent = new AgeComponent(5);

    world.buildAndAddEntity('test', [ageComponent]);

    const system = new AgeSystem(world);
    world.addSystem(system);

    world.update(0.1);
    expect(world.entityCount).toBe(1);

    ageComponent.ageSeconds = 4; // Set age to less than lifetime

    world.update(0.1);
    expect(world.entityCount).toBe(1);
  });
  it('should handle entities with ageSeconds equaling lifetimeSeconds', () => {
    // Arrange
    const ageComponent = new AgeComponent(5);

    world.buildAndAddEntity('test', [ageComponent]);

    const system = new AgeSystem(world);
    world.addSystem(system);

    world.update(0.1);
    expect(world.entityCount).toBe(1);

    ageComponent.ageSeconds = 5; // Set age to equal to lifetime

    world.update(0.1);
    expect(world.entityCount).toBe(0);
  });

  it('should handle entities with ageSeconds exceeding lifetimeSeconds', () => {
    // Arrange
    const ageComponent = new AgeComponent(5);

    world.buildAndAddEntity('test', [ageComponent]);

    const system = new AgeSystem(world);
    world.addSystem(system);

    world.update(0.1);
    expect(world.entityCount).toBe(1);

    ageComponent.ageSeconds = 5.1; // Set age to more than lifetime

    world.update(0.1);
    expect(world.entityCount).toBe(0);
  });
});
