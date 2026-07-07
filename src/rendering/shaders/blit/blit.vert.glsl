#version 300 es

#property name: blit.vert

// No attributes incoming from the CPU! We use the built-in vertex identifier.
out vec2 v_texCoord;

void main() {
    // Math to compute a full-screen triangle covering [-1, 1] using vertex IDs 0, 1, and 2
    float x = -1.0 + float((gl_VertexID & 1) << 2);
    float y = -1.0 + float((gl_VertexID & 2) << 1);
    
    // Generate accurate texture space maps [0.0 to 1.0] matching the screen area
    v_texCoord = vec2(x * 0.5 + 0.5, y * 0.5 + 0.5);
    
    // Output direct clip space coordinates straight to the rasterizer
    gl_Position = vec4(x, y, 0.0, 1.0);
}