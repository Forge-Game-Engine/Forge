/**
 * A category demos can be sorted into on the `/demos` page. A demo can
 * belong to more than one category (see `Demo.categories` in `./demos.ts`).
 */
export interface DemoCategory {
  description: string;
  image: string;
  slug: string;
  title: string;
}

export const demoCategories: DemoCategory[] = [
  {
    slug: 'rendering',
    title: 'Rendering',
    description: 'Sprites, shaders, text and other WebGL2 rendering features.',
    image: '/img/demos/categories/rendering.svg',
  },
  {
    slug: 'physics',
    title: 'Physics',
    description: 'Rigid bodies, joints, motors and collision resolution.',
    image: '/img/demos/categories/physics.svg',
  },
  {
    slug: 'ui',
    title: 'UI',
    description:
      'The retained-mode UI module: layout, anchoring, buttons, sliders and more.',
    image: '/img/demos/categories/ui.svg',
  },
  {
    slug: 'particles',
    title: 'Particles',
    description:
      'The particle system, for effects like fountains, bursts and trails.',
    image: '/img/demos/categories/particles.svg',
  },
  {
    slug: 'animations',
    title: 'Animations',
    description: 'Easing and other animation utilities.',
    image: '/img/demos/categories/animations.svg',
  },
  {
    slug: 'ecs',
    title: 'ECS',
    description: 'The core Entity-Component-System architecture.',
    image: '/img/demos/categories/ecs.svg',
  },
  {
    slug: 'games',
    title: 'Games',
    description:
      'Complete, composite demos that combine many engine features at once.',
    image: '/img/demos/categories/games.svg',
  },
];
