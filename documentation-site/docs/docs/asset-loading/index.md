---
sidebar_position: 1
---

# Asset Loading

Forge provides a robust asset loading system to manage images, audio files, and Rive animations. The asset cache system ensures efficient loading and prevents duplicate resource loading.

## Asset Caches

All asset caches implement a common interface with three key methods:

- `load(path)` - Load an asset and cache it
- `get(path)` - Retrieve a cached asset
- `getOrLoad(path)` - Get from cache or load if not cached

## Image Loading

The [`ImageCache`](../../api/classes/ImageCache.md) manages loading and caching of image assets.

### Basic Usage

```ts
import { ImageCache } from '@forge-game-engine/forge';

const imageCache = new ImageCache();

// Load an image
await imageCache.load('sprites/player.png');

// Get the loaded image
const image = imageCache.get('sprites/player.png');

// Or load and get in one step
const enemyImage = await imageCache.getOrLoad('sprites/enemy.png');
```

### Using with Sprites

Images loaded with `ImageCache` can be used directly with the rendering system:

```ts
import { 
  ImageCache,
  createShaderStore,
  createImageSprite,
  SpriteComponent,
  PositionComponent
} from '@forge-game-engine/forge';

// Load image
const imageCache = new ImageCache();
const image = await imageCache.getOrLoad('character.png');

// Create sprite from image
const shaderStore = createShaderStore();
const sprite = createImageSprite(image, renderLayers[0], shaderStore);

// Add to entity
entity.addComponent(new SpriteComponent(sprite));
entity.addComponent(new PositionComponent(100, 100));
```

### Loading Multiple Images

```ts
const imageCache = new ImageCache();

// Load multiple images in parallel
const imagePaths = [
  'sprites/player.png',
  'sprites/enemy.png',
  'backgrounds/level1.png',
  'ui/button.png'
];

await Promise.all(
  imagePaths.map(path => imageCache.load(path))
);

// All images are now cached and ready to use
const playerImage = imageCache.get('sprites/player.png');
const enemyImage = imageCache.get('sprites/enemy.png');
```

### Error Handling

```ts
const imageCache = new ImageCache();

try {
  const image = await imageCache.getOrLoad('non-existent.png');
} catch (error) {
  console.error('Failed to load image:', error);
  // Use fallback image or handle error
}
```

## Audio Loading

Audio files are typically loaded using Howler.js directly through the [`SoundComponent`](../../api/classes/SoundComponent.md). See the [Audio](../audio/index.md) documentation for details.

## Rive Animation Loading

The [`RiveCache`](../../api/classes/RiveCache.md) manages Rive animation files for vector-based animations.

### Basic Usage

```ts
import { RiveCache } from '@forge-game-engine/forge';

const riveCache = new RiveCache();

// Load a Rive file
const riveFile = await riveCache.getOrLoad('animations/character.riv');

// Use with Rive components (requires @rive-app/webgl2)
```

### Custom Asset Loaders

You can provide custom asset loaders for Rive files that reference external assets:

```ts
import { AssetLoadCallback } from '@rive-app/webgl2';

const customAssetLoader: AssetLoadCallback = (asset, bytes) => {
  // Custom loading logic for referenced assets
  return true;
};

const riveFile = await riveCache.getOrLoad(
  'animations/character.riv',
  customAssetLoader
);
```

## Asset Preloading

For better user experience, preload assets during a loading screen:

```ts
import { ImageCache } from '@forge-game-engine/forge';

async function preloadAssets(onProgress?: (percent: number) => void) {
  const imageCache = new ImageCache();
  
  const assets = [
    'sprites/player.png',
    'sprites/enemy1.png',
    'sprites/enemy2.png',
    'backgrounds/level1.png',
    'ui/health-bar.png',
    // ... more assets
  ];
  
  let loaded = 0;
  
  for (const assetPath of assets) {
    await imageCache.load(assetPath);
    loaded++;
    
    if (onProgress) {
      onProgress((loaded / assets.length) * 100);
    }
  }
  
  return imageCache;
}

// Usage
const imageCache = await preloadAssets((percent) => {
  console.log(`Loading: ${percent.toFixed(0)}%`);
  // Update loading bar UI
});
```

## Parallel Loading

Load multiple assets simultaneously for faster loading times:

```ts
async function loadGameAssets() {
  const imageCache = new ImageCache();
  
  // Load all assets in parallel
  await Promise.all([
    imageCache.load('sprites/player.png'),
    imageCache.load('sprites/enemy.png'),
    imageCache.load('backgrounds/level1.png'),
    imageCache.load('backgrounds/level2.png'),
    imageCache.load('ui/button.png'),
  ]);
  
  return imageCache;
}
```

## Asset Organization

Organize your assets with a consistent folder structure:

```
/assets
  /sprites
    player.png
    enemy1.png
    enemy2.png
  /backgrounds
    level1.png
    level2.png
  /spritesheets
    character-animations.png
  /audio
    /music
      theme.mp3
    /sfx
      jump.mp3
      shoot.mp3
  /animations
    character.riv
```

## Creating a Centralized Asset Manager

For larger projects, create a centralized asset manager:

```ts
import { ImageCache, RiveCache } from '@forge-game-engine/forge';

class AssetManager {
  public images: ImageCache;
  public riveFiles: RiveCache;
  
  constructor() {
    this.images = new ImageCache();
    this.riveFiles = new RiveCache();
  }
  
  async loadAll(assetList: string[]) {
    const imageAssets = assetList.filter(p => 
      p.endsWith('.png') || p.endsWith('.jpg')
    );
    const riveAssets = assetList.filter(p => p.endsWith('.riv'));
    
    await Promise.all([
      ...imageAssets.map(path => this.images.load(path)),
      ...riveAssets.map(path => this.riveFiles.load(path))
    ]);
  }
}

// Usage
const assetManager = new AssetManager();
await assetManager.loadAll([
  'sprites/player.png',
  'animations/character.riv',
  'backgrounds/level1.png'
]);

// Access loaded assets
const playerSprite = assetManager.images.get('sprites/player.png');
```

## Best Practices

- **Preload assets** during loading screens to avoid runtime delays
- **Load in parallel** when possible to minimize loading time
- **Handle errors gracefully** with try-catch blocks and fallback assets
- **Organize assets** in a clear folder structure
- **Reuse caches** across your application to avoid duplicate loading
- **Cache at startup** for frequently used assets
- **Consider asset size** - optimize images and compress where appropriate
- **Use sprite sheets** for multiple small images to reduce HTTP requests

## Common Patterns

### Lazy Loading

Load assets only when needed:

```ts
class LevelManager {
  private imageCache = new ImageCache();
  
  async loadLevel(levelNumber: number) {
    // Load only the assets for this level
    const levelAssets = [
      `backgrounds/level${levelNumber}.png`,
      `enemies/level${levelNumber}-enemy.png`
    ];
    
    await Promise.all(
      levelAssets.map(path => this.imageCache.load(path))
    );
  }
}
```

### Asset Preloading with Progress

```ts
async function loadWithProgress(
  imageCache: ImageCache,
  assets: string[],
  onProgress: (percent: number, currentAsset: string) => void
) {
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    await imageCache.load(asset);
    onProgress(((i + 1) / assets.length) * 100, asset);
  }
}
```

## See Also

- [ImageCache API](../../api/classes/ImageCache.md)
- [RiveCache API](../../api/classes/RiveCache.md)
- [Rendering](../rendering/index.md)
- [Audio](../audio/index.md)
