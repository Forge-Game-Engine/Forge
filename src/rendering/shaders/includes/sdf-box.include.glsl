#property name: sdfBox

// inigo quilez - https://iquilezles.org/articles/distfunctions2d/
float sdfBox( in vec2 p, in vec2 b )
{
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}
