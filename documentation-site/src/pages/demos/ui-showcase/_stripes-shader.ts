// A custom fragment shader paired with the engine's stock `uiVertexShader`.
// It reuses the standard instance layout (bindUiInstanceData /
// setupUiInstanceAttributes) and repurposes `a_borderColor` as a second
// stripe color, since custom shaders only receive the transform + the
// standard UiRenderableEcsComponent fields, see the Custom Materials guide.
export const stripesFragmentShader = `#version 300 es

precision highp float;

in vec2 v_uv;
in vec2 v_size;
in vec4 v_tint;
in vec4 v_borderColor;
in float v_borderWidth;
in float v_cornerRadius;
in float v_opacity;
in vec4 v_clipRect;
in vec2 v_screenPos;

out vec4 fragColor;

void main() {
  if (v_clipRect.z > 0.0 && v_clipRect.w > 0.0) {
    if (v_screenPos.x < v_clipRect.x ||
        v_screenPos.y < v_clipRect.y ||
        v_screenPos.x > v_clipRect.x + v_clipRect.z ||
        v_screenPos.y > v_clipRect.y + v_clipRect.w) {
      discard;
    }
  }

  float stripe = step(0.5, fract((v_uv.x + v_uv.y) * 8.0));
  vec3 color = mix(v_tint.rgb, v_borderColor.rgb, stripe);

  fragColor = vec4(color, v_tint.a * v_opacity);
}
`;
