---
sidebar_position: 1
---

# Rendering

Forge provides a WebGL-based rendering system for 2D games with support for sprites, colors, shaders, and multiple render layers.

## Overview

The rendering system includes:

- **Sprites** - 2D images rendered to the screen
- **Render Layers** - Organize sprites by depth
- **Shaders** - Customize rendering with WebGL shaders
- **Colors** - RGBA color management
- **Transforms** - Position, rotation, scale

## Basic Setup

Rendering is automatically set up when you create a world:

```ts
import { Game, createWorld } from '@forge-game-engine/forge';

const game = new Game();
const { world, renderLayers } = createWorld('main', game);

// renderLayers[0] is the default layer
// Additional layers can be accessed via renderLayers[1], renderLayers[2], etc.
```

## Sprites

### Creating Sprites

```ts
import {
  ImageCache,
  createShaderStore,
  createImageSprite
} from '@forge-game-engine/forge';

// Load image
const imageCache = new ImageCache();
const image = await imageCache.getOrLoad('player.png');

// Create shader store
const shaderStore = createShaderStore();

// Create sprite
const sprite = createImageSprite(
  image,
  renderLayers[0],  // Render layer
  shaderStore
);
```

### Adding Sprites to Entities

```ts
import { SpriteComponent, PositionComponent } from '@forge-game-engine/forge';

const entity = world.buildAndAddEntity('player', [
  new PositionComponent(100, 100),
  new SpriteComponent(sprite)
]);
```

### Sprite Properties

```ts
const spriteComp = entity.getComponent(SpriteComponent);

// Visibility
spriteComp.enabled = false;  // Hide sprite
spriteComp.enabled = true;   // Show sprite

// Access the sprite
const sprite = spriteComp.sprite;

// Modify sprite properties
sprite.uvStart = new Vector2(0, 0);
sprite.uvSize = new Vector2(0.5, 0.5);  // Show half the image
sprite.size = new Vector2(100, 100);    // Resize sprite
```

## Position and Transform

### Position Component

```ts
import { PositionComponent } from '@forge-game-engine/forge';

const position = new PositionComponent(100, 200);
entity.addComponent(position);

// Update position
position.x = 150;
position.y = 250;
```

### Rotation Component

```ts
import { RotationComponent } from '@forge-game-engine/forge';

// Create with degrees
const rotation = new RotationComponent(45);
entity.addComponent(rotation);

// Or set radians directly
rotation.radians = Math.PI / 4;
```

### Scale Component

```ts
import { ScaleComponent } from '@forge-game-engine/forge';

const scale = new ScaleComponent(2, 2);  // 2x size
entity.addComponent(scale);

// Update scale
scale.x = 1.5;
scale.y = 1.5;
```

## Render Layers

Render layers control draw order and can be used for parallax or UI separation:

```ts
// Access different layers
const backgroundLayer = renderLayers[0];
const gameLayer = renderLayers[1];
const uiLayer = renderLayers[2];

// Create sprites on different layers
const bgSprite = createImageSprite(bgImage, backgroundLayer, shaderStore);
const playerSprite = createImageSprite(playerImage, gameLayer, shaderStore);
const uiSprite = createImageSprite(uiImage, uiLayer, shaderStore);

// Sprites on higher layer indices render on top
```

## Colors

### Using Colors

```ts
import { Color } from '@forge-game-engine/forge';

// Create colors
const red = new Color(255, 0, 0, 255);      // Red
const blue = Color.blue;                     // Static blue color
const transparent = new Color(255, 0, 0, 128); // Semi-transparent red

// Color methods
const lighter = red.lighten(0.2);   // 20% lighter
const darker = red.darken(0.2);     // 20% darker

// Convert to hex
const hex = red.toHexString();  // "#FF0000"

// Static color constants
Color.red;
Color.green;
Color.blue;
Color.white;
Color.black;
Color.transparent;
```

### Color Component

```ts
import { ColorComponent } from '@forge-game-engine/forge';

const colorComp = new ColorComponent(255, 0, 0, 255);
entity.addComponent(colorComp);

// Modify color
colorComp.r = 128;  // Half red
colorComp.a = 128;  // Semi-transparent
```

## Complete Rendering Example

```ts
import {
  Game,
  createWorld,
  ImageCache,
  createShaderStore,
  createImageSprite,
  SpriteComponent,
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  ColorComponent
} from '@forge-game-engine/forge';

async function setupGame() {
  const game = new Game();
  const { world, renderLayers } = createWorld('main', game);
  
  // Load assets
  const imageCache = new ImageCache();
  const playerImage = await imageCache.getOrLoad('player.png');
  const enemyImage = await imageCache.getOrLoad('enemy.png');
  
  // Create shader store
  const shaderStore = createShaderStore();
  
  // Create sprites
  const playerSprite = createImageSprite(
    playerImage,
    renderLayers[0],
    shaderStore
  );
  
  const enemySprite = createImageSprite(
    enemyImage,
    renderLayers[0],
    shaderStore
  );
  
  // Create player entity
  const player = world.buildAndAddEntity('player', [
    new PositionComponent(400, 300),
    new SpriteComponent(playerSprite),
    new RotationComponent(0),
    new ScaleComponent(1, 1)
  ]);
  
  // Create enemy entity
  const enemy = world.buildAndAddEntity('enemy', [
    new PositionComponent(600, 300),
    new SpriteComponent(enemySprite),
    new ColorComponent(255, 100, 100, 255)  // Tinted red
  ]);
  
  game.run();
}

setupGame();
```

## Sprite Atlases and UV Mapping

Use UV coordinates to show different parts of a sprite sheet:

```ts
import { Vector2 } from '@forge-game-engine/forge';

// Create sprite from atlas
const sprite = createImageSprite(atlas, renderLayers[0], shaderStore);

// Show specific region (e.g., for sprite animation frames)
sprite.uvStart = new Vector2(0, 0);        // Top-left of sheet
sprite.uvSize = new Vector2(0.25, 0.25);   // 1/4 of sheet (4x4 grid)

// Change to different frame
sprite.uvStart = new Vector2(0.25, 0);     // Next frame
```

## Rendering System

The rendering happens automatically, but you can customize it:

```ts
// Rendering system is added automatically by createWorld
// It handles:
// - Sorting sprites by layer
// - Applying transforms (position, rotation, scale)
// - Uploading data to GPU
// - Drawing to screen
```

## Camera

Control what's visible on screen:

```ts
import { CameraComponent } from '@forge-game-engine/forge';

// Camera is created automatically with the world
const cameraEntity = world.queryEntityRequired([CameraComponent.symbol]);
const camera = cameraEntity.getComponent(CameraComponent);
const position = cameraEntity.getComponent(PositionComponent);

// Move camera
position.x = 100;
position.y = 100;

// Zoom
const scale = cameraEntity.getComponent(ScaleComponent);
scale.x = 2;  // Zoom in 2x
scale.y = 2;
```

## Practical Examples

### Fading Sprite

```ts
class FadeSystem extends System {
  constructor() {
    super('fade', [ColorComponent.symbol]);
  }
  
  run(entity: Entity) {
    const color = entity.getComponent(ColorComponent);
    
    // Fade out
    color.a = Math.max(0, color.a - 100 * this.time.deltaTimeInSeconds);
    
    // Remove when fully transparent
    if (color.a <= 0) {
      this.world.removeEntity(entity);
    }
  }
}
```

### Rotating Sprite

```ts
class RotateSystem extends System {
  constructor() {
    super('rotate', [RotationComponent.symbol]);
  }
  
  run(entity: Entity) {
    const rotation = entity.getComponent(RotationComponent);
    
    // Rotate 180 degrees per second
    rotation.radians += Math.PI * this.time.deltaTimeInSeconds;
  }
}
```

### Pulsing Scale

```ts
class PulseSystem extends System {
  private time = 0;
  
  constructor() {
    super('pulse', [ScaleComponent.symbol]);
  }
  
  run(entity: Entity) {
    this.time += this.world.time.deltaTimeInSeconds;
    const scale = entity.getComponent(ScaleComponent);
    
    // Pulse between 0.8 and 1.2
    const pulse = 1 + Math.sin(this.time * 5) * 0.2;
    scale.x = pulse;
    scale.y = pulse;
  }
}
```

## Best Practices

- **Use render layers** - Organize sprites by depth
- **Batch sprites** - Use same shader/texture for better performance
- **Limit transparency** - Transparent sprites are more expensive
- **Use sprite atlases** - Combine multiple images into one texture
- **Cache shaders** - Reuse shader stores
- **Disable unused sprites** - Set `enabled = false` instead of removing
- **Consider draw calls** - Fewer sprites = better performance
- **Optimize texture sizes** - Use power-of-2 dimensions when possible

## See Also

- [SpriteComponent API](../../api/classes/SpriteComponent.md)
- [PositionComponent API](../../api/classes/PositionComponent.md)
- [RotationComponent API](../../api/classes/RotationComponent.md)
- [ScaleComponent API](../../api/classes/ScaleComponent.md)
- [Color API](../../api/classes/Color.md)
