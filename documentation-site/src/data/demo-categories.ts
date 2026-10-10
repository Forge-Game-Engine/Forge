import type { ModuleIconName } from '@site/src/components/ModuleIcon';

/**
 * A category demos can be sorted into on the `/demos` page. A demo can
 * belong to more than one category (see `Demo.categories` in `./demos.ts`).
 */
export interface DemoCategory {
  description: string;
  /** The line icon the category's card shows, shared with the homepage. */
  icon: ModuleIconName;
  slug: string;
  title: string;
}

export const demoCategories: DemoCategory[] = [
  {
    slug: 'rendering',
    title: 'Rendering',
    description: 'Sprites, shaders, text and post-processing.',
    icon: 'rendering',
  },
  {
    slug: 'physics',
    title: 'Physics',
    description: 'Rigid bodies, joints, motors and collisions.',
    icon: 'physics',
  },
  {
    slug: 'ui',
    title: 'UI',
    description: 'Layout, anchoring, buttons, sliders and more.',
    icon: 'ui',
  },
  {
    slug: 'particles',
    title: 'Particles',
    description: 'Emitters, bursts and spawn shapes.',
    icon: 'particles',
  },
  {
    slug: 'animations',
    title: 'Animations',
    description: 'Easing and property animations.',
    icon: 'animations',
  },
  {
    slug: 'ecs',
    title: 'ECS',
    description: 'Worlds, entities, components and systems.',
    icon: 'ecs',
  },
  {
    slug: 'games',
    title: 'Games',
    description: 'Complete games that combine many engine features.',
    icon: 'input',
  },
];
