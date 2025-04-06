uniform float u_time;

vec2 randomGradient(vec2 p, float timeMultiplier) {
  p = p + 0.02;
  float x = dot(p, vec2(123.4, 234.5));
  float y = dot(p, vec2(234.5, 345.6));
  vec2 gradient = vec2(x, y);
  gradient = sin(gradient);
  gradient = gradient * 43758.5453;

  gradient = sin(gradient + u_time * timeMultiplier);
  return gradient;
}