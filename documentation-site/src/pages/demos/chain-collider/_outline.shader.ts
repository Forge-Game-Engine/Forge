/**
 * The level outlines' vertex shader. `meshVertex` places each vertex with
 * the entity's world transform and the camera's view.
 */
export const outlineVertexShader = `#version 300 es
#pragma forge name(chain-outline.vert)
#pragma forge include(meshVertex)

in vec2 a_position;
in vec4 a_color;

out vec4 v_color;

void main() {
  vec2 world = meshWorldPosition(a_position);

  gl_Position = meshClipPosition(world);
  forwardMeshMask(world);
  v_color = a_color;
}`;

/**
 * The level outlines' fragment shader: the ribbon's color, in straight
 * alpha.
 */
export const outlineFragmentShader = `#version 300 es
#pragma forge name(chain-outline.frag)

precision mediump float;

in vec4 v_color;
out vec4 fragColor;

#pragma forge include(mask)

void main() {
  fragColor = vec4(v_color.rgb, v_color.a * maskCoverage());
}`;
