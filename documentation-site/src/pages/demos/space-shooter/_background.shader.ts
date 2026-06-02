export const backgroundShader = `#version 300 es
#property name: background.frag

precision mediump float;

uniform vec2 u_resolution;
uniform vec4 u_color;
uniform sampler2D u_bgTexture;
uniform float u_time;

out vec4 fragColor;

uint hash2(uvec2 v) {
    v = v * 1664525u + 1013904223u;
    v.x ^= v.y >> 16;
    v.y ^= v.x >> 16;
    v *= 2246822519u;
    v ^= v >> 13;
    return v.x ^ v.y;
}

float hash01(uvec2 v) {
    return float(hash2(v)) * (1.0 / 4294967296.0);
}

float stars(vec2 uv, float density, float rarity, float radius) {
  vec2 g = uv * density;
  const int PERIOD = 4096;
  ivec2 gi = ivec2(floor(g));
  gi = ivec2(gi.x & (PERIOD - 1), gi.y & (PERIOD - 1));

  vec2 cell = fract(g) - 0.5;

  float h = hash01(uvec2(gi));

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

  vec2 uv1 = uv + vec2(0.0, u_time * 0.07);
  float starLayer1 = stars(uv1, 130.0, 0.985, 0.3);

  vec2 uv2 = uv * 1.6 + vec2(0.0, u_time * 0.1); 
  float starLayer2 = stars(uv2, 90.0, 0.995, 0.4);    

  vec2 uv3 = uv * 1.6 + vec2(0.0, u_time * 0.15); 
  float starLayer3 = stars(uv3, 60.0, 0.998, 0.5);          

  vec3 color = vec3(starLayer1 + starLayer2 + starLayer3);

  vec2 tile = vec2(0.5, 0.5);
  float scrollSpeed = 0.03;
  vec2 uvTex = fract(uv * tile + vec2(0.0, u_time * scrollSpeed));
  vec3 bgTex = texture(u_bgTexture, uvTex).rgb;
  color += bgTex;

  fragColor = vec4(color, u_color.a);
}`;
