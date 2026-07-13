#version 300 es

#pragma forge name(sprite.frag)

precision mediump float;

uniform sampler2D u_texture;          // The sprite texture
uniform sampler2D u_emissiveTexture;  // Emissive map, added on top unlit
uniform vec4 u_emissiveColor;         // Tints the (typically greyscale) emissive map
uniform float u_emissiveIntensity;    // Emissive map multiplier

in vec2 v_texCoord;           // Input from vertex shader
in vec4 v_tint;               // Tint color
out vec4 fragColor;           // Output color

void main() {

  vec4 tex = texture(u_texture, v_texCoord);
  vec3 emissiveMask = texture(u_emissiveTexture, v_texCoord).rgb;
  vec3 emissive = emissiveMask * u_emissiveColor.rgb * u_emissiveIntensity;

  fragColor = vec4(tex.rgb * v_tint.rgb + emissive, tex.a);
}
