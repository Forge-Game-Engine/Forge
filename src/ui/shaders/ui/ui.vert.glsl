#version 300 es

#property name: ui.vert

// Per-vertex: unit quad texture coordinates [0,1]x[0,1]
in vec2 a_texCoord;

// Per-instance: worldMatrix columns (column-major mat3)
in vec3 a_worldMat0;
in vec3 a_worldMat1;
in vec3 a_worldMat2;

// Per-instance: element size in screen-space pixels
in vec2 a_size;

// Per-instance style
in vec4 a_tint;
in vec4 a_borderColor;
in float a_borderWidth;
in float a_cornerRadius;
in float a_opacity;

// Per-instance clip rect (x, y, w, h in screen-space pixels; w=0 means no clipping)
in vec4 a_clipRect;

uniform mat3 u_projection;

out vec2 v_uv;
out vec2 v_size;
out vec4 v_tint;
out vec4 v_borderColor;
out float v_borderWidth;
out float v_cornerRadius;
out float v_opacity;
out vec4 v_clipRect;
out vec2 v_screenPos;

void main() {
    mat3 worldMatrix = mat3(a_worldMat0, a_worldMat1, a_worldMat2);

    // Transform unit quad [0,1]x[0,1] to screen-space pixels
    vec3 screenPos = vec3(a_texCoord, 1.0) * worldMatrix;

    // Project to clip space
    vec3 clipPos = screenPos * u_projection;

    gl_Position = vec4(clipPos.xy, 0.0, 1.0);

    v_uv = a_texCoord;
    v_size = a_size;
    v_tint = a_tint;
    v_borderColor = a_borderColor;
    v_borderWidth = a_borderWidth;
    v_cornerRadius = a_cornerRadius;
    v_opacity = a_opacity;
    v_clipRect = a_clipRect;
    v_screenPos = screenPos.xy;
}
