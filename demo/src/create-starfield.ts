import * as forge from '../../src';
import { StarfieldComponent } from './starfield';

export const createStarfield = (
  world: forge.World,
  amount: number,
  space: forge.Space,
) => {
  const starfieldComponent = new StarfieldComponent(amount, space);
  const starfieldEntity = world.buildAndAddEntity('starfield', [
    starfieldComponent,
  ]);

  return starfieldEntity;
};
