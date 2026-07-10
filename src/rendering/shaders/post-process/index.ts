import crossFadeFragmentShaderSource from './cross-fade.frag.glsl?raw';
import gaussianBlurFragmentShaderSource from './gaussian-blur.frag.glsl?raw';
import passthroughFragmentShaderSource from './passthrough.frag.glsl?raw';
import passthroughVertexShaderSource from './passthrough.vert.glsl?raw';

export const passthroughFragmentShader = passthroughFragmentShaderSource;
export const passthroughVertexShader = passthroughVertexShaderSource;
export const gaussianBlurFragmentShader = gaussianBlurFragmentShaderSource;
export const crossFadeFragmentShader = crossFadeFragmentShaderSource;
