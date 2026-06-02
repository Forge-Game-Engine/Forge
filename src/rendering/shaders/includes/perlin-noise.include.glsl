#property name: perlinNoise

#include <randomGradient>
#include <quintic>

vec3 perlinNoise(vec2 uv, float size, float timeMultiplier) {
  vec3 black = vec3(0.0);
  vec3 color = black;

  // part 1 - set up a grid of cells
  uv = uv * size;
  vec2 gridId = floor(uv);
  vec2 gridUv = fract(uv);

  // part 2.1 - start by finding the coords of grid corners
  vec2 bl = gridId + vec2(0.0, 0.0);
  vec2 br = gridId + vec2(1.0, 0.0);
  vec2 tl = gridId + vec2(0.0, 1.0);
  vec2 tr = gridId + vec2(1.0, 1.0);

  // part 2.2 - find random gradient for each grid corner
  vec2 gradBl = randomGradient(bl, timeMultiplier);
  vec2 gradBr = randomGradient(br, timeMultiplier);
  vec2 gradTl = randomGradient(tl, timeMultiplier);
  vec2 gradTr = randomGradient(tr, timeMultiplier);

  // part 3.2 - find distance from current pixel to each grid corner
  vec2 distFromPixelToBl = gridUv - vec2(0.0, 0.0);
  vec2 distFromPixelToBr = gridUv - vec2(1.0, 0.0);
  vec2 distFromPixelToTl = gridUv - vec2(0.0, 1.0);
  vec2 distFromPixelToTr = gridUv - vec2(1.0, 1.0);

  // part 4.1 - calculate the dot products of gradients + distances
  float dotBl = dot(gradBl, distFromPixelToBl);
  float dotBr = dot(gradBr, distFromPixelToBr);
  float dotTl = dot(gradTl, distFromPixelToTl);
  float dotTr = dot(gradTr, distFromPixelToTr);

  // part 4.4 - smooth out gridUvs
  gridUv = quintic(gridUv);

  // part 4.2 - perform linear interpolation between 4 dot products
  float b = mix(dotBl, dotBr, gridUv.x);
  float t = mix(dotTl, dotTr, gridUv.x);
  float perlin = mix(b, t, gridUv.y);

  // part 4.3 - display perlin noise
  color = vec3(perlin + 0.2);

  return color;
}