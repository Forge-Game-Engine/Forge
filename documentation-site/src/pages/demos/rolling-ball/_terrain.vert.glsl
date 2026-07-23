#version 300 es

#pragma forge name(rollingBallTerrain.vert)

in vec2 a_position;
in float a_distance;
in float a_depth;

uniform mat3 u_projection;

out float v_distance;
out float v_depth;

void main() {
  vec3 projected = u_projection * vec3(a_position, 1.0);

  gl_Position = vec4(projected.xy, 0.0, 1.0);
  v_distance = a_distance;
  v_depth = a_depth;
}
