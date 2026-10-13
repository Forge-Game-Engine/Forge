/**
 * The exhaust's vertex shader. `meshVertex` places each vertex with the
 * entity's world transform and the camera's view, and forwards the masks
 * above it to the fragment shader.
 */
export const exhaustVertexShader = `#version 300 es
#pragma forge name(exhaust.vert)
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
 * The exhaust's fragment shader: the color interpolated between the
 * vertices, in straight alpha, clipped by any masks above it.
 */
export const exhaustFragmentShader = `#version 300 es
#pragma forge name(exhaust.frag)

precision mediump float;

in vec4 v_color;
out vec4 fragColor;

#pragma forge include(mask)

void main() {
  fragColor = vec4(v_color.rgb, v_color.a * maskCoverage());
}`;
