#property name: sdfCircle

// inigo quilez - https://iquilezles.org/articles/distfunctions2d/
float sdfCircle(in vec2 p, in float r) {
  return length(p) - r;
}