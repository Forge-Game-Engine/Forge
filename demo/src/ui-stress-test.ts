import {
  Color,
  createAnimationEcsSystem,
  createGame,
  createUiCanvas,
  createUiLayoutEcsSystem,
  createUiPanel,
  createUiRenderable,
  createUiRenderEcsSystem,
  createUiResizeObserver,
  createUiScrollGroup,
  animateUiOpacity,
  animateUiScale,
  getUiRenderMetrics,
  SystemRegistrationOrder,
  Vector2,
} from '../../src/index.js';

// ── URL parameter parsing ─────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
const elementCount = Math.max(1, parseInt(params.get('count') ?? '200', 10));
const animationDensity = Math.min(
  10,
  Math.max(0, parseInt(params.get('animations') ?? '3', 10)),
);
const showScrollGroup = params.has('clipping');

// ── Game setup ────────────────────────────────────────────────────────────────

const { game, world, renderContext, time } = createGame('ui-stress-container');

const resize = (): void => {
  renderContext.resize(window.innerWidth, window.innerHeight);
};

resize();
window.addEventListener('resize', resize);

// ── ECS systems ───────────────────────────────────────────────────────────────

world.addSystem(createUiLayoutEcsSystem());
world.addSystem(createAnimationEcsSystem(time));
world.addSystem(
  createUiRenderEcsSystem(renderContext),
  SystemRegistrationOrder.late,
);

// ── UI canvas ─────────────────────────────────────────────────────────────────

const canvasWidth = renderContext.canvas.width;
const canvasHeight = renderContext.canvas.height;

const canvasEntity = createUiCanvas(world, {
  width: canvasWidth,
  height: canvasHeight,
});

createUiResizeObserver(
  document.getElementById('ui-stress-container')!,
  canvasEntity,
  world,
);

// ── Shared renderables ────────────────────────────────────────────────────────
// All elements sharing one Renderable instance batch into a single draw call.

const panelRenderable = createUiRenderable(renderContext);
const scrollRenderable = createUiRenderable(renderContext);

// ── Grid of panels ────────────────────────────────────────────────────────────

const panelW = 80;
const panelH = 50;
const gap = 4;
const cols = Math.max(1, Math.floor(canvasWidth / (panelW + gap)));
const animatedCount = Math.floor((elementCount * animationDensity) / 10);

const panelEntities: number[] = [];

for (let i = 0; i < elementCount; i++) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x = gap + col * (panelW + gap);
  const y = gap + row * (panelH + gap);

  // Hue-cycle across columns for visual variety.
  const hue = (col / cols) * 360;
  const lightness = 35 + 15 * ((row % 3) / 2);
  const tintColor = Color.fromHSLA(hue, 55, lightness, 1);
  const borderColor = Color.fromHSLA(hue, 70, 60, 0.6);

  const { entity } = createUiPanel(world, {
    renderable: panelRenderable,
    rect: { x, y, width: panelW, height: panelH },
    parent: canvasEntity,
    tintColor,
    borderColor,
    borderWidth: 1,
    cornerRadius: 4,
  });

  panelEntities.push(entity);
}

// ── Animations ────────────────────────────────────────────────────────────────
// Apply pingpong opacity or scale animations to a fraction of panels based on
// the `animations` URL param (0 = none, 10 = all panels animated).

for (let i = 0; i < animatedCount; i++) {
  const entity = panelEntities[i];

  if (i % 2 === 0) {
    animateUiOpacity(world, entity, {
      from: 0.25,
      to: 1.0,
      duration: 600 + (i % 7) * 120,
      loop: 'pingpong',
    });
  } else {
    animateUiScale(world, entity, {
      from: 0.85,
      to: 1.0,
      duration: 500 + (i % 5) * 100,
      loop: 'pingpong',
    });
  }
}

// ── Scroll group (optional, enabled via ?clipping) ───────────────────────────
// Creates a clipped viewport with 100 list rows that extend well beyond the
// visible area, validating that the render system culls fully-hidden rows.

if (showScrollGroup) {
  const svW = 280;
  const svH = 240;
  const svX = Math.floor((canvasWidth - svW) / 2);
  const svY = Math.floor((canvasHeight - svH) / 2);
  const itemH = 28;
  const listItemCount = 100;
  const contentHeight = listItemCount * (itemH + 2);

  const scrollResult = createUiScrollGroup(world, {
    renderable: scrollRenderable,
    contentRenderable: scrollRenderable,
    rect: { x: svX, y: svY, width: svW, height: svH },
    parent: canvasEntity,
    tintColor: new Color(0.08, 0.08, 0.16, 0.92),
    borderColor: new Color(0.35, 0.35, 0.6, 1),
    borderWidth: 1,
    cornerRadius: 8,
    contentSize: new Vector2(svW, contentHeight),
    zIndex: 10,
  });

  for (let i = 0; i < listItemCount; i++) {
    const hue = (i / listItemCount) * 360;
    const tintColor = Color.fromHSLA(hue, 45, 38, 1);

    createUiPanel(world, {
      renderable: panelRenderable,
      rect: { x: 4, y: i * (itemH + 2) + 2, width: svW - 8, height: itemH },
      parent: scrollResult.contentEntity,
      tintColor,
      cornerRadius: 3,
      zIndex: 11,
    });
  }
}

// ── DOM metrics overlay ───────────────────────────────────────────────────────
// Updated via RAF independent of the game loop so it doesn't inflate game
// update costs and doesn't pollute batch / instance metrics.

const elFps = document.getElementById('m-fps')!;
const elFrame = document.getElementById('m-frame')!;
const elBatches = document.getElementById('m-batches')!;
const elInstances = document.getElementById('m-instances')!;
const elHeap = document.getElementById('m-heap')!;
const elElements = document.getElementById('m-elements')!;

const scrollLabel = showScrollGroup ? ` + ${100} scroll items` : '';

elElements.textContent = `${elementCount}${scrollLabel}`;

let prevRafTime = performance.now();
let prevHeap = (
  performance as Performance & { memory?: { usedJSHeapSize: number } }
).memory?.usedJSHeapSize ?? 0;

function updateMetricsOverlay(now: number): void {
  const dt = now - prevRafTime;
  prevRafTime = now;

  const fps = dt > 0 ? 1000 / dt : 0;
  const { batchCount, instanceCount } = getUiRenderMetrics();

  const heapNow = (
    performance as Performance & { memory?: { usedJSHeapSize: number } }
  ).memory?.usedJSHeapSize;
  const heapDeltaKb =
    heapNow !== undefined ? (heapNow - prevHeap) / 1024 : null;

  if (heapNow !== undefined) {
    prevHeap = heapNow;
  }

  elFps.textContent = fps.toFixed(1);
  elFrame.textContent = `${dt.toFixed(2)} ms`;
  elBatches.textContent = batchCount.toString();
  elInstances.textContent = instanceCount.toString();
  elHeap.textContent =
    heapDeltaKb !== null
      ? `${heapDeltaKb >= 0 ? '+' : ''}${heapDeltaKb.toFixed(1)}`
      : 'n/a';

  requestAnimationFrame(updateMetricsOverlay);
}

requestAnimationFrame(updateMetricsOverlay);

// ── Start ─────────────────────────────────────────────────────────────────────

game.run();
