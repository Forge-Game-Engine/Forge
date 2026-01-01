export const backgroundShader = `#version 300 es
#property name: background.frag

precision mediump float;

uniform vec2 u_resolution;
uniform vec4 u_color;

#include <perlinNoise>

out vec4 fragColor;

float hash(vec2 p) {
  // stable 2D hash
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float stars(vec2 uv, float density, float rarity, float radius) {
  vec2 g = uv * density;
  vec2 grid = floor(g);
  vec2 cell = fract(g) - 0.5;

  float h = hash(grid);

  // only some cells get stars
  float exists = step(rarity, h);

  // round star falloff
  float d = length(cell);
  float s = smoothstep(radius, 0.0, d) * exists;

  // vary brightness a bit (bigger h -> brighter)
  float intensity = mix(0.6, 1.4, fract(h * 13.37));

  // tiny twinkle
  float twinkle = 0.85 + 0.15 * sin(u_time * 3.0 + h * 50.0);

  return s * intensity * twinkle;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv.x *= u_resolution.x / u_resolution.y;

  // background scroll
  vec2 uvBg = uv + vec2(0.0, u_time * 0.2);

  vec3 layer1 = perlinNoise(uvBg, 3.0, 0.35);
  vec3 layer2 = perlinNoise(uvBg, 8.0, 1.0);
  vec3 layer3 = perlinNoise(uvBg, 13.0, 2.0);

  vec3 combined = (layer1 * 0.8 + layer2 * 0.4 + layer3 * 0.2)
                / (0.8 + 0.4 + 0.2);

  combined = (combined * 0.5 + 0.5) - 0.6;

  vec2 uvStars = uv + vec2(0.0, u_time * 0.03);

  float starLayer1 = stars(uvStars, 130.0, 0.985, 0.3);

  vec2 uv2 = uv * 1.6 + vec2(0.0, u_time * 0.1); 
  float starLayer2 = stars(uv2, 60.0, 0.998, 0.4);            

  vec3 color = combined * u_color.rgb;

  color += starLayer1 + starLayer2;

  fragColor = vec4(color, u_color.a);
}`;
