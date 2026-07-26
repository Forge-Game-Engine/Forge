---
name: write-e2e-test
description: Add a real-browser Playwright test under /e2e for a cross-system feature (rendering, input, camera, animation, physics - anything that only truly proves itself on a real WebGL2 canvas with real DOM input events). Covers when a new feature needs e2e coverage, and the standard for asserting on actual rendered pixels tied back to logic state, not just numeric ECS assertions. Use when writing a new feature that touches rendering, input, or the game loop, or when explicitly asked to add an e2e/integration test.
---

# Write an E2E Test

`/e2e` holds real-browser Playwright tests for behavior that unit tests
cannot see: a real WebGL2 canvas, real DOM input events through the actual
input pipeline, and a real (manually stepped) game loop. Read `AGENTS.md`'s
"Integration & E2E Testing" section for the full layout, Node/browser
module-loading split, and how the suite runs in CI before starting.

## 1. Decide whether this feature needs one

Every new feature you write should be evaluated against this, not just
features explicitly requested as "add an e2e test for X". Ask:

- **Does correctness depend on more than one system agreeing with each
  other?** (e.g. a component's `.local` value being written by one system
  and correctly propagated to `.world` by another, then read by a third for
  rendering). Unit tests mock/isolate systems, so they can't catch the
  handoff between them being wrong or missing.
- **Does it touch the render pipeline, real input events, or the game
  loop's frame-to-frame state?** (camera, sprites, animation playback,
  particle emission, input bindings, culling). These are exactly the things
  `/src` unit tests fake out (mocked WebGL context, systems driven directly
  instead of through `world.update()`).
- **Would a plausible bug in this feature update internal state correctly
  while visibly doing nothing (or the wrong thing) on screen?** If yes,
  that's the strongest signal: a unit test asserting the internal state
  would pass anyway.

If none of these apply (e.g. a pure math utility, a data-only component
factory, a standalone class with no engine wiring), a unit test alone is
enough, skip this skill.

**Case study**: the camera pan/zoom e2e scene
(`e2e/fixtures/scenes/camera-pan-zoom.ts`) shipped initially with only
`expect(position.x).toBeGreaterThan(before.x)`-style assertions. It passed
even when `createTransformEcsSystem` was never registered in the scene -
`createCameraEcsSystem` updated the camera's `position.local` correctly (so
the numeric assertion passed), but nothing propagated that to
`position.world`, which is what `render-system.ts`'s projection matrix
actually reads. The camera never visibly moved. Only a rendered-pixel
assertion (see step 3) caught it.

## 2. Scaffold the scene

Follow AGENTS.md's "Adding a new scenario" steps: a `createScene:
CreateScene` in `e2e/fixtures/scenes/<name>.ts`, importing straight from
`../../../src/index.js` (never `/demo`, never `/documentation-site`),
returning a `SceneHandle` (or an interface extending it) with a `step()`
method and whatever getters/measurement methods your spec needs.

Give the scene something visible to look at. A flat clear color or a
plain, uncolored sprite looks identical whether the feature under test
worked or not, both on screen and in the recorded video. `camera-pan-zoom.ts`'s
pattern - a tinted checkerboard grid built from one generated white-square
image (`create-white-square-image.ts`), recolored per instance via
`SpriteEcsComponent.tintColor`, with one distinctly colored marker - is the
reusable template: cheap (no static asset files, keeping `/e2e` dependent
only on `/src`), and gives you a landmark to measure against.

## 3. Assert on rendered output, not just logic state

This is the core standard. A numeric assertion on ECS state
(`expect(camera.zoom).toBeGreaterThan(...)`) only proves the system under
test updated its own component - it's a unit test wearing a browser
costume, and you could write the same assertion faster with Vitest. The
point of paying for a real canvas is to prove the change is actually
visible.

### The pattern: relative, same-run pixel measurements tied to logic state

Add a measurement method to the scene handle that scans the *actual
displayed canvas bitmap* for a landmark (a distinctively tinted sprite, a
UI element, whatever the feature under test moves/resizes/recolors) and
returns its on-screen bounds. `measureGreenSquareBounds()` in
`camera-pan-zoom.ts` is the reference implementation:

```typescript
measureGreenSquareBounds(): GreenSquareBounds | null {
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = canvas.width;
  sampleCanvas.height = canvas.height;

  const context2d = sampleCanvas.getContext('2d');
  if (!context2d) {
    throw new Error('2D canvas context not available');
  }

  context2d.drawImage(canvas, 0, 0);

  const y = Math.floor(canvas.height / 2);
  const { data } = context2d.getImageData(0, y, canvas.width, 1);

  let left = -1;
  let right = -1;

  for (let x = 0; x < canvas.width; x++) {
    const offset = x * 4;
    if (isGreenish(data[offset], data[offset + 1], data[offset + 2])) {
      if (left === -1) left = x;
      right = x;
    }
  }

  return left === -1 ? null : { left, right };
},
```

In the spec, capture logic state (`zoom`, `position`, ...) *and* the
measured bounds in the same `captureState` call, before and after the
action under test, then assert the measured bounds moved/resized by the
amount the logic state predicts:

```typescript
const widthBefore = before.bounds!.right - before.bounds!.left;
const widthAfter = after.bounds!.right - after.bounds!.left;
const expectedWidthAfter = widthBefore * (after.zoom / before.zoom);

// Generous tolerance: pixel quantization and antialiased edges mean an
// exact match isn't realistic - this only needs to confirm the on-screen
// size actually tracks the zoom change, not match it to the pixel.
expect(widthAfter).toBeGreaterThan(expectedWidthAfter * 0.8);
expect(widthAfter).toBeLessThan(expectedWidthAfter * 1.2);
```

Why *relative* and *same-run*, specifically:

- Comparing a before/after measurement captured within the same test run
  means you never hardcode an expected pixel coordinate or exact color
  byte value - the assertion is "did it change by the amount the logic
  predicts", which is portable across screen sizes, DPI, and rendering
  backends.
- It still catches the class of bug logic-only assertions miss, because
  the "after" measurement comes from the real, current frame buffer, not
  from re-reading the same component the system under test just wrote.

### What to avoid

- **Hardcoded/absolute pixel-color assertions.** Don't assert
  `getPixel(400, 300) === '#3388cc'` or similar exact-coordinate,
  exact-color checks. They're brittle to anything that shifts layout by a
  pixel, and worse, they can be *wrong for reasons unrelated to your
  feature* - see the SwiftShader note below - in which case they fail
  the whole suite for the wrong reason instead of degrading gracefully.
- **Cross-environment golden-image screenshot diffing**
  (`expect(page).toHaveScreenshot()` / `toMatchSnapshot()`). This repo does
  not use it for `/e2e`. A golden image baked from one machine's GPU
  driver/rasterizer will not byte-match another's - see the SwiftShader
  discrepancy documented in `AGENTS.md`'s "Be wary of pixel-level rendering
  assertions": two independent local readback methods (`gl.readPixels` and
  a canvas 2D `drawImage`/`getImageData` readback) agreed with each other
  while still disagreeing with CI's actual rendered output, on every
  attempt, in a way traced to a genuine SwiftShader/GL compatibility
  difference in that specific CI environment - not a bug in either
  readback method. A golden-image diff would have flagged that as a
  regression on every single CI run, forever, unrelated to whether the
  feature worked. Relative measurement against the same run's own
  before/after state sidesteps this entirely: it only cares whether *this
  environment's* rendering changed by the right amount, never what the
  absolute pixels are.
- **Numeric-only assertions as the sole check**, per the case study above -
  they're not wrong to include (they're often the clearer failure message
  when something's off), but pair them with a rendered-output assertion
  rather than stopping at logic state.
- **Reading pixels across separate `page.evaluate`/CDP round-trips.** The
  canvas isn't created with `preserveDrawingBuffer`, so the browser may
  clear it as soon as control returns to Playwright after a frame is
  presented. Always call `step()` and any pixel-measurement method in the
  *same* `page.evaluate` callback (see `captureState` in
  `camera-pan-zoom.spec.ts`).

## 4. Write the spec

Follow `camera-pan-zoom.spec.ts`'s shape:

- `test.beforeEach` navigates to `/?scene=<name>` and waits for
  `window.__forgeTestHooks`, surfacing a captured `pageerror` instead of a
  bare timeout if the scene threw during construction.
- Drive real input (`page.locator('canvas').dispatchEvent('wheel', ...)`,
  `page.keyboard.down/up(...)`), spread over several `step()`-and-`step()`
  frames with a small real-time pause between them (see `animateFrames`) so
  the change is actually watchable in the recorded video, not one
  instantaneous jump.
- Use `test.step(...)` around each phase (capture, act, assert) - the
  `printSteps` reporter surfaces these live, which matters since most of a
  run's wall time is the dev server/browser starting up.

## 5. Verify

- `npx eslint e2e/fixtures/scenes/<name>.ts e2e/specs/<name>.spec.ts`
- `npx tsc --noEmit --project e2e/tsconfig.json`
- `npm run cspell` (add any new words to `.cspell/project-words.txt`,
  alphabetically)
- `npx playwright test --config e2e/playwright.config.ts -g "<test name>"`,
  run at least twice to catch flakiness before considering it done.
- Then the full root-level CLAUDE.md verification suite, since `/e2e`
  changes alone don't require it but a feature change elsewhere typically
  does.

If you deliberately break the feature under test locally (comment out the
system registration, revert the fix, etc.) and the new assertion doesn't
fail, the assertion isn't doing its job - go back to step 3.
