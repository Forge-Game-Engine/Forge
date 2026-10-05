---
sidebar_position: 5
---

# Text Materials

Text is drawn with a built-in material: plain, anti-aliased ink in the
text's `color`. Give a text entity a material of your own to draw its fill
with your own fragment shader instead: a gradient or a highlight sweeping
across a title, a word that dissolves or flickers, colors that shift with
the game's state. It's the same idea as a TextMesh Pro material in Unity
or a `material` on a Label in Godot.

## Writing a text shader

A text shader receives `v_texCoord`, the glyph's coordinates in its font's
atlas, and `v_tint`, the text's `color` (with any fade from a canvas group
applied to its alpha). It includes the engine's `msdf` helpers, which
declare the font atlas uniforms and `msdfCoverage(texCoord)`: how much of
the pixel at `texCoord` the glyph's ink covers, from 0 to 1, anti-aliased
the same way the built-in material is. Output straight (not premultiplied)
alpha, like every sprite shader:

```glsl
#version 300 es

#pragma forge name(gradient-text.frag)

precision mediump float;

#pragma forge include(msdf)

uniform vec4 u_topColor;
uniform float u_height;

in vec2 v_texCoord;
in vec4 v_tint;
out vec4 fragColor;

void main() {
  float t = clamp(gl_FragCoord.y / u_height, 0.0, 1.0);
  vec4 color = mix(v_tint, u_topColor, t);

  fragColor = vec4(color.rgb, color.a * msdfCoverage(v_texCoord));
}
```

`msdfCoverage` takes any atlas coordinate, not just `v_texCoord`, so a
shader can sample the glyph's ink a little to either side of the pixel:
for a color split, a wobble or a sideways tear. Offsets are measured in
atlas coordinates; `fwidth(v_texCoord)` is how far those move per screen
pixel, so `v_texCoord + vec2(3.0, 0.0) * fwidth(v_texCoord)` samples three
screen pixels to the right whatever the text's size. Keep such offsets to
a few pixels: a glyph is only drawn within its own quad, which reaches
only a little past its ink, so ink moved further than that is cut off.

`msdfScreenPxDistance(texCoord)` gives the signed distance from the
glyph's edge in screen pixels (positive inside), for effects that need
more than coverage, such as an inner glow.

## Using a material

Build the material with
[`createTextMaterial`](/Forge/docs/api/functions/createTextMaterial), set
its uniforms, and give it to the text:

```ts
import { ForgeShaderSource } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  createTextMaterial,
} from '@forge-game-engine/forge/text';

const gradient = createTextMaterial(
  renderContext,
  new ForgeShaderSource(gradientTextShaderSource),
);

gradient.setColorUniform('u_topColor', new Color(1, 0.8, 0.2));
gradient.setUniform('u_height', renderContext.height);

addTextComponent(world, title, {
  text: 'GAME OVER',
  fontAtlas,
  size: 96,
  color: Color.red,
  material: gradient,
});
```

`createLabel` takes `material` too, for UI text. Set `material` back to
`undefined` to return to the built-in material.

The material only replaces the fill. A text's outline and shadow (see
[Text Effects](./text-effects.md)) are still drawn with the built-in
effects material, underneath it.

## Sharing materials

The text renderer binds each text's font to its material as it draws, so
one material works for any number of fonts. Its other uniforms are shared
by every text drawn with it: set `u_time` once a frame and every shimmering
title moves together. Text that needs different values (one word
dissolving while another stays whole) needs a material of its own, made
from the same shader. Text sharing a font, material and category is drawn
in one batch, so a material per entity costs a draw call each.

Animate a material from a system of your own:

```ts
const createShimmerEcsSystem = (
  time: Time,
  shimmer: Material,
): EcsSystem<[]> => ({
  query: [],
  update: () => {
    shimmer.setUniform('u_time', time.timeInSeconds);
  },
});
```

## Text materials or post-processing?

A text material draws each glyph separately, so it can only change pixels
on and right around the glyph. An effect that moves the whole image of a
title (tearing it far sideways, blurring it, bending it through a
shockwave) is post-processing: render the text with a camera of its own,
into a render target, and run a pass over that camera's image (see
[Multipass Rendering](../rendering/multipass-rendering.md)).
