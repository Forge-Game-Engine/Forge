# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> This file is generated from [Conventional Commits](https://www.conventionalcommits.org/) as
> part of the release process. See the "Changelog" section of
> [AGENTS.md](https://github.com/Forge-Game-Engine/Forge/blob/dev/AGENTS.md#changelog) for
> how entries are produced and what should (and should not) be edited by hand.

## [Unreleased]

#### Fixed

- **physics:** Fix rigid bodies settling deeply embedded in each other in dense piles/stacks, caused by an under-strength collision impulse at multi-contact-point manifolds and a positional-correction cap that was too small relative to typical shape sizes. Positional correction now also runs once per step instead of compounding across every velocity iteration, so the larger cap needed to fix the embedding doesn't reintroduce visible vibration

## [0.23.0] - 2026-07-23

#### Added

- Add LinearSpring and LinearDamper for soft body connections
- **rendering:** Add nine-slice support for sprites
- **demos:** Add hill climb racer demo
- **physics:** Add TerrainShape for 2D heightmap terrain

## [0.22.2] - 2026-07-20

#### Added

- Add pixelated filtering option for createImageSprite
- Add torque application and angular-velocity motor ECS systems

## [0.22.1] - 2026-07-17

#### Added

- Add Prismatic Joint implementation and demo
- Enhance `GamepadInputSource` to support hot-plugging and last-connected gamepad selection
- Add Wrecking Ball demo and implement RevoluteJoint functionality

## [0.22.0] - 2026-07-14

#### Changed

- Replace the custom shader include syntax with a `#pragma`-based shader pre-processing pipeline

## [0.21.1] - 2026-06-24

#### Added

- Add fullscreen to demos

## [0.21.0] - 2026-06-13

#### Added

- Implement physics simulation with RigidBody and PhysicsWorld
- Add force application API to the physics engine

#### Changed

- Add a physics demo showcasing `RigidBody` and `PhysicsWorld`

## [0.20.1] - 2026-06-09

_No user-facing changes._

## [0.20.0] - 2026-06-02

#### Added

- **ecs:** Add ECS core components, systems, and world implementation

#### Changed

- Add sprite-sheet creation and animation frame-selection utilities, and simplify the animation demo

## [0.19.1] - 2026-04-19

#### Added

- **render-context:** Implement resize method and update viewport handling

## [0.19.0] - 2026-04-18

#### Fixed

- **rendering:** Flip Y axis in screenToWorldSpace

## [0.18.0] - 2026-01-17

#### Added

- **BREAKING:** Replace the ECS implementation with a new architecture, and migrate all built-in components and systems to it

## [0.17.7] - 2026-01-03

#### Added

- Add shooting to spaceshooter demo

## [0.17.6] - 2026-01-01

#### Changed

- Refine animation input types and add lifecycle hooks to the ECS `System`/`World` classes

## [0.17.5] - 2025-12-28

#### Fixed

- Update import paths to include file extensions

## [0.17.4] - 2025-12-28

_No user-facing changes._

## [0.17.3] - 2025-12-27

#### Fixed

- Update default canvas dimensions to use container size

## [0.17.2] - 2025-12-27

#### Fixed

- Update import paths to include file extensions

## [0.17.1] - 2025-12-27

#### Added

- Export render context from index

## [0.17.0] - 2025-12-27

#### Added

- Add render context

## [0.16.0] - 2025-12-20

#### Added

- Adds tint to sprites

#### Fixed

- Fix camera zoom

## [0.15.3] - 2025-12-14

#### Fixed

- Update import path for Transition in AnimationTransition.ts

## [0.15.2] - 2025-12-14

#### Added

- Add finite state machine exports to package.json

## [0.15.1] - 2025-12-14

#### Added

- Implement resizing for render layers and add finite state machine exports

#### Changed

- Simplify the sprite animation system and demo integration

## [0.15.0] - 2025-11-01

#### Changed

- Rename `SoundComponent` to `AudioComponent` and refine the audio system

## [0.14.18] - 2025-11-01

#### Added

- Add BooleanModelProperty type for boolean value representation

## [0.14.17] - 2025-10-27

#### Fixed

- Change error throw to console warning when adding existing system

## [0.14.16] - 2025-10-27

#### Fixed

- Update RenderSystem constructor to use layer name in super call

## [0.14.15] - 2025-10-27

#### Fixed

- Correct system names in constructors for ResetInputSystem and UpdateInputSystem

## [0.14.14] - 2025-10-27

_No user-facing changes._

## [0.14.13] - 2025-10-24

#### Added

- Add .js extensions to all imports for ESM compliance

## [0.14.12] - 2025-10-22

#### Added

- Add error handling for duplicate components and systems in Entity and World classes

## [0.14.11] - 2025-10-21

#### Added

- Implement recursive entity removal in World class

## [0.14.10] - 2025-10-21

_No user-facing changes._

## [0.14.9] - 2025-10-21

_No user-facing changes._

## [0.14.8] - 2025-10-21

#### Added

- Export transform-system from index.ts

## [0.14.7] - 2025-10-20

#### Added

- Convert GLSL files to JavaScript modules in dist for tool-agnostic build

#### Fixed

- Include shader files in package after switching to tsc build

## [0.14.6] - 2025-10-19

#### Fixed

- Update import paths to use index.js for module exports

## [0.14.5] - 2025-10-19

_No user-facing changes._

## [0.14.4] - 2025-10-18

_No user-facing changes._

## [0.14.3] - 2025-10-17

#### Fixed

- Resolve duplicate type definitions in package build

## [0.14.2] - 2025-10-16

_No user-facing changes._

## [0.14.1] - 2025-10-15

#### Added

- Add the `common` module to package exports

## [0.14.0] - 2025-10-15

#### Added

- Add parent-child relationship support for entities
- Add multiple entry points to reduce bundle size
- Add optional parent and enabled parameters to Entity constructor and buildAndAddEntity via EntityOptions

#### Changed

- Move age/scale features into a new `lifecycle` module

## [0.13.3] - 2025-10-08

#### Added

- Added getEntityById to world.ts

## [0.13.2] - 2025-09-30

#### Added

- **math:** Implement radiansToVector function and add tests

## [0.13.1] - 2025-09-30

_No user-facing changes._

## [0.13.0] - 2025-09-20

#### Added

- **math:** Add `radiansToDegrees` and `signedSquare` functions with tests, and implement `smoothDampVector2` for position interpolation

## [0.12.1] - 2025-09-19

#### Fixed

- Make the sprite pivot use a new vector in the constructor

## [0.12.0] - 2025-09-19

#### Added

- **input:** Add mouse input support with 2D axis bindings and cursor value types

## [0.11.0] - 2025-09-18

#### Added

- **input:** Add 1D and 2D axis input bindings and integrate into keyboard input source

## [0.10.0] - 2025-09-18

#### Added

- Add keyboard axis input

## [0.9.0] - 2025-09-16

#### Added

- Add spritesheet animations to entities
- Add particle system with configurable emitters

#### Fixed

- Update sprite vertex shader to normalise the pivot, and apply the pivot before scaling

## [0.8.0] - 2025-07-25

#### Added

- Add input feature

## [0.7.0] - 2025-07-06

#### Changed

- Performance enhancements

## [0.6.0] - 2025-06-30

#### Added

- Add seconds api to time object

## [0.5.10] - 2025-06-28

#### Fixed

- Correct camera position adjustments in CameraSystem and RenderSystem

## [0.5.9] - 2025-06-26

_No user-facing changes._

## [0.5.8] - 2025-06-22

_No user-facing changes._

## [0.5.7] - 2025-06-20

#### Added

- Add world initialization to System and update World to call initialize on added systems

#### Fixed

- Update sprite creation to use `renderLayers[0]` instead of `foregroundRenderLayer.layer`

## [0.5.6] - 2025-06-16

_No user-facing changes._

## [0.5.5] - 2025-06-15

#### Changed

- Update scene design

## [0.5.4] - 2025-06-08

_No user-facing changes._

## [0.5.3] - 2025-06-08

_No user-facing changes._

## [0.5.2] - 2025-06-08

_No user-facing changes._

## [0.5.1] - 2025-06-08

#### Added

- Add a Docusaurus documentation site

## [0.5.0] - 2025-06-08

#### Added

- Add docs

## [0.4.13] - 2025-06-02

_No user-facing changes._

## [0.4.12] - 2025-05-27

_No user-facing changes._

## [0.4.11] - 2025-05-26

_No user-facing changes._

## [0.4.10] - 2025-05-26

_No user-facing changes._

## [0.4.9] - 2025-05-26

_No user-facing changes._

## [0.4.8] - 2025-05-24

_No user-facing changes._

## [0.4.7] - 2025-05-24

#### Fixed

- Ensure correct blending function is set during rendering

## [0.4.6] - 2025-05-24

#### Fixed

- Pass WebGL context to beforeBind method for improved customization

## [0.4.5] - 2025-05-23

#### Fixed

- Improve entity management in updateSystemEntities method

## [0.4.4] - 2025-05-23

#### Fixed

- Fix a bug where a system would not pick up an entity when a matching component was added after the entity was already registered in the world

## [0.4.3] - 2025-05-21

#### Added

- Added hexagon, triangle, octagon, rhombus, trapezoid

## [0.4.2] - 2025-05-20

#### Fixed

- Change listener type from `Promise<void>` to `void`

## [0.4.1] - 2025-05-19

#### Added

- **Time:** Add fps getter to return current frames per second

#### Changed

- Add a Rive data-binding example scene to the demo app

## [0.4.0] - 2025-05-14

#### Added

- Added raycast

## [0.3.5] - 2025-05-10

#### Fixed

- Ensure canvas styles match dimensions on creation

## [0.3.4] - 2025-05-10

_No user-facing changes._

## [0.3.3] - 2025-05-08

#### Added

- Add matterjs

## [0.3.2] - 2025-05-05

#### Added

- Refactor createSprite to use Material and add createImageSprite utility
- Add createScene utility
- Refactor createShipPilotScene and createScene
- Update createScene and createSprite functions to return types

## [0.3.1] - 2025-05-05

#### Fixed

- Added sdfBoxInclude to shaderstore

## [0.3.0] - 2025-05-05

#### Added

- Added sdf box shader

## [0.2.16] - 2025-05-04

_No user-facing changes._

## [0.2.15] - 2025-05-04

_No user-facing changes._

## [0.2.14] - 2025-05-04

_No user-facing changes._

## [0.2.13] - 2025-05-04

_No user-facing changes._

## [0.2.12] - 2025-05-04

#### Added

- Implement CircleCollider class with containment checks and bounding box calculations

## [0.2.11] - 2025-05-03

#### Added

- Enhance Color class to support RGBA and update related tests
- Add Float32Array conversion methods for Color and vector classes

## [0.2.10] - 2025-05-02

#### Added

- Export color module from rendering index

## [0.2.9] - 2025-05-01

#### Added

- Add create-shader-store utility for managing shader includes and shaders

## [0.2.8] - 2025-05-01

_No user-facing changes._

## [0.2.7] - 2025-04-30

#### Added

- Export shaders module in rendering index

## [0.2.6] - 2025-04-30

#### Added

- Refactor addForgeRenderLayers to use LayerDetail type for clarity

## [0.2.5] - 2025-04-30

#### Added

- Support for registering and deregistering multiple updatable and stoppable objects in Scene
- Add functions to create and register multiple Forge render layers with the layer service

## [0.2.4] - 2025-04-29

#### Added

- Add addInputs function and update exports in utilities
- Add buildAndAddEntity method to World class for entity creation
- Add addForgeRenderLayer and addRiveRenderLayer functions for rendering layers
- Remove Camera class and add addCamera utility function for camera setup
- Add createSprite function and update exports in utilities
- Remove unused Stoppable type import from RiveRenderLayer
- Implement Stoppable interface in RiveRenderLayer class

#### Fixed

- Correct canvas ID string in addForgeRenderLayer function

## [0.2.3] - 2025-04-28

#### Added

- Add Vector3 class with basic vector operations and tests
- Add gradient image for enhanced visual presentation
- Implement gradient material and update Perlin noise scene integration

## [0.2.2] - 2025-04-06

#### Added

- Enhance resolveIncludes to handle nested and circular includes
- Enhance resolveIncludes to support resolved variables and prevent duplicate declarations
- Add Perlin noise scene and material with shader includes for rendering
- Implement Perlin noise rendering with shader includes and update random gradient function
- Import Perlin noise scene in game module and update scene exports

## [0.2.1] - 2025-04-05

#### Added

- Implement star system and components, refactor starfield handling in ship pilot scene
- Implement resolveIncludes function for shader include handling and add tests

#### Fixed

- Add definite assignment assertion for velocity in StarComponent
- Improve error messages for shader syntax validation in resolveIncludes

## [0.2.0] - 2025-04-05

#### Added

- Implement ObjectPool class with basic functionality and tests

## [0.1.3] - 2025-04-04

_No user-facing changes._

## [0.1.2] - 2025-04-04

#### Changed

- Migrate from @rive-app/canvas to @rive-app/webgl

## [0.1.1] - 2025-03-30

Initial public release. This release establishes the foundation of the engine, assembled from the project's earliest prototyping.

#### Added

- WebGL2-based rendering pipeline, including sprite shaders, sprite batching, materials, and camera zoom/panning
- Core UI layer: hoverable components, a grid layout system, and a button/sprite factory
- Rive integration for interactive vector animations, with resize/stop/reload controls on `RiveRenderLayer`
- `PolygonCollider` and `Matrix3x3` as initial physics/math primitives
- `ImageCache` for asset loading, later migrated into the asset-loading module
- Ship and starfield entities/components for the initial demo scene

#### Fixed

- Magenta flashing in sprite debug mode, replaced with predefined debug colors
- Box collider calculation to require at least 2 points
- Rounded rectangle rendering line-width handling
- Camera translation and panning direction in `CameraSystem`

