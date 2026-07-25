// Every demo's canvas sits inside the same fixed `height: 600px` `.demoBox`
// (see `_Demo.module.css`) outside of fullscreen. Setting every demo
// camera's `verticalWorldUnits` to that same reference height means every
// existing world-unit position/size in these demos (previously tuned
// assuming 1 world unit == 1 pixel) keeps its current on-screen scale in
// the common, non-fullscreen case, while still rendering consistently
// (the actual fix) on any other resolution or aspect ratio, including
// fullscreen, instead of stretching/shrinking with the canvas.
export const DEMO_VERTICAL_WORLD_UNITS = 600;
