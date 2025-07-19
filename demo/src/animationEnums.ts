export type ENTITY_TYPES_KEYS =
  (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

export const ENTITY_TYPES = {
  ship: 'ship',
  adventurer: 'adventurer',
  adventurerControllable: 'adventurerControllable',
} as const;

export type SHIP_ANIMATIONS_KEYS =
  (typeof SHIP_ANIMATIONS)[keyof typeof SHIP_ANIMATIONS];

export const SHIP_ANIMATIONS = {
  spin: 'spin',
  spinRandom: 'spinRandom',
} as const;

export type ADVENTURER_ANIMATIONS_KEYS =
  (typeof ADVENTURER_ANIMATIONS)[keyof typeof ADVENTURER_ANIMATIONS];

export const ADVENTURER_ANIMATIONS = {
  idle: 'idle',
  idleHalf: 'idleHalf',
  run: 'run',
  attack1: 'attack1',
  attack2: 'attack2',
  attack3: 'attack3',
  jump: 'jump',
  damage: 'damage',
  die: 'die',
} as const;
