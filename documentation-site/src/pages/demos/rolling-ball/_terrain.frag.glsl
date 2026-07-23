#version 300 es

#pragma forge name(rollingBallTerrain.frag)

precision mediump float;

uniform sampler2D u_fillTexture;
uniform sampler2D u_borderTexture;
uniform vec2 u_fillTileSize;
uniform vec2 u_borderTileSize;
uniform vec4 u_fillTint;
uniform vec4 u_borderTint;
uniform float u_borderWidth;
uniform float u_borderBlend;

in float v_distance;
in float v_depth;

out vec4 fragColor;

void main() {
  vec2 fillUv = vec2(v_distance / u_fillTileSize.x, v_depth / u_fillTileSize.y);
  vec2 borderUv =
    vec2(v_distance / u_borderTileSize.x, v_depth / u_borderTileSize.y);

  vec4 fillColor = texture(u_fillTexture, fillUv) * u_fillTint;
  vec4 borderColor = texture(u_borderTexture, borderUv) * u_borderTint;

  // 0 near the surface (border texture), 1 once past the border band (fill
  // texture), smoothed across `u_borderBlend` so the two textures cross-fade
  // instead of cutting sharply from one to the other.
  float t = smoothstep(
    u_borderWidth - u_borderBlend,
    u_borderWidth + u_borderBlend,
    v_depth
  );

  fragColor = mix(borderColor, fillColor, t);
}
