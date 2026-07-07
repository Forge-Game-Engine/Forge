#version 300 es

#property name: blit.frag

precision mediump float;

// Incoming texture coordinates from our vertex shader
in vec2 v_texCoord;

// The offscreen Framebuffer texture containing your rendered scene
uniform sampler2D u_sceneTexture;

// The final output color routed directly onto your monitor
out vec4 fragColor;

void main() {
    // Basic Blit: Sample the scene texture at the current coordinate and pass it through
    vec4 sceneColor = texture(u_sceneTexture, v_texCoord);
    
    fragColor = sceneColor;
}