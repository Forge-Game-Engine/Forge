export const erosionShader = `#version 300 es

#pragma forge name(erosion.frag)

precision mediump float;

uniform sampler2D u_texture;
uniform sampler2D u_noiseTexture;
uniform sampler2D u_burnGradient;
uniform float u_burnProgress;
uniform float u_edgeWidth;

in vec2 v_texCoord;
in vec4 v_tint;
out vec4 fragColor;

void main() {
  vec4 tex = texture(u_texture, v_texCoord);
  float noise = texture(u_noiseTexture, v_texCoord).r;

  // Pixels whose noise value has fallen below the burn line have been consumed by the fire.
  float visible = step(u_burnProgress, noise);
  float alpha = visible * tex.a;

  // A thin band of noise values just ahead of the burn line is still visible but
  // glowing, like a smouldering edge eating into the sprite.
  float edge = visible * (1.0 - smoothstep(u_burnProgress, u_burnProgress + u_edgeWidth, noise));
  vec3 burnColor = texture(u_burnGradient, vec2(edge, 0.5)).rgb;

  vec3 color = mix(tex.rgb, burnColor, edge) * v_tint.rgb;

  fragColor = vec4(color, alpha);
}`;
