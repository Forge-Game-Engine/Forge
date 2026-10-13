#version 300 es

#pragma forge name(terrain.vert)
#pragma forge include(meshVertex)

in vec2 a_position;
in float a_distance;
in float a_depth;

out float v_distance;
out float v_depth;

void main() {
  vec2 world = meshWorldPosition(a_position);

  gl_Position = meshClipPosition(world);
  forwardMeshMask(world);
  v_distance = a_distance;
  v_depth = a_depth;
}
