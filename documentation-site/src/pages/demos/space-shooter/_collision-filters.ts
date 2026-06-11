const collisionCategories = {
  player: 0x0002,
  asteroid: 0x0004,
  bullet: 0x0008,
} as const;

export const collisionFilters = {
  player: {
    category: collisionCategories.player,
    mask: collisionCategories.asteroid,
  },
  asteroid: {
    category: collisionCategories.asteroid,
    mask: collisionCategories.player | collisionCategories.bullet,
  },
  bullet: {
    category: collisionCategories.bullet,
    mask: collisionCategories.asteroid,
  },
} as const;
