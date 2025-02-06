#version 300 es

in vec2 a_position;    // 2D vertex position
in vec2 a_texCoord;    // Texture coordinate

uniform mat3 u_matrix; // 2D transformation matrix (3x3 for 2D)

out vec2 v_texCoord;   // Output to fragment shader

void main() {
  // Multiply the 2D position by our matrix to get final position in clip space.
    vec3 pos = u_matrix * vec3(a_position, 1.0f);

  // Convert from 2D space to clip space
    gl_Position = vec4(pos.xy, 0.0f, 1.0f);

  // Pass texture coordinates to the fragment shader
    v_texCoord = a_texCoord;
}
