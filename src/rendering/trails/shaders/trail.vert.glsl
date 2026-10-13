#version 300 es
#pragma forge name(trail.vert)
#pragma forge include(meshVertex)

in vec2 a_position; // In the trail's entity's local space
in vec2 a_texCoord;
in vec4 a_color;    // Straight alpha; red, green and blue can be above 1

out vec2 v_texCoord;
out vec4 v_color;

void main() {
  vec2 world = meshWorldPosition(a_position);

  gl_Position = meshClipPosition(world);
  forwardMeshMask(world);
  v_texCoord = a_texCoord;
  v_color = a_color;
}
