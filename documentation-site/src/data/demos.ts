/**
 * The demo catalogue shown on `/demos` and its category pages. A demo can
 * list more than one category slug (see `./demo-categories.ts`) when it
 * genuinely fits more than one - for example the car demo, which is both a
 * physics showcase and a composite "games" demo.
 */
export interface Demo {
  categories: string[];
  description: string;
  slug: string;
  title: string;
}

export const demos: Demo[] = [
  {
    slug: 'space-shooter',
    title: 'Space Shooter',
    description:
      'A complete space shooter with player movement, shooting, enemy spawning and collisions.',
    categories: ['games'],
  },
  {
    slug: 'brick-breaker',
    title: 'Brick Breaker',
    description:
      'A paddle-and-ball brick breaker built entirely from native rigid bodies.',
    categories: ['games'],
  },
  {
    slug: 'car',
    title: 'Car',
    description:
      'A drivable car built from rigid bodies, joints, springs and motors.',
    categories: ['physics', 'games'],
  },
  {
    slug: 'ecs',
    title: 'ECS',
    description:
      'A minimal walkthrough of creating a world, entity, component and system.',
    categories: ['ecs'],
  },
  {
    slug: 'physics',
    title: 'Physics',
    description:
      'Rigid bodies, gravity and collision resolution with a click-to-explode pile of shapes.',
    categories: ['physics'],
  },
  {
    slug: 'moving-platform',
    title: 'Moving Platform',
    description:
      'A kinematic platform that carries and pushes dynamic crates without being affected by them.',
    categories: ['physics'],
  },
  {
    slug: 'raycasting',
    title: 'Raycasting',
    description:
      'Casts a ray from a fixed point toward the cursor against static colliders.',
    categories: ['physics'],
  },
  {
    slug: 'rolling-ball',
    title: 'Rolling Ball',
    description:
      'A ball rolls over procedurally generated terrain using TerrainCollider and friction.',
    categories: ['physics'],
  },
  {
    slug: 'prismatic-joint',
    title: 'Prismatic Joint (Slider)',
    description:
      'PrismaticJoint driving a piston, an elevator and an inclined slider.',
    categories: ['physics'],
  },
  {
    slug: 'revolute-joint',
    title: 'Revolute Joint (Hinge)',
    description:
      'RevoluteJoint driving a hinged door, a free pendulum and a spinning wheel.',
    categories: ['physics'],
  },
  {
    slug: 'torque',
    title: 'Torque and Motors',
    description:
      'Spinning a flywheel by applying torque directly versus an AngularVelocityMotorEcsComponent.',
    categories: ['physics'],
  },
  {
    slug: 'linear-spring-damper',
    title: 'Linear Spring and Damper',
    description:
      'Comparing an undamped spring to a spring-and-damper suspension after a bump.',
    categories: ['physics'],
  },
  {
    slug: 'newtons-cradle',
    title: "Newton's Cradle",
    description:
      'Five hinged balls transfer momentum through ordinary collision resolution.',
    categories: ['physics'],
  },
  {
    slug: 'wrecking-ball',
    title: 'Wrecking Ball',
    description: 'A hinged wrecking ball swings into a wall of bricks.',
    categories: ['physics'],
  },
  {
    slug: 'stress-test',
    title: 'Stress Test',
    description:
      'Spawns sprites over time to find where the frame rate starts to drop.',
    categories: ['rendering'],
  },
  {
    slug: 'erosion-burn',
    title: 'Erosion Burn',
    description:
      "A custom fragment shader erodes a sprite's alpha to look like it's burning away.",
    categories: ['rendering'],
  },
  {
    slug: 'easing-functions',
    title: 'Easing Functions',
    description:
      'Compares every easing function from the animations module side by side.',
    categories: ['animations'],
  },
  {
    slug: 'particles',
    title: 'Particles',
    description:
      'An ember fountain, a spark burst and a smoke trail using the particle system.',
    categories: ['particles'],
  },
  {
    slug: 'nine-slice',
    title: 'Nine-Slice Sprites',
    description:
      'Compares a stretched sprite to nine-sliced panels that keep crisp corners at any size.',
    categories: ['rendering'],
  },
  {
    slug: 'texture-filtering',
    title: 'Texture Filtering',
    description:
      'Nearest-neighbor versus linear texture filtering side by side.',
    categories: ['rendering'],
  },
  {
    slug: 'text',
    title: 'Text Rendering',
    description:
      'MSDF text rendering: alignment, line height, live reflow and outline/shadow effects.',
    categories: ['rendering'],
  },
  {
    slug: 'ui-anchors',
    title: 'UI Anchors',
    description:
      'An interactive playground for every UiAnchor preset and its position/size behavior.',
    categories: ['ui'],
  },
  {
    slug: 'ui-nested-resize',
    title: 'UI Nested Resize',
    description:
      'A moving, resizing window with four levels of nested anchored children.',
    categories: ['ui'],
  },
  {
    slug: 'ui-button',
    title: 'UI Buttons',
    description:
      'Buttons with hover, click and keyboard/gamepad focus navigation.',
    categories: ['ui'],
  },
  {
    slug: 'ui-main-menu',
    title: 'UI Main Menu',
    description:
      'A complete main menu screen built entirely from the ui module.',
    categories: ['ui'],
  },
  {
    slug: 'ui-toggle',
    title: 'UI Toggles',
    description:
      'A standalone toggle plus a grouped set that behaves like radio buttons.',
    categories: ['ui'],
  },
  {
    slug: 'ui-slider',
    title: 'UI Slider',
    description:
      'A draggable slider whose whole track acts as the drag surface.',
    categories: ['ui'],
  },
  {
    slug: 'ui-progress-bar',
    title: 'UI Progress Bar',
    description:
      'A read-only progress bar driven by a value that changes over time.',
    categories: ['ui'],
  },
  {
    slug: 'ui-dropdown',
    title: 'UI Dropdown',
    description:
      'A dropdown built from a header button and a stack of option rows.',
    categories: ['ui'],
  },
  {
    slug: 'layout-groups',
    title: 'UI Layout Groups',
    description:
      'Vertical, horizontal and grid layout groups that arrange UI automatically.',
    categories: ['ui'],
  },
  {
    slug: 'ui-canvas-group',
    title: 'UI Canvas Group',
    description:
      'A CanvasGroup fades and disables an entire nested UI subtree at once.',
    categories: ['ui'],
  },
  {
    slug: 'ui-world-space-canvas',
    title: 'UI World-Space Canvas',
    description:
      'World-space UI health bars, attached normally versus kept upright regardless of rotation.',
    categories: ['ui'],
  },
  {
    slug: 'ui-stress-test',
    title: 'UI Stress Test',
    description:
      'Spawns UI panels over time to find where the frame rate starts to drop.',
    categories: ['ui'],
  },
];
