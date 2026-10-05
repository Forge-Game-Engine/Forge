---
sidebar_position: 6
---

# Custom Post-Processing

Bloom, blur and tone mapping are built in, but plenty of effects aren't: a
glitch, a shockwave that bends the scene, a color grade, a CRT filter. A
[`PostProcessEcsComponent`](/Forge/docs/api/interfaces/PostProcessEcsComponent)
runs your own full-screen shaders over a camera's image, in order, each over
the previous one's output, the same way Unity's Full Screen Pass renderer
feature and Godot's compositor effects do. Like the built-in effects, it
needs a camera that renders into a render target (see
[Multipass Rendering](./multipass-rendering.md)).

## Writing a pass

A pass is a [`Material`](/Forge/docs/api/classes/Material) made from the
engine's `passthrough.vert` vertex shader and a fragment shader that samples
`u_texture`, the image so far, at `v_texCoord`:

```glsl
#version 300 es

#pragma forge name(monochrome.frag)

precision mediump float;

uniform sampler2D u_texture;
uniform float u_amount;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  fragColor = vec4(mix(color.rgb, vec3(luminance) * color.a, u_amount), color.a);
}
```

`u_texture` holds premultiplied alpha, like every render target, and the
pass's output is stored the same way. Scaling a color darkens it without
changing its coverage; mixing in a new color means multiplying it by the
pixel's alpha first, as the `luminance` above is.

## Adding passes to a camera

Register the shader, build the material, and list it on the camera:

```ts
import {
  addPostProcessComponent,
  createCamera,
  createPostProcessEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
  ForgeShaderSource,
  Material,
} from '@forge-game-engine/forge/rendering';

const camera = createCamera(world, {
  renderTarget: renderContext.createRenderTarget(),
});

const { gl, shaderCache } = renderContext;

shaderCache.addShader(new ForgeShaderSource(monochromeShaderSource));

const monochrome = new Material(
  shaderCache.getShader('passthrough.vert'),
  shaderCache.getShader('monochrome.frag'),
  gl,
);

monochrome.setUniform('u_amount', 1);

addPostProcessComponent(world, camera, { materials: [monochrome] });

world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createPostProcessEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

[`createPostProcessEcsSystem`](/Forge/docs/api/functions/createPostProcessEcsSystem)
runs every camera's passes at the point it's registered: after the render
system, after any built-in effect whose output the passes should see (tone
mapping, say, so a color grade works on displayable colors), and before the
present system.

## Animating a pass

The system only sets `u_texture`. Every other uniform is yours, so an
animated effect gets a small system of its own that writes them each frame,
for example from a component on the camera:

```ts
const createMonochromeFadeEcsSystem = (
  time: Time,
  material: Material,
): EcsSystem<[]> => {
  let amount = 0;

  return {
    query: [],
    update: () => {
      amount = Math.min(1, amount + time.deltaTimeInSeconds);
      material.setUniform('u_amount', amount);
    },
  };
};
```

A material is a single set of uniforms, so cameras that need different
values for the same effect (a stronger highlight on one layer than another,
say) each need their own material made from the same shader.

## Turning passes on and off

`materials` is read every frame, so add or remove passes at any time:

```ts
const postProcess = addPostProcessComponent(world, camera, {
  materials: [],
});

postProcess.materials.push(monochrome);
postProcess.materials.length = 0;
```

Take a pass out of the list rather than leaving it at zero strength: every
pass is a full-screen draw at the canvas's resolution whether or not it
changes anything. When several cameras share a render target, only the
first one's passes run over it.

## How the passes are chained

A draw can't sample the texture it's drawing into, so each pass writes into
a scratch target and the next pass reads it back, alternating between the
two. An odd number of passes ends with one extra copy back into the
camera's target. The built-in effects use the same
[`PostProcessWriter`](/Forge/docs/api/classes/PostProcessWriter) to write
their results back, so a system of your own that needs more than one input
texture per pass (a scene plus a mask, say) can use it too:

```ts
const writer = new PostProcessWriter(renderContext);

writer.write(renderTarget, 1, (scene) => {
  combineMaterial.setUniform('u_scene', scene);
  combineMaterial.setUniform('u_mask', maskTarget.colorTexture);
  drawFullscreenQuad(renderContext, combineMaterial);
});
```

Call `writer.dispose()` in the system's `cleanup` to free its scratch
targets.
