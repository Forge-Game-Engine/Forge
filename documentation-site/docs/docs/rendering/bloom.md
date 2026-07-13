---
sidebar_position: 3
---

# Bloom

[`createBloomEcsSystem`](/Forge/docs/api/functions/createBloomEcsSystem) is an
additive glow post-processing effect, built on the same render target/present
pass plumbing described in
[Multipass Rendering](./multipass-rendering.md) and the same separable blur
technique used by [Gaussian Blur](./gaussian-blur.md). Use it to make bright
sprites (lasers, explosions, engine trails, magical effects) read as glowing
or emissive rather than flat.

It only affects cameras that have both a `renderTarget` and a
[`BloomEcsComponent`](/Forge/docs/api/interfaces/BloomEcsComponent) (attach
one with `addBloom`); a camera missing either renders untouched.

## How it works

Each frame, for every distinct bloomed render target:

1. **Threshold** — every pixel's brightness is compared against
   `threshold`; only the pixels above it (faded in smoothly, not cut off
   sharply) are kept, into a scratch buffer.
2. **Blur** — that scratch buffer is blurred with the same two-pass
   horizontal/vertical technique as `createGaussianBlurEcsSystem`, `passes`
   times, at a quarter of the camera's render target resolution (see
   below).
3. **Composite** — the blurred bright pixels are added back onto the
   original (unblurred), full-resolution scene, scaled by `intensity`.

The blur chain runs downsampled because the blur shader's kernel only
samples a handful of texels per pass: at full render target resolution,
that reach is a handful of _screen_ pixels, which on a large canvas barely
registers as a glow no matter how many `passes` you throw at it. Running
the same kernel and pass count on a quarter-resolution buffer instead makes
each texel already cover several source pixels, so the glow visibly spreads
well past a sprite's edges with a modest, cheap `passes` count. The
composite pass upsamples it back implicitly, via the bloom texture's own
linear-filtered sampling.

The thresholded buffer's alpha carries how strongly each pixel contributes
to the glow, not the source pixel's original transparency, so the blur can
spread the glow's own opacity out past a sprite's silhouette into
previously-transparent pixels. This matters if the camera's `renderTarget`
gets alpha-blended onto something else afterwards (for example a sharp
foreground layered over a background, as in
[Layering multiple render targets](./multipass-rendering.md#layering-multiple-render-targets)):
without this, the glow would only ever brighten already-opaque pixels and
never show as a soft halo bleeding past their edges.

## Wiring it up

Following the rest of Forge's ECS conventions, bloom settings are entity
data, not options baked into the system: `createBloomEcsSystem` takes only a
`RenderContext` and processes whichever cameras carry a
`BloomEcsComponent`. Give the camera a `renderTarget`, attach the component
with `addBloom`, then register the bloom system after the render system and
before the present system, since it reads what the render system just drew
and the present system draws whatever the bloom system leaves behind:

```ts
import {
  addBloom,
  addCamera,
  createBloomEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
} from '@forge-game-engine/forge/rendering';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, renderContext } = createGame('game-container');

const sceneTarget = createRenderTarget(
  renderContext.gl,
  renderContext.width,
  renderContext.height,
);

const camera = addCamera(world, { renderTarget: sceneTarget });

addBloom(world, camera, { threshold: 0.7, passes: 4, intensity: 1 });

world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createBloomEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

:::caution
Registration order matters here in the same way it does for Gaussian blur:
the bloom system reads the camera's `renderTarget` as it was left by
whichever system last wrote to it, and writes its result back into that same
target. Registering it before the render system blooms last frame's stale
contents; registering it after the present system blooms a frame too late to
ever be shown.
:::

If a camera has both a `BloomEcsComponent` and a `GaussianBlurEcsComponent`,
register `createBloomEcsSystem` before `createGaussianBlurEcsSystem` so the
glow itself gets softened along with the rest of the scene, matching what
the space-shooter demo does for its foreground camera.

Because it's just component data, you can retune it at any point after
creation by fetching the component and writing to it, the same way the
space-shooter demo's camera shake works:

```ts
import { bloomId } from '@forge-game-engine/forge/rendering';

const bloom = world.getComponent(camera, bloomId)!;
bloom.intensity = 2; // e.g. a stronger glow while a power-up is active
```

To bloom only _some_ of a scene (for example gameplay sprites, but not a
UI overlay layered on top), give those cameras _separate_ render targets
instead of a shared one, and attach `BloomEcsComponent` only to the one that
should glow: see [Layering multiple render targets](./multipass-rendering.md#layering-multiple-render-targets).

## Tuning: threshold, passes, and intensity

[`BloomEcsComponent`](/Forge/docs/api/interfaces/BloomEcsComponent) has
three knobs:

- **`threshold`** (`0` to `1`, default `0.8`) sets the relative luminance
  above which a pixel starts contributing to the glow. Lower it to make more
  of the scene bloom (everything but the darkest pixels); raise it so only
  the very brightest highlights (a laser core, a muzzle flash) glow.
- **`passes`** sets how soft and wide-reaching the glow is, exactly like
  [`GaussianBlurEcsComponent.passes`](/Forge/docs/api/interfaces/GaussianBlurEcsComponent):
  each pass reads the previous pass's already-blurred bright pixels back out
  and writes further blurred versions in. Because the blur chain runs
  downsampled (see above), even a small `passes` count (`3`–`4`) already
  produces a glow that visibly bleeds past a sprite's edges; there's rarely
  a need to push it much higher.
- **`intensity`** (default `1`) scales how strongly the blurred bright
  pixels are added back onto the scene. Unlike
  `GaussianBlurEcsComponent.intensity`, this is **not** a `0`–`1` blend
  factor and isn't clamped to `1`: it's an additive multiplier, so `2` adds
  the glow at twice its original brightness, and `0` disables bloom
  entirely (cheaper than `passes: 0`, since it also skips allocating the
  internal scratch buffers on first use).

```ts
addBloom(world, camera, { threshold: 0.6, passes: 6, intensity: 1.5 });
```

:::tip
By default, [`RenderTarget`](/Forge/docs/api/classes/RenderTarget) uses an
8-bit-per-channel color texture, so scene colors are clamped to `[0, 1]`
before bloom ever sees them: `threshold` is comparing against already-clamped
brightness, and there's no way to make one white sprite bloom more than
another equally white sprite by giving it a brighter-than-white color.
`threshold` and `intensity` are still enough to make specific bright
elements (lasers, explosions, magic effects) pop against a duller
background within that constraint — but if you want a sprite to bloom
based on true HDR brightness (for example an emissive map on an otherwise
unlit surface, see [Emissive-driven bloom](#emissive-driven-bloom) below),
give the camera's render target `RENDER_TARGET_FORMAT.hdr` instead and pair
it with `addToneMapping`. See [HDR Rendering &
Tone Mapping](./hdr-rendering.md).
:::

## Performance note

Bloom costs one threshold pass, two full-screen draws per blur `passes`
(same cost shape as [Gaussian Blur](./gaussian-blur.md#performance-note)),
one composite pass, and one final copy back into the camera's
`renderTarget` — `2 * passes + 3` full-screen draws in total, regardless of
`intensity`. The threshold and blur passes are far cheaper than that count
suggests, though: they run at a quarter of the render target's resolution
(a sixteenth of the fragment shader invocations per draw), which is also
why a small `passes` count already produces a wide glow (see Tuning,
above).

There are three lazily-allocated internal scratch render targets per
distinct render target the first time it's bloomed: a downsampled
bright-pass buffer, a downsampled [`PingPongTarget`](/Forge/docs/api/classes/PingPongTarget)
pair for the blur, and one full-resolution buffer for the composite pass's
output (it can't write directly into the camera's `renderTarget`, since
that's also the texture it's reading the unblurred scene from). All three
are resized (or recreated) automatically if the render target's dimensions
change, and disposed automatically when the world stops. Each of these
scratch buffers inherits the source render target's format, so bloom on an
`hdr` camera stays HDR end-to-end without any extra configuration — see
[HDR Rendering & Tone Mapping](./hdr-rendering.md).

## Emissive-driven bloom

`createImageSprite` accepts an optional emissive map: a texture added on top
of the sprite's tinted albedo, unaffected by lighting or tint. Passing an
`intensity` above `1` pushes a pixel's brightness above the LDR ceiling,
so on an `hdr`-format camera it blooms convincingly even where the sprite's
own albedo isn't pure white — a neon sign's tube can stay a dim, believable
color while still glowing brighter than the scene around it:

```ts
import {
  addBloom,
  addCamera,
  addToneMapping,
  createBloomEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
  createToneMapEcsSystem,
  RENDER_TARGET_FORMAT,
} from '@forge-game-engine/forge/rendering';

const sceneTarget = createRenderTarget(
  renderContext.gl,
  renderContext.width,
  renderContext.height,
  RENDER_TARGET_FORMAT.hdr,
);

const camera = addCamera(world, { renderTarget: sceneTarget });

addBloom(world, camera, { threshold: 0.8, passes: 4, intensity: 1 });
addToneMapping(world, camera);

const neonSign = createImageSprite(
  neonSignImage,
  renderContext,
  0,
  undefined,
  { image: neonSignEmissiveMap, intensity: 4 },
);

world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createBloomEcsSystem(renderContext));
world.addSystem(createToneMapEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

Without the emissive map, `threshold` is the only way to make part of a
sprite glow more than the rest, and it can't distinguish "this part is
meant to be a light source" from "this part happens to be pale" — both
read as the same brightness once clamped to `[0, 1]`. The emissive map
sidesteps that: its contribution is added *after* the albedo sample, so it
can push specific pixels arbitrarily bright regardless of the sprite's own
tint or texture color, without lightening the rest of the sprite. See [HDR
Rendering & Tone Mapping](./hdr-rendering.md) for how the `hdr` render
target and `addToneMapping` work together to make this look right once
presented.

### Authoring an emissive map

An emissive map's color is added on top of the tinted albedo; its own
**alpha channel is ignored**. This matches every mainstream engine's
emissive model (glTF, Unity, Unreal, three.js all treat emissive as an
RGB-only additive term): a sprite's opacity comes entirely from its base
texture's alpha, and emissive can't make an otherwise-transparent pixel
show up. If part of your emissive map sits over a region where the base
texture's alpha is near zero, that region will still render as nearly
invisible, no matter how bright the emissive color is there.

This trips people up coming from older, pre-bloom 2D techniques, where a
sprite's own soft glow was faked by painting a **low-alpha color gradient**
into the sprite and letting normal alpha blending fade it into the
background. That approach actively fights this pipeline: alpha blending
scales a pixel's contribution by its alpha regardless of how vivid the
color stored there is, so a wide, softly-fading, low-alpha "glow" gets
crushed to near-nothing, while only the fully-opaque core still reads
clearly.

The fix is to stop faking the soft falloff in the source art entirely and
let bloom's blur produce it instead:

- Author both the base texture and the emissive map with **solid,
  reasonably opaque edges** matching the shape you actually want visible
  (a bullet's core and tail, say) — not a gradient fading to near-zero
  alpha.
- Pick a **moderate** `intensity` (roughly `1`–`3` for a subtle glow); very
  high values (`5`+) push almost every colored pixel toward the same
  blown-out white once [tone mapping](./hdr-rendering.md) compresses it
  back down, which reads as "glowing white" rather than "glowing amber" or
  whatever hue you intended.
- Let `passes` (and, for an HDR camera, `RENDER_TARGET_FORMAT.hdr` +
  `addToneMapping`) do the work of spreading that opaque shape into a soft
  halo — that's what the blur passes are for, and unlike a hand-painted
  gradient it composites correctly in HDR and tone-maps smoothly at the
  edges instead of banding.
