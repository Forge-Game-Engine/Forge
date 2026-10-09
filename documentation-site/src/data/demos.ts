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
      'Fly a ship through an asteroid field and shoot it apart, with bloom, a blurred background, sprite-sheet explosions and audio buses.',
    categories: ['games'],
  },
  {
    slug: 'brick-breaker',
    title: 'Brick Breaker',
    description:
      'Break a wall of bricks with a ball and paddle that are native rigid bodies, so every bounce comes from the physics engine.',
    categories: ['games'],
  },
  {
    slug: 'car',
    title: 'Car',
    description:
      'Drive a car with working suspension over procedurally generated hills, built from rigid bodies, joints, springs and motors.',
    categories: ['physics', 'games'],
  },
  {
    slug: 'game-states',
    title: 'Game States',
    description:
      'A menu, a round and a game-over screen, switched with a game state, run conditions and state-scoped entities.',
    categories: ['ecs', 'games'],
  },
  {
    slug: 'ecs',
    title: 'ECS',
    description:
      'A star circling the screen, built from a world, an entity, its components and one system.',
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
    slug: 'sensors',
    title: 'Sensors and Contacts',
    description:
      'Falling balls pass through sensor zones that tint them on contact, while solid ramps bounce them.',
    categories: ['physics'],
  },
  {
    slug: 'raycasting',
    title: 'Raycasting',
    description:
      'Move the mouse to cast a ray toward the cursor and see where it first hits a collider.',
    categories: ['physics'],
  },
  {
    slug: 'rolling-ball',
    title: 'Rolling Ball',
    description:
      'Roll and jump a ball over curved terrain, driven by a motor and ground friction.',
    categories: ['physics'],
  },
  {
    slug: 'prismatic-joint',
    title: 'Prismatic Joint (Slider)',
    description:
      'A piston, an elevator and an inclined slider, each held to a single sliding axis by a prismatic joint.',
    categories: ['physics'],
  },
  {
    slug: 'revolute-joint',
    title: 'Revolute Joint (Hinge)',
    description:
      'A limited door hinge, a free pendulum and a spinning wheel, each pinned at one point by a revolute joint.',
    categories: ['physics'],
  },
  {
    slug: 'torque',
    title: 'Torque and Motors',
    description:
      'Hold Space to spin one flywheel by applying torque, while a motor holds the other at a steady speed.',
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
      'Compares a stretched sprite to a nine-sliced one that keeps crisp corners at any size.',
    categories: ['rendering'],
  },
  {
    slug: 'context-loss',
    title: 'Context Loss',
    description:
      'Click to lose the WebGL context, and watch the engine rebuild its GPU resources when it comes back.',
    categories: ['rendering'],
  },
  {
    slug: 'masks',
    title: 'Masks',
    description:
      'Clips a scrolling list to a rect, and reveals a nine-slice bar and an arc gauge with linear and radial masks.',
    categories: ['rendering', 'ui'],
  },
  {
    slug: 'texture-filtering',
    title: 'Texture Filtering',
    description:
      'The same pixel-art texture drawn with nearest-neighbor filtering (crisp pixels) and linear filtering (smooth blur).',
    categories: ['rendering'],
  },
  {
    slug: 'text',
    title: 'Text Rendering',
    description:
      'Type your own text and change its size, wrapping, alignment, line height, outline and glow while it redraws live.',
    categories: ['rendering'],
  },
  {
    slug: 'ui-anchors',
    title: 'UI Anchors',
    description:
      'Panels pinned to corners and edges of the canvas, plus one panel whose anchor, position and size you can change live.',
    categories: ['ui'],
  },
  {
    slug: 'ui-nested-resize',
    title: 'UI Nested Resize',
    description:
      'A window that moves and resizes on its own while its nested title bar, controls and corner tag follow through their anchors.',
    categories: ['ui'],
  },
  {
    slug: 'ui-text-input',
    title: 'UI Text Input',
    description:
      'A name entry form: typing, filtering, submit and cancel in text fields.',
    categories: ['ui'],
  },
  {
    slug: 'ui-button',
    title: 'UI Buttons',
    description:
      'Three buttons you can click, or move focus between with the keyboard, showing hover, press and focus states.',
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
    slug: 'persistent-state',
    title: 'Persistent State',
    description:
      'A settings panel whose values are stored with createPersistentState and survive a reload.',
    categories: ['ui'],
  },
  {
    slug: 'ui-slider',
    title: 'UI Slider',
    description:
      "Drag a slider's handle, or click anywhere on its track, to set a value shown live in a label.",
    categories: ['ui'],
  },
  {
    slug: 'ui-scroll-view',
    title: 'UI Scroll View',
    description:
      'A clipped list scrolled by dragging, the mouse wheel, a scrollbar and focus, with inertia and elastic edges.',
    categories: ['ui'],
  },
  {
    slug: 'ui-progress-bar',
    title: 'UI Progress Bar',
    description:
      'Read-only linear and radial progress bars driven by values that change over time.',
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
      'Four panels arranged by vertical, horizontal and grid layout groups, with no hand-placed positions or sizes.',
    categories: ['ui'],
  },
  {
    slug: 'ui-canvas-group',
    title: 'UI Canvas Group',
    description:
      'One canvas group fades and disables a whole nested modal, including a button inside it, with a single toggle.',
    categories: ['ui'],
  },
  {
    slug: 'visibility',
    title: 'Visibility',
    description:
      'Hiding an entity hides everything under it: drawing, UI layout, input and particle emitters.',
    categories: ['ui', 'rendering'],
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
