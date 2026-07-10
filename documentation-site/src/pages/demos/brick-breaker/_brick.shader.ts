export const brickShader = `#version 300 es

#pragma forge name(brick.frag)

precision mediump float;

uniform sampler2D u_texture;
uniform float u_time;

in vec2 v_texCoord;
in vec4 v_tint;
out vec4 fragColor;

void main() {
  vec4 tex = texture(u_texture, v_texCoord);
  vec3 color = tex.rgb * v_tint.rgb;

  // Glossy highlight near the top of the brick, like light reflecting off a curved surface.
  float gloss = smoothstep(0.55, 1.0, v_texCoord.y) * 0.45;

  // A diagonal sheen that loops across the brick over time.
  float diagonal = (v_texCoord.x + v_texCoord.y) * 0.5;
  float sweep = fract(diagonal - u_time * 0.4);
  float sheen = smoothstep(0.08, 0.0, abs(sweep - 0.5)) * 0.7;

  color += (gloss + sheen) * tex.a;

  fragColor = vec4(color, tex.a);
}`;
