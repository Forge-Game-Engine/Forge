# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> This file is generated from [Conventional Commits](https://www.conventionalcommits.org/) as
> part of the release process. See the "Changelog" section of
> [AGENTS.md](https://github.com/Forge-Game-Engine/Forge/blob/dev/AGENTS.md#changelog) for
> how entries are produced and what should (and should not) be edited by hand.

## [Unreleased]

#### Added

- **physics:** `DynamicAabbTree<T>`, a bounding-box tree (Box2D's dynamic AABB tree) for spatial queries over boxes that are added, moved and removed one at a time. `createProxy(aabb, value)` stores a box grown by `aabbMargin` (0.1 world units) on every side with a value and returns a proxy id; `moveProxy(proxyId, aabb)` changes nothing and returns `false` while the box stays inside that grown box, and otherwise stores a new one and returns `true`; `destroyProxy` and `clear` remove proxies, and a removed proxy's id is given to a later one. `query(aabb, callback)` visits every proxy whose grown box overlaps a box, and `raycast(start, end, callback)` every proxy whose grown box a segment reaches, where the callback's return value stops the cast (`0`) or clips the segment for closest-hit casts. `getValue`, `getFatAabb(proxyId, out)`, `proxyCount`, `height` and `validate()` read the tree. Nodes are pooled, so queries and moves within the margin allocate nothing. Invalid boxes and ids, and changing the tree from inside its own query callbacks, throw. The physics systems don't use it yet. See the new Dynamic AABB Tree guide
- **ecs:** `addSystemGroup` takes a `runWhile` condition, the repeating counterpart of `runIf`: the world calls it before each run of the group and runs the group's systems again while it returns `true`, zero or more times per tick, re-checking each system's own `runIf` on every run. A group given both `runIf` and `runWhile` (in one call or across calls) throws
- **common:** `registerFixedUpdate(world, time)` registers and returns a `fixed-update` system group that runs once per fixed step of `time`, after the start-of-tick groups and before `world.defaultSystemGroup`, like Unity's `FixedUpdate` and Bevy's `FixedMain`. Systems in it read the fixed delta from `time`. Calling it a second time with the same `Time` throws

#### Changed

- **physics:** The physics systems now run in the `fixed-update` group in every guide and demo, so a simulation gives the same result at any frame rate. Register them with `{ group: registerFixedUpdate(world, time) }`, in the same order as before, after a `createTransformEcsSystem()` in that group so each step reads the poses the previous step left in `local`, and keep a second `createTransformEcsSystem()` in the default group before rendering so each frame draws the latest step. Register your own systems that apply forces or torques, set velocities or motor targets the solver must see, or read `ContactsEcsComponent.started`/`ended` or `collisionManifolds` in the same group: `started` and `ended` describe one physics step, so a once-per-frame system misses a contact that started in an earlier step of the frame and sees the same `started` again on a frame with no step (`touching` can be read anywhere). Keep systems that read `TriggerAction.isTriggered` once per frame, and have them set a field that a fixed-step system clears when the press has to act inside a step. A once-per-frame system that follows or draws a moving body reads its `position.local`, since before the default group's transform system its `world` is a step old
- **physics:** `applyImpulse` and `applyExplosiveForce` find a body's center of mass from its `position.local` and `rotation.local` instead of `world`. A dynamic body is always a root entity, so `local` is its pose in the world and is current from any system group, where `world` is a step old in a once-per-frame system. Pass `applyImpulse` a point measured from the body's `local` pose (for example `position.local` for a collider centered on the entity) instead of one from `position.world`
- **navigation:** `NavigationAgentSystemOptions.maxExpandedPerFrame` is renamed to `maxExpandedPerUpdate`, since the budget is spent once per update of the system, which in the fixed-update group is once per fixed step: a frame that runs several steps searches several budgets' worth of nodes. Rename the option where you pass it to `createNavigationAgentEcsSystem`
- **physics:** `createContinuousCollisionEcsSystem` skips sleeping bodies, since integration doesn't move them. A sleeping body that gets a velocity or is moved during a tick is still swept. Results don't change. See "Which bodies are swept" in the Continuous Collision Detection guide
- **input:** `registerInputs` now updates the `InputManager` in `world.firstSystemGroup` instead of an `input-update` group ordered before the default group, so game-state exit and enter systems, fixed steps and every other group read this frame's input whatever order they were registered in. The `input-update` group no longer exists; a group that had to run before the input update (for example, one that fed input into the `InputManager`) now runs after it
- **physics:** A sleeping pile no longer runs collision tests. The sleep system records the collision manifolds each body is part of when it falls asleep, in the new `RigidBodySleepRecord.manifolds`, and when neither entity of a pair is awake and at least one is a sleeping body, `createNarrowPhaseEcsSystem` writes those manifolds into `collisionManifolds` instead of testing the pair again, the way Box2D keeps a sleeping island's contacts. The contact stays in both entities' `ContactsEcsComponent.touching` with nothing in `started` or `ended`, the sleep system keeps seeing it, and collision resolution warm-starts it from the impulses it fell asleep with when the island wakes. A pair is tested again when either side wakes, when the sleep record has no manifolds for it, when a collider's shape object is replaced (a rebuilt tilemap layer) or when it involves a sensor, and its contact ends when the broad phase stops listing it. `CollisionManifold` gains required `colliderA` and `colliderB` fields, the shapes it was computed from: code that builds manifolds by hand has to set them. `CircleCollider.radius` is now read-only, like a polygon's vertices: assign a new `CircleCollider` to change a circle's size. Moving a static body, collider-only entity or still kinematic body by its position doesn't update its contact with a sleeping body while their bounds still overlap: move kinematic bodies by their velocity, or set `wakeRequested` on the sleeping body
- **physics:** An angular velocity motor with a non-zero `targetVelocity` (and a positive `maxTorque`, on a dynamic body without `fixedRotation`) now keeps its body awake: `createSleepEcsSystem` doesn't count the body as resting, so a motor stalled against a wall no longer falls asleep and wakes again every half second, and setting a non-zero target on a sleeping body wakes its island before collision resolution on the same tick, instead of turning it for one tick with its contacts unsolved. A motor whose `targetVelocity` is `0` (a brake) still lets its body sleep. `createAngularVelocityMotorEcsSystem` now skips sleeping bodies and motors whose `maxTorque` isn't positive. Set `targetVelocity` to `0` on a motor that should let its body sleep

## [0.27.0] - 2026-10-24

#### Added

- **common:** A fixed-timestep clock on `Time`. Each `update` adds the frame's `deltaTimeInMilliseconds` (scaled by `timeScale` and limited to `1000 / 15`) to an accumulated time, except the first `update`, which adds nothing. `consumeFixedStep()` takes one step of `fixedDeltaTimeInMilliseconds` (`1000 / 60` by default, also readable as `fixedDeltaTimeInSeconds`) out of it and returns `true`, or returns `false` when less than one step is left, so a game loop runs fixed-rate work with `while (time.consumeFixedStep()) { ... }` after `time.update`. While a step runs, `isInFixedStep` is `true`, `deltaTimeInSeconds`/`deltaTimeInMilliseconds` are the fixed delta time and `timeInSeconds`/`timeInMilliseconds` are the fixed time, so systems that read the delta time run at the fixed rate inside the loop. `fixedOverstepFraction` is the leftover time as a fraction of a step, for interpolating rendering between steps. Setting a fixed delta time that isn't finite and greater than `0` throws, and so does calling `update` while a fixed step is running. `Game` doesn't run fixed steps itself. See "Fixed timestep" in the Time guide

- **navigation:** A new `@forge-game-engine/forge/navigation` module for path finding. `findPath(graph, start, goal, { maxExpanded })` runs an A\* search for the cheapest path between two nodes of any `NavigationGraph`: an object with a `nodeCount`, a `forEachNeighbor(node, visit)` that reports each step out of a node with its cost, and a `heuristic(node, goal)` that never overestimates the remaining cost. Nodes are integer ids from `0` to `nodeCount - 1`, such as grid cell indices or waypoint ids. The result's `status` is `'found'`, `'unreachable'` or `'limitReached'` (after `maxExpanded` expanded nodes, `Infinity` by default); when the goal isn't reached, `nodes` is the path to the node closest to the goal by heuristic, so a unit can head towards it. It also returns the path's `cost` and how many nodes were `expanded`. A search allocates nothing per node: every search reuses one set of arrays, kept for as long as the page runs: 24 bytes for each node of the largest graph searched, plus 20 bytes for each open-list entry slot (a search adds at least one entry per node it reaches, and the entry arrays double when they fill). Invalid ids, negative or non-finite step costs and heuristics, and a `findPath` call from inside a graph's method throw. See the new Navigation guide
- **navigation:** Navigation grids: `createNavigationGrid({ cells, layout, origin, diagonals })` returns a `NavigationGrid`, a `NavigationGraph` of walkable or blocked cells with a traversal cost each (`1` by default), stored in flat typed arrays and placed in the world by a `GridLayout` (orthogonal or isometric), with `origin` at cell `(0, 0)`'s top-left (or isometric top) corner and Y-down rows. `cells` is the inclusive `GridCellRange` of cells the grid has, whose `columns` and `rows` it reports. `setWalkable`, `setCost`, `fillWalkable` and `fillCost` (over a `GridCellRange`, clipped to the grid) mark cells, `isWalkable` and `getCost` read them, and `version` increases after each call that changes a cell. `worldToCell` (`null` outside the grid), `cellToWorld` (the cell centre), `cellToNode`, `nodeToCell` and `hasCell` convert positions, cells and node ids (row-major from the first cell, `(row - minRow) * columns + (column - minColumn)`). `diagonals` is `'never'`, `'always'` or `'noCornerCutting'` (the default, where a diagonal step needs both cells beside it walkable). A step costs the entered cell's cost times the world distance between cell centres, and the heuristic is the shortest empty-grid distance at the lowest cell cost (Manhattan or octile on square cells). `findGridPath(grid, fromWorld, toWorld, { snapRadius, maxExpanded })` returns `findPath`'s result plus the path's cell centres as world `points`; a blocked or out-of-grid start or goal moves to the nearest walkable cell within `snapRadius` rings (default `2`), reported by `startSnapped` and `goalSnapped`. Invalid cells, costs, ranges and positions throw. See the new Navigation grids guide
- **navigation:** `markGridFromColliders(world, grid, { agentRadius, mask })` blocks every navigation grid cell that a static collider overlaps, so a level's walls are authored once, as colliders. It bakes every collider with a position whose entity has no rigid body or a `'static'` one, isn't a sensor and has a `category` in `mask` (every category by default), placed by `position.world` and `rotation.world` like physics (scale isn't applied). Circles and polygons block their area, terrain its whole slab, and chains the solid their loops enclose, leaving holes open. A cell is blocked when any part of its area overlaps the shape, so walls thinner than a cell still block, and a shape that only touches a cell's edge doesn't, so a tile layer's collider blocks exactly its solid tiles' cells. `agentRadius` (default `0`) grows every shape by that radius, with rounded corners, so a unit of that radius following a `'noCornerCutting'` path stays clear of every collider. It works on orthogonal and isometric grids, only ever blocks cells, and raises `version` once. Run it after the first `world.update()` and again after the level changes, not every frame. It throws for a negative or non-finite `agentRadius`. See the new "Blocking cells from colliders" guide
- **navigation:** A navigation grid's `cells` can be any block of cells, negative ones included, so a grid can lay over a tile layer with the layer's own cell numbers: give it the layer's tile set `layout`, `origin` at the layer's world position and `cells: getUsedRect(layer)`, and grid cell `(c, r)` is layer cell `(c, r)` on an orthogonal or isometric map, even one whose cells start below `(0, 0)`. `NavigationGrid.cells` returns the block. `findGridPath`'s edge snapping and `markGridFromColliders` work on any block. See "Laying a grid over a tile layer" in the Navigation grids guide and the new Isometric Path Finding demo
- **navigation:** `NavigationGrid.fillWalkableMask(mask, walkable)` makes every cell whose byte in a `nodeCount`-long `Uint8Array` isn't `0` walkable or blocked in one call, raising `version` at most once. It throws for a mask of the wrong length
- **navigation:** `NavigationGrid.setCosts(costs)` sets every cell's cost from a `nodeCount`-long `Float32Array` indexed by node id in one call, raising `version` at most once. It throws, changing nothing, for an array of the wrong length or an entry that isn't finite and more than `0`
- **navigation:** Path smoothing: `smoothGridPath(grid, path)` turns a grid path's cell centres (such as `findGridPath`'s `points`) into straight-line waypoints by string pulling. From each kept point it keeps the farthest later point it can walk straight to, in line of sight and for no more than the stretch of path it skips costs (each cell's length along the segment times its cost), and drops the ones in between. So a path across an open room becomes one segment, a path around a wall keeps its corners, and a path around mud keeps going around it. It returns a new array and leaves the path alone. `hasLineOfSight(grid, fromWorld, toWorld)` is `true` when every cell a segment touches, edges and corners included, is in the grid and walkable, so a segment through a corner between blocked cells isn't in line of sight; it works on orthogonal and isometric grids. Both throw for non-finite positions. See "Smoothing a path" in the Navigation grids guide
- **tilemaps:** Navigation costs from tiles: `TileData.navigationCost` (set through a source's `tiles` map, `null` by default) is how much a navigation grid cell over the tile costs to enter, such as `0.5` for a road or `3` for mud. `applyTilemapNavigationCosts(world, layerEntity, grid)` sets each grid cell's cost to the `navigationCost` of the layer's tile under the cell's centre, mapped through the layer's world transform, so the grid needn't share the layer's layout, cell size or origin. Cells over empty cells or `null` costs keep their cost, so several layers apply in order, and walkability never changes: blocked cells still come from `markGridFromColliders` and the layer's collider. Run it on load and after the layer's tiles change. `createTileSet` throws for a cost that isn't finite and more than `0` as a 32-bit float. The Tiled loader reads a tile's `int` or `float` custom property named `navigationCost` into it, and throws for one of another type. See the new "Navigation over tile layers" guide and the Isometric Path Finding demo
- **navigation:** Waypoint graphs, for levels that aren't grids such as road networks, rooms joined by doors or jump links: `createWaypointGraph()` returns a `WaypointGraph`, a `NavigationGraph` of points the game places and connects. `addPoint(position, cost = 1)` returns the point's id and `removePoint(id)` removes it with every connection into or out of it; a removed point's id is given to a later `addPoint`, least recently freed first. `connect(a, b, { bidirectional })` and `disconnect(a, b, { bidirectional })` add and remove connections, both ways by default. `setEnabled(id, false)` closes a point without removing it, so routes go around it while it keeps its connections. `closestPoint(position)` returns the nearest enabled point, `setPosition` and `setCost` change a point, `getPosition`, `getCost`, `isEnabled`, `getConnections`, `isConnected`, `getPointIds`, `hasPoint` and `pointCount` read the graph, and `version` increases after each call that changes it. A step costs the world distance between two points times the cost of the point it enters, the same rule as a navigation grid's cells; costs must be finite and more than `0`, and the heuristic is the straight-line distance times the lowest point cost, so it never overestimates. `findWaypointPath(graph, fromWorld, toWorld, { maxExpanded })` searches from the enabled point closest to `fromWorld` to the one closest to `toWorld` and returns `findPath`'s result plus each route point's world position as `points` (`points[i]` is the position of `nodes[i]`, as with `findGridPath`) and the `startPointId` and `goalPointId`; with no enabled point it returns `'unreachable'` with empty `nodes` and `points`. Invalid ids, positions and costs throw. See the new Waypoint graphs guide
- **navigation:** Path planners: a `PathPlanner` plans a world-space path from a unit's position to its target over one graph with `planPath(fromWorld, toWorld, { maxExpanded, keepPartialPath })`, and reports the graph's `version` and a `maxPathDistance`. `createGridPathPlanner(grid, { smooth, snapRadius, maxPathDistance })` runs `findGridPath`, starts the path at `fromWorld`, ends it at `toWorld` when the target's own cell was reached (a target snapped out of a wall ends at the walkable cell's centre) and smooths it with `smoothGridPath` unless `smooth` is `false`; `maxPathDistance` defaults to one cell. `createWaypointPathPlanner(graph, { maxPathDistance })` does the same with `findWaypointPath`; `maxPathDistance` defaults to `Infinity`. `keepPartialPath: false` returns a search cut short by `maxExpanded` with empty `points`, without building or smoothing it. See "Planning a unit's path" in the Navigation grids and Waypoint graphs guides
- **navigation:** Navigation agents: `addNavigationAgentComponent(world, entity, { planner, speed, target, arrivalRadius })` adds a `NavigationAgentEcsComponent` that sends a unit to `target` (`null` to stand still), and `createNavigationAgentEcsSystem(time, { maxExpandedPerFrame })` plans its path and writes its `status` (`'idle'`, `'planning'`, `'moving'`, `'arrived'` or `'unreachable'`), `path`, `waypointIndex` and `desiredVelocity`. It plans again when the target changes (compared by value), the planner or its `version` changes, or the unit drifts further than the planner's `maxPathDistance` (or its `arrivalRadius`, if larger) from its path. The unit turns within `arrivalRadius` of each waypoint and slows over the last `arrivalRadius` to stop exactly on the target. Every search in a tick shares a budget of `maxExpandedPerFrame` nodes (`2048` by default); agents that miss out stay `'planning'` and go first on later ticks, in the order they asked. The agent doesn't move the entity: the game copies `desiredVelocity` into a rigid body's `velocity`, or adds it to `position.local`. Register the system after `createTransformEcsSystem` and before the game's system that applies the velocity and the physics systems. See the new Navigation agents guide
- **utilities:** `BinaryHeap<T>`, a binary min-heap ordered by a compare function, with `push`, `pop`, `peek`, `size` and `clear`. `pop` and `peek` throw on an empty heap

- **physics:** Sleeping bodies: `createSleepEcsSystem(collisionManifolds, time, { maxRestingSpeed, maxRestingAngularSpeed, restDuration })` puts islands of dynamic bodies (connected by this tick's collisions and by revolute joints, prismatic joints, springs and dampers; static and kinematic bodies don't join islands) to sleep once every body in the island has moved no faster than `maxRestingSpeed` (`0.01` world units per second, scale it with your world like `maxBiasSpeed`) and turned no faster than `maxRestingAngularSpeed` (2 degrees per second) for `restDuration` (`0.5` seconds). Gravity, collision resolution, the joint, spring and damper systems and Euler integration skip sleeping bodies. A sleeping island wakes when any body in it gets a velocity (game code, `applyImpulse`, a solver, a motor), is moved, gains or loses a contact or joint, touches an awake body or a moving kinematic body, or has `canSleep` set to `false` or `wakeRequested` set to `true` (for changes the data doesn't show, such as a new gravity). `RigidBodyEcsComponent` gains `canSleep` (default `true`), `wakeRequested`, `isSleeping` (pass `true` to `addRigidBodyComponent` to create a dynamic body asleep; it throws for a sleeping kinematic or static body or one with `canSleep: false`) and the sleep system's `restTime` and `sleepRecord`; `addRigidBodyComponent` now takes `RigidBodyOptions`. `isBodyAwake(world, entity)` says whether a body takes part in this tick's simulation. Register the sleep system after the narrow phase and before gravity, which now goes after the narrow phase with springs and dampers. See the new Sleeping Bodies guide
- **physics:** Locked rotation: `RigidBodyEcsComponent.fixedRotation` (default `false`), like Box2D's `fixedRotation` and Godot's `lock_rotation`, gives a `'dynamic'` body an inverse moment of inertia of `0` in `getRigidBodyMassData`, so collisions, joints, motors and torques move it without turning it, and a contact off its center of mass puts its whole impulse into the body's linear motion. Use it to keep a character's body upright. An `angularVelocity` or rotation set by game code still applies. `createAngularVelocityMotorEcsSystem` skips a fixed-rotation body. See "Locking a body's rotation" in the Bodies and Shapes guide
- **tilemaps:** Tiled maps: `new TiledMapCache(renderContext).getOrLoad(url, { filter })` loads an orthogonal or isometric map saved by Tiled as JSON (`.tmj`), finite or infinite, with its embedded or external (`.tsj`) tilesets, object templates (`.tj`) and tileset images, resolving each path against the file that names it, so a map and its files must be served as static files. Images load through `renderContext.textureCache` with `'nearest'` filtering by default. The resulting frozen `TiledMap` has one `TileSet` (one source per Tiled tileset, laid out by the map's orientation and tile size) and the layer tree: tile layers as packed tiles (CSV or base64 data, uncompressed, zlib or gzip, Tiled's flip flags as the transform bits), group layers, and object layers as `TiledObject` data in world units with rotation in radians, isometric objects projected through the layout. A tileset's `tileoffset` becomes every tile's `textureOrigin`, and each tile's properties, animation and one rectangle or convex polygon collision object (clipped to the cell's footprint) become its `TileData`. The map, layers, tilesets and objects keep their custom properties with their Tiled types. `spawnTiledMap(world, map)` creates a root entity and an entity per tile and group layer in Tiled's order, with the layer's offset, visibility and tint (group tint and opacity multiplied in), a static tile-layer collider on every layer holding collision tiles, and `ySortChildren` on the root and groups; `findTiledLayer(spawned, idPathOrName)` finds a layer's entity. One Tiled pixel is one world unit. Invalid files, staggered, hexagonal and oblique maps, image collection tilesets, `zstd` compression, transparent colors, the "Preserve Aspect Ratio" fill mode and a tileset image whose size isn't the tileset's throw, naming the file and the field. See the new "Loading Tiled maps" guide
- **tilemaps:** `setTileBlock(layer, column, row, columns, rows, tiles)` writes a rectangle of different tiles from a row-major array as one change, raising the layer's `version` once, like Unity's `Tilemap.SetTilesBlock`. It throws, without changing the layer, for a length that isn't `columns * rows` or a tile the layer's tile set doesn't have, naming its cell
- **tilemaps:** Y-sorted tile layers: set `ySortChildren` on a layer entity's `DrawOrderEcsComponent` (and on every ancestor, under a `ySort` camera) and its tiles sort with sprites row by row, so a character walks behind the walls below it on screen and in front of the walls above it. A cell sorts at its center's Y plus its tile's `ySortOrigin`, and the cells of one source with the same sort Y form a row (a grid row in an orthogonal layout, a `column + row` diagonal in an isometric one). `createTilemapRenderEcsSystem` draws such a layer as one geometry per source with one section per row, each drawn by a child entity of the layer with `ySortOrigin` set to the row's sort Y. Neighboring rows draw in one call, so a layer costs one draw call per visible run of a source's rows, plus one for each sprite sorted between them. An edit rebuilds the whole geometry of each source it touched, in place, and switching the flag rebuilds the layer on the next tick. Animated tiles keep working. See "Y-sorting tiles with characters" in the Tilemaps guide
- **tilemaps:** Animated tiles: `TileData.animation` (set through a source's `tiles` map, `null` by default) is a list of `{ tile, durationMilliseconds }` frames, each a tile of the same source, like Tiled's tile animations. Every cell holding the tile, in every layer, shows the same frame, chosen from `time.timeInMilliseconds`, so `timeScale` slows or pauses tiles with the rest of the game. A cell's flip and transpose bits apply to every frame, and the cell keeps the placed tile's `textureOrigin`, `ySortOrigin`, `collision` and `properties`, so animation never rebuilds a collider. The tilemap render system rewrites only the animated tiles of the chunk meshes that hold a tile whose frame changed, and never touches static chunks. `createTileSet` throws for an empty animation, a frame tile the source doesn't have and a duration that isn't a positive finite number. `getDisplayedTile(tileSet, tile, timeInMilliseconds)` returns the tile a cell shows, and `getTileAnimationFrameIndex(animation, timeInMilliseconds)` the frame index. See "Animated tiles" in the Tilemaps guide
- **tilemaps:** Tilemap layers are drawn: register `createTilemapRenderEcsSystem(renderContext, time)` after the systems that edit tiles and before `createTransformEcsSystem`, and `createRenderEcsSystem` draws every entity that has a `TilemapLayerEcsComponent` and a position. Each chunk's tiles from each tile set source are one mesh (one draw call, not drawn outside the camera's view) on a child entity of the layer, sorted with sprites, text and meshes by the layer's draw `layer`, its entity's draw order and its place in the hierarchy, and drawn back to front within the layer. An edit rewrites only the chunks it changed, in place. `tintColor`, `category` and `layer` apply to the layer's tiles. Each tile samples only its atlas region, inset by half a texel on a `'clamp'` texture, so no lines show between tiles with `'nearest'` filtering at fractional camera positions or with `'linear'` filtering, and tilesets need no extruded tiles. Removing the layer entity, its `TilemapLayerEcsComponent` or its position removes its meshes. See "Rendering" in the Tilemaps guide
- **tilemaps:** A new `@forge-game-engine/forge/tilemaps` module stores tile maps as data instead of one sprite entity per tile. `createTileSet({ layout, sources })` builds a frozen `TileSet` from a `GridLayout` (orthogonal or isometric) and up to 256 sources, each a `TextureAtlas` whose regions are its tiles, with a drawn `tileWidth`/`tileHeight` (the layout's cell size by default) and per-tile `TileData` (`properties`, a Y-down `textureOrigin` and a `ySortOrigin`) read with `getTileData`. A cell holds a packed `uint32` tile built with `packTile({ source, tile, flipX, flipY, transpose })` and read with `unpackTile`, where `emptyTile` (`0`) is empty and the flip bits match Tiled's, giving all eight 90-degree rotations and mirrors. `addTilemapLayerComponent(world, entity, { tileSet, tintColor, category, layer })` adds a `TilemapLayerEcsComponent`, one layer per entity, grouped into maps by the hierarchy, whose cells are stored in 32 x 32 chunks with no bounds, so negative cells work, and Y-down rows. `setTile`, `getTile`, `clearTile`, `fillTiles`, `clearTiles`, `forEachTile` (row-major chunk order, back to front), `getUsedRect` and `setTileSet` read and write cells and throw for tiles the tile set doesn't have. Each change raises the layer's `version` and stamps the chunks it changed with `changedAt`, so any number of systems can each track what changed. `getTileImageRect` places a tile's image on its cell the way Tiled does, `cellToLocal`/`localToCell` convert through the layout, and `cellToWorld`/`worldToCell` through the layer entity's world transform, for mouse picking. See the new Tilemaps guide
- **tilemaps:** Tile layer collision: `TileData.collision` (set through a source's `tiles` map) makes a tile solid with `'cell'`, the cell's whole footprint (a rectangle in an orthogonal layout, a diamond in an isometric one), or a convex polygon measured from the cell's center, such as a slope or a half tile; it defaults to `null`. `createTileSet` throws for a polygon outside the footprint, or one that isn't strictly convex or crosses itself under any of the eight flips and turns. Add a `ColliderEcsComponent` holding `new ChainCollider([])` and `addTilemapColliderComponent(world, entity)` to a layer's entity and register `createTilemapColliderEcsSystem()` after the systems that edit tiles and before the broad phase: on any tick the layer changes, the system replaces the collider with one `ChainCollider` outlining all of the layer's solid tiles, flipped and turned with their images, and leaves its `category`, `mask`, `friction`, `restitution` and `sensor` alone. Edges shared by solid neighbors are removed and straight runs merged, so bodies slide along tile floors and isometric walls without catching on tile joints. `buildTilemapCollisionLoops(layer)` returns the outline's loops, for debug drawing or another collider. See "Collision" in the Tilemaps guide
- **common:** `localToWorldPoint(world, entity, point)` and `worldToLocalPoint(world, entity, point)` map a point between an entity's local space and world space through its world position, rotation and scale, as the transform system composes them, like Godot's `to_global`/`to_local`. See "Converting points between local and world space" in the Transforms guide
- **ecs:** `EcsWorld.setSiblingIndex(child, index)` moves a child to `index` among its parent's children, shifting the siblings after it, so a game can insert a child between two others without re-parenting the rest; an `index` past the last sibling moves it last. `EcsWorld.getSiblingIndex(child)` reads a child's index. Sibling order is the order children draw in and UI layout groups arrange them in. `setParent` still appends. Both throw for an entity without a parent, and `setSiblingIndex` throws for a negative or non-integer `index`
- **ecs:** Component remove hooks: `createComponentId(name, { onRemove })` gives a component type a hook that every world calls with `(world, entity, component)` when a value stops being an entity's component, through `removeComponent`, `removeEntity` (its descendants too, while the entity's other components can still be read) or `addComponent` storing a different value, so a component can release what it holds, such as a GPU geometry. Like Bevy's `on_replace`, it runs on replacement as well as removal. If hooks or `onEntityRemoved` listeners throw during `removeEntity`, the entity and all its descendants are still removed before the error is rethrown (an `AggregateError` when several threw)
- **rendering:** Geometry sections and batched mesh draws: a `Geometry` takes `sections` (`{ start, count }` ranges of its indices, or of its vertices without indices) in its constructor and `update`. They're checked against the data they index when they're written: whole primitives, inside the elements. Each section in `geometry.sections` has computed `bounds`, `update` keeps the sections when it leaves them out, and `drawRange(start, count)` and `elementCount` draw part of a geometry. `MeshEcsComponent.section` (default `null`, the whole geometry) makes a mesh draw and be culled by one section, so several entities can share one baked geometry and still sort, cull and hide separately. Meshes that come one after another in the draw order now draw in one draw call when they share a geometry, material, world transform and masks and draw ranges that follow on from one another of a `'triangles'`, `'lines'` or `'points'` geometry. Anything sorted between them splits the call. Existing meshes draw as before. See the Meshes and Geometry guides
- **rendering:** Trails: `addTrailComponent(world, entity, options)` makes an entity leave a ribbon behind it that tapers and fades from `startWidth` and `startColor` to `endWidth` and `endColor` over `lifetimeSeconds`, recorded every `minVertexDistance` world units, with `widthEasing` and `colorEasing`, a `texture` in `'stretch'` or `'tile'` mode, `emitting`, `category` and `layer`. `createTrailEcsSystem(time, renderContext)` records and draws it through a mesh on the entity, in the same draw order as sprites and behind the entity's own sprite, at the same length at any frame rate; colors above `1` feed bloom. `clearTrail(world, entity)` empties a trail after a teleport. Removing the trail or its entity frees its GPU geometry. See the new Trails guide
- **math:** Grid layouts: `createOrthogonalGridLayout({ cellWidth, cellHeight })` and `createIsometricGridLayout({ cellWidth, cellHeight })` return a `GridLayout`, which converts between the cells of an unbounded Y-down grid and local positions. The isometric layout is Tiled's `"isometric"` diamond orientation (columns go down-right, rows down-left), without Tiled's x offset. A layout has `getCellCenter`, `localToCell` (floored, so negative cells work, and every point on an edge or corner is in exactly one cell), `localToCellSpace` and `cellSpaceToLocal` (a linear map in which each cell is a unit square), `getCellPolygon` (clockwise on screen), `getCellFootprintBounds` and `getCellRangeForLocalRect` for culling. Drawing cells in row-major order, with or without fixed-size chunks, is back to front for both layouts when each cell's image is at most one cell wide, sits on its cell's left edge and doesn't reach below its footprint. See the new Grid Layouts guide

- **rendering:** `buildRibbonMesh(points, options, buffers)` turns a line of points, each with a `position`, `width`, straight-alpha `color` and `distance`, into a triangle-strip ribbon that keeps its width around corners, for a `'triangleStrip'` `Geometry`. Joins are mitered and beveled past `miterLimit`, the inner side of a curve tighter than half the width is pulled in instead of folding, and points closer than `1e-4` units are skipped. `textureMode` `'stretch'` runs U from `0` to `1` over the ribbon and `'tile'` repeats the texture every `tileLength` units. It writes into reusable `createRibbonMeshBuffers(pointCapacity)` arrays and allocates nothing once they're large enough. See the new Ribbon Meshes guide
- **rendering:** `Geometry.update({ vertexCount, attributes, indices })` replaces a geometry's vertex data, as often as every frame, for meshes that change shape, such as trails, ropes and debug lines. It writes into the existing buffers and grows a buffer to the next power of two bytes only when the data doesn't fit, so it creates no GPU objects, and a restored WebGL context gets the latest data. A geometry can also have `indices` (`Uint16Array` or `Uint32Array`) and a `topology` (`'triangles'`, `'triangleStrip'`, `'lines'`, `'lineStrip'` or `'points'`), and draws itself with `draw()` or `drawInstanced(instanceCount)` after `bind(material)`. `vertexCount` is the number of vertices drawn
- **rendering:** Meshes draw in the same draw order as sprites and text. `addMeshComponent(world, entity, { geometry, material, layer, category })` adds a `MeshEcsComponent`, and `createRenderEcsSystem` draws its geometry through the entity's world position, rotation and scale, sorted with sprites and text by `layer`, world order, Y (for a `ySort` camera) and hierarchy order, so a mesh can draw behind one sprite and in front of another. An entity's mesh draws behind its own sprite and text. Meshes follow the camera's `cullingMask`, visibility, masks and view culling (from the new `Geometry.bounds`) like sprites. Draw them with a `MeshMaterial` from `createMeshMaterial(renderContext, vertexShaderName, fragmentShaderName)`: the vertex shader includes `meshVertex` (`meshWorldPosition`, `meshClipPosition`, `forwardMeshMask`) and the fragment shader includes `mask`. See the new Meshes guide and demo
- **rendering:** Y-sort units: `DrawOrderEcsComponent.ySortChildren` lets an entity's children sort by their own Y under a `ySort` camera, so walls parented under a level root sort against a character that is a root. A root is a sort unit, each child of a unit with `ySortChildren` is a unit too, and every other entity draws with its nearest unit ancestor, so a character's sword still draws with the character. `ySortChildren` only applies on an entity that is itself a unit, so nested layers set it at every level. Units at the same Y draw in hierarchy order. `DrawOrderEcsComponent.ySortOrigin` moves the point a unit sorts at along its own local Y axis, through its rotation and scale, such as to a tree's trunk base. UI hit testing and first focus follow the canvas camera's `ySort`. See the Draw Order guide

- **rendering:** Texture atlases: `createTextureAtlas(texture, rects)` builds a `TextureAtlas`, one texture and its named `AtlasRegion`s, from texel rects measured from the texture's top-left like a packer writes them (`{ name, x, y, width, height }`, plus `sourceWidth`, `sourceHeight`, `trimX` and `trimY` for a trimmed frame and a Y-down `pivot`, default `(0.5, 0.5)`). Each region is a `TextureRegion` on the rect's exact texel edges, with its `name`, untrimmed `sourceSize` and `pivot`. Look regions up with `getRegion(name)` (which throws naming up to three close names), `hasRegion(name)` and `getRegionAt(index)`. `createTextureAtlas` throws for duplicate or empty names and for rects that aren't whole texels or leave the texture or their frame. `createGridTextureAtlas(texture, { cellWidth, cellHeight, columns, rows, spacing, margin })` cuts a sprite sheet or tileset into row-major cells named `'0'`, `'1'`, ..., counting whole cells like Tiled. `createAtlasSprite(atlas, nameOrIndex, { pixelsPerUnit, slices })` returns sprite options for one region, sized to its untrimmed frame with its pivot, so sprites from any regions of one atlas batch into one draw call, and a nine-sliced atlas sprite can be passed to `createPanel` and `createButton`; it throws for `slices` on a trimmed region. See the new Texture Atlases guide
- **rendering:** TexturePacker atlases: `new TextureAtlasCache(renderContext).getOrLoad({ dataUrl, imageUrl }, { filter })` loads a `TextureAtlas` from a TexturePacker "JSON (Hash)" or "JSON (Array)" file (also written by free-tex-packer and Aseprite) and its image, once per `dataUrl`, with the texture from `renderContext.textureCache`; `get(dataUrl)` returns a loaded one. Each frame becomes a region named as in the file, with its trim and its Y-down `pivot`. For JSON a game already has, `parseTexturePackerAtlas(json)` returns the file's texel rects without touching WebGL, and `createTexturePackerAtlas(texture, data)` builds the atlas from them. Invalid files throw naming the frame and field, and so do rotated frames (export with rotation off), multi-page files, frames outside `meta.size` and an image whose size isn't `meta.size`. `createTextureAtlas` takes `{ scale }`, kept as `TextureAtlas.scale` and read from the file's `meta.scale`, and `createAtlasSprite` divides region sizes by it, so an `@2x` export draws at the same world size at the same `pixelsPerUnit`
- **animations, rendering:** Animation clips from atlases: `createAtlasAnimationClip(atlas, frames)` builds a clip from an atlas's regions, given by name or by index, in the order given, and throws listing every missing name, for an index outside `atlas.regions`, and for frames whose untrimmed sizes or pivots differ (a sprite draws every frame inside one size and around one pivot). `getAtlasRegionNames(atlas, prefix)` lists the regions starting with a prefix in natural order (`run_2` before `run_10`, `run_9.png` before `run_10.png`), for atlases without an animation list and TexturePacker hash files, whose order isn't the frame order; it throws when nothing matches. Atlases have `sequences`, named lists of region names, and `getSequence(name)`, which throws naming close names: `parseTexturePackerAtlas` reads them from the file's `animations` object (written by TexturePacker's "Auto-detect animations") and throws if a list is empty or names a missing frame, and `createTextureAtlas` takes them as its `sequences` option. Play one with `createAtlasAnimationClip(atlas, atlas.getSequence('run'))`
- **physics:** Chain colliders: `new ChainCollider(loops)` is static level geometry built from closed loops of points, so a whole level's walls, floors, ceilings and platforms are one collider on one entity. A loop with positive signed area (clockwise on screen) surrounds solid and one with negative signed area surrounds a hole, such as a room. Bodies collide with the edges only from the side their outward normals face, and each edge's neighbors act as ghost edges, so a box or circle sliding along a floor made of many edges never catches where they meet, and a body in a concave corner gets a contact from each wall. The collider keeps a tree of its edges, so collision, raycasts and sweeps only test the edges near a body. The constructor throws for a loop with fewer than 3 points, repeated consecutive points, zero area, or edges that cross. A chain with no loops has no edges and collides with nothing. `raycast` hits chains where a ray enters solid, and continuous collision stops fast circles at their edges. `detectCircleChainCollision`, `detectPolygonChainCollision`, `raycastChain` and `sweepCircleChain` are exported, along with the `EdgeChain` and `ChainEdge` types and `ColliderType`. See the new Chain Colliders guide

#### Changed

- **tilemaps:** A tile with its transpose bit set now turns instead of stretching: `getTileImageRect` swaps its rect's width and height, keeping its bottom-left corner, so a transposed 16 x 32 tile draws 32 x 16, as Tiled draws it. Square tiles are unchanged, and a tile's collision shape still turns within its own cell's footprint
- **tilemaps:** `TilemapRenderStateEcsComponent.meshes` is renamed `chunkMeshes`, and is empty for a y-sorted layer: read `ySortMeshes` (one `TilemapYSortMesh` per source, with its `rows`) for those, and `ySorted` for which kind the layer was built as
- **rendering, animations, text:** A sprite's `uvOffset` and `uvScale` are replaced by `region`, an immutable `TextureRegion` (`uvOffset`, `uvScale`, and the `trimOffset`/`trimScale` of a trimmed atlas frame inside its untrimmed frame) that defaults to `fullTextureRegion`. Create one with `createTextureRegion(uvOffset, uvScale, trim?)`, which throws for non-finite values, a scale that isn't above `0` or a trim rect outside its frame; the UV rect may go past `0` to `1` on a repeating texture. A sprite's `width`, `height` and `pivot` describe the untrimmed frame, and a trimmed region draws at its place inside it, so frames trimmed by different amounts don't move or stretch the art, and still draw in one batch. To migrate, replace `uvOffset: o, uvScale: s` with `region: createTextureRegion(o, s)` and assign a new region instead of writing `sprite.uvOffset` in place. `AnimationFrame` is removed: `AnimationClip`, `SpriteSheet`, `selectAnimationFrames` and `OnAnimationFrameChangeEvent` use `TextureRegion` (read `frame.uvOffset`/`uvScale` instead of `offset`/`dimensions`), and the sprite animation system now assigns each frame's whole region, so frames of different sizes in the texture play correctly. `NineSliceRegion` and `GlyphQuad` carry a `region` instead of `uvOffset`/`uvScale`, `computeNineSliceRegions` takes the sprite's region instead of the two vectors, and nine-slicing a sprite with a trimmed region throws
- **physics:** `TerrainCollider.surface` is an `EdgeChain`, shared with `ChainCollider`: read `terrain.surface.edges[i]` instead of `terrain.surface[i]`. `TerrainSurfaceEdge` is replaced by `ChainEdge`, which adds `previous`, `next`, `startVertex` and `endVertex`, and `buildTerrainEdgeSlab` takes a `ChainEdge`. Terrain collision finds nearby edges through a tree instead of testing every edge, with the same contacts. Every `Collider` has a `supportsDynamicBodies` flag: a `'dynamic'` body with a `TerrainCollider` or `ChainCollider` now throws when its mass data is read, since neither has a mass distribution, and their `mass`, `momentOfInertia` and `localCenterOfMass` are `0`. Use a `'static'` or `'kinematic'` body (or none) for terrain
- **math, physics, rendering, text, ui, input:** The world is Y-down: `+Y` points down the screen, as in Godot's 2D, the DOM, pointer events and the W3C gamepad, so the engine no longer flips Y between them. `Vec2.up` is `(0, -1)` and `Vec2.down` is `(0, 1)`; gravity defaults to `(0, 9.81)`; a `Rect`'s `min` is its top-left corner; normalized coordinates (sprite and mask `pivot`, UI anchors, pivots and `uiAlignments`, scroll positions) put `(0, 0)` at the top-left and `(1, 1)` at the bottom-right; `UiAnchor` presets keep their names; text lines advance towards `+Y`; `ySort` cameras draw lower Y first, so whatever is lower on screen is in front; terrain is solid below its curve, towards `+Y`; keyboard and gamepad `Axis2d` actions read up as negative Y, and gamepad sticks report the W3C values as they are (up is `-1`). Angles keep their numbers (radians, `0` along `+X`, positive turns `+X` towards `+Y`), which is now clockwise on screen. To migrate a scene, negate every Y value that means a direction or a position (positions, velocities, impulses, forces, gravity, `anchoredPosition.y`, offsets, joint anchors and axes), replace a normalized `y` (a pivot, an anchor, an alignment, a normalized scroll position) with `1 - y` and a normalized `{ min, max }` range with `{ min: 1 - max, max: 1 - min }`, flip comparisons of Y (`y < bottom` becomes `y > bottom`), and negate every angle and angular quantity (rotations, angular velocities, torques, motor speeds, particle `directionRange` and `rotationRange`, radial mask `startAngle` and `sweep`; revolute limits `[lower, upper]` become `[-upper, -lower]`). Leave texture coordinates (`uvOffset`, `uvScale`) and `TextEcsComponent.shadowOffset` alone: they already had `+y` down. Remove any negation you added to make a gamepad stick, the mouse or `CameraView` agree with the world. The `radialGradientShader` and `perlinNoiseFragmentShader` measure their screen `uv` from the top-left, so the noise pattern flips vertically and a radial gradient's `u_center.y` becomes `1 - y`
- **ui:** Following the Y-down world, `UiAnchor` presets and `uiAlignments` keep their names but use `y` `0` for top and `1` for bottom, layout groups and grids stack from the top with a top-left child pivot, a `UiScrollRectEcsComponent`'s `offset.y` runs from `0` to negative like `offset.x`, and `normalizeUiScrollOffset` returns `y` `0` at the top. `createTooltip`'s default `offset` is `{ x: 0, y: -8 }`, and `createLabel` no longer sets `verticalAlign: 'bottom'` for a `sizeToText` label. Negate the `y` of every `anchoredPosition`, and swap a raw `UiAxis.point(1)` meaning top for `UiAxis.point(0)`
- **text:** Font atlases are Y-down too, so they're read without flipping. `forge-generate-font-atlas` writes `formatVersion` `3`, with each glyph's `planeBounds` relative to the baseline and Y-down (`top` is smaller than `bottom`, and ink above the baseline is negative), and `atlasBounds` measured from the atlas image's top-left like every other texture coordinate. `FontAtlasMetrics` `ascender`, `descender` and `capHeight` are now `ascentLine`, `descentLine` and `capLine`: Y positions relative to the baseline, so `ascentLine` and `capLine` are negative and `descentLine` is positive. The shipped default font is updated. `FontAtlasCache` rejects a version `2` file, so regenerate your own atlases with `forge-generate-font-atlas`, and negate any metric or `planeBounds` `top`/`bottom` your code reads
- **rendering:** `new Geometry(renderContext, attributes)` is now `new Geometry(renderContext, { attributes })`, and throws if the attributes hold different numbers of vertices. `TerrainMesh.vertexCount` is removed: read `mesh.geometry.vertexCount` instead
- **rendering:** The `spriteMask` shader include is now `mask`, and its `spriteMaskCoverage()` is now `maskCoverage()`, since meshes use it too. In custom sprite fragment shaders, replace `#pragma forge include(spriteMask)` with `#pragma forge include(mask)` and `spriteMaskCoverage()` with `maskCoverage()`. The `spriteMaskShaderInclude` export is now `maskShaderInclude`; `spriteMaskVertex`, `forwardSpriteMask` and `spriteMaskVertexShaderInclude` keep their names
- **rendering:** Terrain is a mesh. `createTerrainMesh` returns `{ geometry, material }` (a `MeshMaterial`) built from the curve points in the terrain entity's local space, so add it with `addMeshComponent(world, terrainEntity, mesh)` instead of `addTerrainMeshComponent(world, terrainEntity, { mesh })`, and remove `createTerrainRenderEcsSystem` from your systems. Terrain now follows its entity's transform, sorts with sprites (create the terrain entity before the sprites that go in front of it, or give it a lower `layer`), blends like a sprite, can be masked, and defaults to category `1` instead of every category. Adding terrain no longer sets `renderContext.clearStrategy` to `CLEAR_STRATEGY.none`
- **animations:** An `AnimationClip` has the `texture` its frames are regions of: `new AnimationClip(frames)` is now `new AnimationClip(texture, frames)`, and `frames` is a frozen copy. `createSpriteAnimationEcsSystem` writes the clip's texture to the sprite's `texture` together with each frame's `region`, so a clip played on a sprite of another texture no longer samples the wrong image, and changing a sprite's clip to one of another atlas switches its texture on the new clip's first frame. To migrate, pass the frames' texture first or build the clip with `createAtlasAnimationClip`, and remove code that sets an animated sprite's `texture` when it changes the clip: the system overwrites it at the next frame change

#### Removed

- **rendering:** `createImageSprite`'s `frameDimensions`, which only ever picked a sprite sheet's top-left frame. Replace `createImageSprite(texture, { frameDimensions: { x: w, y: h } })` with `createAtlasSprite(createGridTextureAtlas(texture, { cellWidth: w, cellHeight: h }), index)`, which picks any frame. `createImageSprite` now always draws the whole texture
- **animations:** `createSpriteSheet`, `SpriteSheet` and `selectAnimationFrames`, which sliced a grid a second way. Cut the sheet with `createGridTextureAtlas` and build a clip from its regions with `createAtlasAnimationClip`: `new AnimationClip(selectAnimationFrames(createSpriteSheet(texture, rows, columns), count, start))` becomes `createAtlasAnimationClip(atlas, Array.from({ length: count }, (_, index) => start + index))` on `createGridTextureAtlas(texture, { cellWidth, cellHeight })`, and frames that aren't one row-major run are listed by index (`createAtlasAnimationClip(atlas, [4, 5, 12, 13])`) or built with `createTextureAtlas` from their rects
- **rendering:** `createTerrainRenderEcsSystem`, `TerrainMeshEcsComponent`, `addTerrainMeshComponent`, `terrainMeshId`, the `TerrainMesh` type and `createTerrainMesh`'s `position` and `angle` options. Use `addMeshComponent` (see above); the mesh takes its position and rotation from its entity

#### Fixed

- **physics:** Two `TerrainCollider`s whose bounds overlap no longer throw in `createNarrowPhaseEcsSystem`. Terrain and chain colliders never collide with each other, so they no longer need a `category` and `mask` that exclude each other
- **rendering:** A sprite drawing a region of a texture whose `wrap` is `'clamp'` (an atlas region, a frame of a sheet, a nine-slice band) no longer blends in the texels around the region under `'linear'` filtering, which showed as seams between tiles cut from a sheet with no spacing and drawn at a fractional scale. Sampling now stops half a texel inside the region, which repeats its edge texels the way a whole clamped texture repeats its own; `'repeat'` textures are unchanged, so their regions still tile and scroll. Stretched or tiled nine-slice bands repeat their own edge texels instead of blending into the band next to them. Custom sprite fragment shaders receive the clamp rect as `flat in highp vec4 v_texBounds` (min in `xy`, max in `zw`): sample at `clamp(v_texCoord, v_texBounds.xy, v_texBounds.zw)` to get the same fix. `u_regionInset`, which the render system sets from each batch's texture, joins `u_texture` and `u_emissiveTexture` as a sprite material uniform that `setUniform` rejects

## [0.26.2] - 2026-10-12

_No user-facing changes._

## [0.26.1] - 2026-10-07

#### Added

- **rendering:** `DrawOrderEcsComponent.behindParent` draws a child just behind its parent, and in front of everything its parent is in front of, like Godot's `show_behind_parent`. Use it for an engine flame behind its ship or a glow behind its orb, where `order: -1` also put the child behind every other entity at its parent's level. The child's whole subtree moves with it, and the render order and UI hit testing both follow it
- **rendering:** `renderContext.textureCache` (a `TextureCache`) loads each image file into a texture once: `await renderContext.textureCache.getOrLoad(url, { filter, wrap })` returns the same texture for every request for that URL and those options, including requests made while it's loading, so sprites drawn from one file share a texture and batch into one draw call. The cache owns its textures, so their `update` and `dispose` throw. Replace `createTexture(renderContext, await renderContext.imageCache.getOrLoad(url))` with it, and delete any URL-to-texture cache of your own. `FontAtlasCache` loads atlas textures through it
- **input:** `Axis2dAction.presses` lists the value the axis had each time its length reached `axisPressThreshold` (`0.5`) during the frame, and is cleared by `InputManager.reset`, like `TriggerAction.isTriggered`. Read it to act on presses rather than on the axis's current value
- **utilities:** `withDefaults(defaults, options)` applies an options object over its defaults, giving an option that's `undefined` its default

#### Changed

- **storage:** A stored persistent-state field that fails its checks (wrong type, not a finite number, or rejected by its validator), for example one written by an earlier version of the game with other defaults or validators, now takes its default instead of making `createPersistentState` reject. The record's other fields still load, and the stored value is replaced the next time its field is set. A stored entry that isn't a JSON object loads as nothing stored. `PersistentStateFormatError` is removed, and `PersistentStateValueError` is now only thrown for a default or a value passed to `set`: delete any code that catches them on load, removes the stored entry and loads again
- **ui:** `CanvasEcsComponent.wasNavigateInputBeyondThreshold` is removed. Focus navigation now steps once for each of `navigateInput.presses`

#### Fixed

- Options passed as `undefined` now take their defaults everywhere, the same as options left out. `createPersistentState(name, defaults, { validators: undefined })` used to reject with a `TypeError`, and other factories stored the `undefined`
- **ui:** UI focus navigation no longer drops a key or d-pad press that starts and ends between two frames. Each press moves focus one step, even at low frame rates, and two presses in one frame move it two steps

## [0.26.0] - 2026-10-07

#### Added

- **ui:** Scroll views. `createScrollView(world, parent, options)` builds a viewport that clips a vertical list to its rect with a mask and scrolls it by dragging (anywhere on it, including on the list's buttons, which aren't invoked by a drag), the mouse wheel, an optional scrollbar, and focus navigation, which scrolls the focused control into view. Released content coasts (`decelerationRate`) and, with `movementType: 'elastic'` (the default), springs back from past its edges (`elasticity`); `'clamped'` stops it at its edges. For other layouts, add `UiScrollRectEcsComponent` (`addUiScrollRectComponent`) to your own viewport; `offset` holds the scroll position in reference pixels and `onValueChanged` reports changes, and `computeUiScrollRange`/`normalizeUiScrollOffset`/`denormalizeUiScrollOffset` convert it to and from a `0`-`1` position. `registerUiSystems` registers the new `createUiScrollRectEcsSystem` when a `pointerSource` is given. See the new Scroll Views guide and demo
- **ui:** `UiInteractableEcsComponent.receivesDrag`: a press that crosses `dragThreshold` goes to the nearest element, the pressed one or an ancestor, with `receivesDrag: true`, which raises the drag events; the pressed element's press ends without `onInvoke`. `createSlider` sets it on its track. `UiInteractableEcsComponent.focusable` (default `true`): `false` keeps navigation and pointer hover from focusing an element
- **audio:** A sound mixer built on the Web Audio API. `createSoundMixer()` owns the game's audio output and starts it on the player's first click, tap or key press (and again after Safari interrupts it). `mixer.createBus(name, parent?)` creates nestable buses whose `volume` and `muted` apply to every sound played through them, including sounds already playing. `mixer.suspend()`/`resume()` pause all audio, and `mixer.stop()` releases it when the game is torn down
- **audio:** `SoundAssetCache` loads and decodes each sound file once and shares concurrent loads, and `createSoundAsset({ sampleRate, channels })` makes a sound from samples, for audio generated at runtime. Sounds stay usable after the world that played them stops
- **audio:** `playSound(bus, sound, { volume, rate, loop })` plays a sound without an entity and returns a handle to change its volume or stop it. Any number of sounds, including copies of the same one, can play at once
- **audio:** `SoundEcsComponent` (`addSoundComponent`, `soundId`) with `createSoundEcsSystem()` plays a sound that belongs to an entity. Changes to its `volume`, `rate`, `loop`, `bus`, `sound` and `paused` apply while it plays, removing the component or the entity stops it, and `hasFinished` reports when a non-looping sound has played to its end
- **audio:** A non-looping sound requested before the player's first interaction with the page is dropped rather than played late on the first click; looping sounds start and are heard once audio runs
- **storage:** New `@forge-game-engine/forge/storage` module for data that has to outlive the page, such as settings, achievements and unlocked levels. `await createPersistentState(name, defaults, { validators, storage })` loads a named record of numbers, strings and booleans once, takes the default for every field that isn't stored, and stores only the fields you `set`, so changing a default in an update reaches players who never changed that field. `set` and `reset` raise `onChange` and return a promise that settles once the change is stored; writes go out one at a time and in order. Nothing falls back silently: a stored value of the wrong type rejects with `PersistentStateValueError` naming the field, an entry that isn't a JSON object rejects with `PersistentStateFormatError`, and storage failures reject with `StorageError` (`StorageUnavailableError`, `StorageBlockedError`, `StorageFullError`). Records are kept through a `StorageBackend`: `createLocalStorageBackend()` (the default) or `createMemoryStorageBackend()`, or your own. See the new Storage guide and Persistent State demo
- **physics:** Continuous collision detection. Register the new `createContinuousCollisionEcsSystem()` directly after `createEulerIntegrationEcsSystem` and a fast dynamic `CircleCollider` body no longer sinks deep into, or passes through, a static collider (polygon, circle or terrain) between two ticks. A wheel coming down from a jump, for example, now stops at the terrain's surface instead of sinking 25-30 units into it in a single tick. Write teleports to `position.local` before `createTransformEcsSystem` runs, or the sweep treats the jump as motion. The sweeps it uses are public too: `sweepCircleCircle`, `sweepCirclePolygon` and `sweepCircleTerrain` return the first `SweepHit` (`point`, `normal`, `t`) of a circle moving from one position to another
- **physics:** Collision filtering. `addColliderComponent` takes a `category` (the bits a collider belongs to, default `1`) and a `mask` (the categories it collides with, default `allCollisionCategories`). Two colliders are tested only when each one's category is in the other's mask, so pairs your game would ignore, such as bullets against bullets, never reach the narrow phase
- **physics:** `raycast` takes a `mask` option, so a ray only hits colliders whose `category` is in it
- **physics:** Sensor colliders. `addColliderComponent(world, entity, { collider, sensor: true })` makes a collider that's detected but never resolved, so bodies pass through it, for trigger zones and pickups. Sensor overlaps never appear in `collisionManifolds`, and `raycast` passes through sensors unless you pass `includeSensors: true`
- **physics:** Per-entity contacts. Give an entity `addContactsComponent(world, entity)` and `createNarrowPhaseEcsSystem` fills its `ContactsEcsComponent` every tick with the entities it's `touching` (each listed once), the ones it `started` touching and the ones it `ended` touching, sensor overlaps included. A system can ask what its entities touched without scanning `collisionManifolds`
- **ecs:** Systems and system groups can run conditionally. Pass a `runIf` function of the world to `addSystem` or `addSystemGroup`, and the world checks it each tick just before the system or group would run, skipping it (and its query) when it returns `false`. `EcsWorld` also gains a built-in `firstSystemGroup` that runs before every other group of the tick. A group ordered `after` it joins the start of the tick, before every other group. Ordering a group `before` the first group throws, and so does ordering a group before a start-of-tick group, or a start-of-tick group after one that isn't
- **states:** New `@forge-game-engine/forge/states` module for a game's top-level states (menu, playing, paused, game over). `createGameState(world, initial)` returns a `GameState` whose `set` switches state at the start of the next tick. Its `exitGroup` and `enterGroup` run once per transition, before any other system, holding systems that use `onExit`/`onEnter` as their `runIf`; `inState` runs a system only in some states. The initial state is entered on the first tick, and setting the current state again restarts it. `addStateScopedComponent` removes an entity when its state leaves one of `removeOnExit` or enters one of `removeOnEnter`. See the new Game States guide and demo
- **rendering:** `getCameraView(world, camera, renderContext)` (and `computeCameraView(camera, position, renderContext)` for systems that already hold the camera's components) returns what a camera sees: the world area it shows (`bounds`, `size`, accounting for its position and zoom), its `pixelsPerUnit` in CSS pixels, and `worldToViewport`/`viewportToWorld` conversions to and from CSS pixels on the canvas. To place something drawn by one camera over something drawn by another, convert through the viewport: `hudView.viewportToWorld(gameView.worldToViewport(position))`
- **text:** Rich text tags. `TextEcsComponent.text` (and `shapeText`) parse `<b>...</b>` and `<color=#rrggbb>...</color>` (`#rgb`, `#rgba` and `#rrggbbaa` too) to style part of a string. Tags are stripped before shaping, so they never change kerning or wrapping. `<b>` draws a synthetic bold from the same atlas, thickening each glyph by `FAUX_BOLD_EMBOLDEN` ems per side and widening its advance to match. A `<color>` replaces the text's `color`, alpha included. Markup that isn't a valid tag, such as `HP < 50%` or `<i>`, is drawn as literal text, so a string that happens to contain `<b>` or `<color=#...>` now renders styled. `parseRichText` is public, and `GlyphQuad` gains `color` and `embolden`
- **text:** The engine's default font can be imported through a bundler from `@forge-game-engine/forge/fonts/default/default.json` and `@forge-game-engine/forge/fonts/default/default.png`, so you no longer need to copy it out of `node_modules`
- **ui:** Text input fields. `createTextInput(world, parent, { renderContext, sprite, fillSprite, fontAtlas, size })` builds a single-line field the player types into through a hidden DOM `<input>`, so keyboard layouts, IME composition, paste, phone keyboards and screen readers work. Its `TextInputEcsComponent` holds the filtered `value` (characters the font can't draw are dropped, then an optional `filter` and `maxLength` apply), `isEditing`, and `onValueChanged`/`onSubmit`/`onCancel` events; `setTextInputValue` and `editTextInput` change it from code. Editing is separate from UI focus: it starts on a click, a tap (focusing inside the tap, so phone keyboards open) or `submitInput` while focused, and ends on Enter, Escape or blur. `registerUiSystems` registers the new `createUiTextInputEcsSystem`
- **input:** `createTextEntry(container)` creates the hidden-input primitive text fields are built on, for game-drawn text that isn't a UI field (a chat box, a debug console): it exposes the value, selection and IME composition, and reports Enter/Escape/changes/blur through `takeEvents()`
- **text:** `TextEcsComponent.richText` (and `shapeText`'s `richText` option), default `true`. Set it to `false` to draw text exactly as written, tags included, for text a player typed. Text fields' labels set it to `false`
- **text:** `shapeText` returns `caretStops`, the position of every UTF-16 boundary in the shaped text (whitespace and missing glyphs included), and `TextMeshEcsComponent.caretStops` carries them
- **ui:** `raycastUiCanvas(world, canvasEntity, renderContext, viewportPosition)` returns the topmost interactable under a pointer position on a canvas, the same hit test `createUiRaycastEcsSystem` runs each tick
- **rendering:** The engine survives a lost WebGL context. When the browser takes the context away (after a GPU reset, or when the device runs low on memory), the render context asks for it back and the game keeps running without drawing; when it returns, every program, texture, render target and geometry the engine created is rebuilt and the next frame draws what it drew before, with no page reload. `renderContext.isContextLost`, `onContextLost` and `onContextRestored` let a game react, for example by lowering `maxPixelRatio`. Materials, textures, render targets and geometry can be created and resized while the context is lost. A texture keeps a reference to the source it was last updated from so it can upload it again, and the render context holds every texture, render target and geometry until it's disposed. A texture made from an `ImageBitmap` or `VideoFrame` you have closed comes back empty until you update it in `onContextRestored`. See the new Context loss guide and demo
- **rendering:** Masks. `addMaskComponent(world, entity, { width, height, pivot, shape })` clips the sprites and text of an entity and all its descendants to a rect placed like a sprite's quad (the entity's position, rotation, scale and flip). The `shape` shows the whole rect (`{ kind: 'rect' }`, the default), `amount` of it from one edge (`{ kind: 'linear', origin: 'left' | 'right' | 'bottom' | 'top', amount }`) or a sector around its center (`{ kind: 'radial', startAngle, sweep, amount }`, in radians, with a negative `sweep` turning clockwise and less than a full turn giving an arc). Edges are anti-aliased, rect masks nest (their bounds intersect), and masked and unmasked sprites still batch together. A linear or radial mask on a sprite's own entity reveals part of it without resizing it, for filling bars, draining rings and cooldowns; a nine-slice sprite keeps its end caps. Content can be under at most one linear or radial mask; the render system throws for two. See the new Masks guide and demo
- **ui:** `createProgressBar` takes a `fillShape`, a linear mask from any edge or a radial one, so a progress bar can be a ring or a cooldown. It defaults to a linear fill from the left
- **rendering:** `VisibilityEcsComponent` hides an entity and everything parented under it. `addVisibilityComponent(world, entity, { visible: false })` hides the subtree: its sprites and text aren't drawn, its particle emitters spawn nothing (their timing keeps running, so showing them doesn't release a backlog, and particles already spawned live on), UI layout groups and content size fitters leave hidden children out so the elements after them close the gap, and hidden UI elements can't be hit or focused. Focus on an element that becomes hidden is released, and a press or drag on it is cancelled with `onEndDrag` (if dragging) and `onPointerUp`, without `onInvoke`. A descendant can't show itself under a hidden ancestor. `isVisibleInHierarchy(world, entity)` reports whether an entity or any ancestor is hidden. See the new Visibility guide and demo

#### Changed

- **input:** `MouseInputSource.scroll` is a `Vector2` (`deltaX` and `deltaY`) instead of a number (`deltaY` only), so horizontal scrolling is reported too. Read `scroll.y` where you read `scroll`. Wheel deltas reported in lines (Firefox) are converted to pixels at 40 per line, and in pages to the container's size, for `scroll` and for `MouseAxis1dBinding`
- **ui:** `UiPointerSource` requires a `scroll: Vector2` (the wheel scroll since the last reset, in CSS pixels). `MouseInputSource` has it; add it to your own pointer sources
- **rendering:** Sprites and text no longer sort by world Y. Within a `layer`, they now draw by the new `DrawOrderEcsComponent`, then in hierarchy order: root entities in the order they were created, each followed by its children (parents before children, siblings in the order they were parented). `addDrawOrderComponent(world, entity, { order })` takes an integer from `-4096` to `4096` that is added to the parent's, so a ship's engine flame with `order: -1` draws behind every entity at the ship's level with no per-frame code, and an order on a container moves its whole subtree. The sort is exact: the old 4096-step depth buckets, which lost Y order whenever a far-away sprite widened the depth range, are gone, and draw order no longer depends on query order. Cameras for top-down views set the new `CameraEcsComponent.ySort: true`, where a higher Y draws first (lower on screen is in front) and each root entity's subtree sorts by the root's Y. `SpriteEcsComponent.sortDepth`, `TextEcsComponent.sortDepth` and `RectTransformEcsComponent.sortDepth` are removed: put things that must stay behind on a lower `layer` or create them first, replace per-frame `sortDepth` updates with a `DrawOrderEcsComponent` on the child, and set `ySort` on the camera if your game relied on Y-sorting. `buildTextCameraCommands` is removed and `RenderCommand` loses `layer` and `depth`. `EcsWorld.getCreationSequence(entity)` returns the creation order roots draw in. UI raycasts hit, and navigation starting with nothing focused picks, by the same draw order, so an element raised with `DrawOrderEcsComponent` both draws above its later siblings and takes their clicks; `createUiLayoutEcsSystem` no longer writes any sort depth
- **rendering:** Sprites reference textures instead of draw pipelines, so sprites of the same image batch wherever they were created and each shader pair compiles once. New `Texture` and `createTexture(renderContext, source, { filter, wrap })` upload any image, canvas, `ImageData`, `ImageBitmap` or video frame; `texture.update(source)` replaces its contents and `texture.dispose()` frees it (whoever creates a texture owns it). `renderContext.whiteTexture` and `renderContext.blackTexture` are built in. `SpriteEcsComponent.renderable` is replaced by `texture` (assign another texture to change the image), `emissive: { texture, color }`, `material` (a `SpriteMaterial` from the new `createSpriteMaterial(renderContext, fragmentShaderName)`, or `null` for the shared `renderContext.spriteMaterial`) and `category` (default `1`, matched against camera culling masks as for text). `createImageSprite(image, renderContext, options)` becomes `createImageSprite(texture, options)` and does no GL work: create the texture with `createTexture(renderContext, image)` (`{ filter: 'nearest' }` replaces `pixelated: true`), set the sprite's `category` instead of the `layer` option, and set `emissive: { texture, color }` instead of `emissiveMap`, multiplying the old `color` by the old `intensity` (colors above `1` glow into HDR). `createImageSprite` now sets `uvScale` to one frame's share of the texture when `frameDimensions` is given; delete code that set it by hand, and don't use `frameDimensions` to size a sprite (set `width`/`height` instead). `new Material(vertexSource, fragmentSource, gl)` becomes `new Material(renderContext, vertexSource, fragmentSource)`: materials made from the same shaders share one program, and binding a material gives every uniform it didn't set a default (zero, or the black texture for samplers) instead of whatever another material uploaded. Sampler uniforms take a `Texture` instead of a `WebGLTexture`, and only `sampler2D` uniforms are supported. `RenderTarget.colorTexture`, `swapBuffers()` and `beginPostProcessPass()` return a `Texture`. For a custom sprite shader, replace a hand-built `Renderable` with `createSpriteMaterial`: the render system binds each sprite's texture to `u_texture` and emissive map to `u_emissiveTexture` if the shader declares them, and the emissive color reaches the shader as `v_emissive`. `Sprite` and `createSprite(width, height, texture)` take a texture, and `importTexture` takes a `Texture`. `createTerrainMesh` layers take a `texture` created with `wrap: 'repeat'` instead of an `image`. Text: `new FontAtlasCache(renderContext)` replaces `new FontAtlasCache(renderContext.imageCache)` and uploads each atlas to `FontAtlas.texture` (replacing `image`), `createTextShapingEcsSystem()` no longer takes the render context, and `TextMeshEcsComponent` no longer has `fillRenderable`/`effectsRenderable`
- **ecs:** Removing an entity now removes its children, depth first, raising `onEntityRemoved` for each descendant before the entity itself, so removing a ship removes its engine flames and removing a UI panel removes its labels, buttons and nested panels. To keep a child, call `removeParent` (or `setParent` with another parent) before removing its parent. The world now owns the hierarchy: parent entities with `world.setParent(child, parent)` instead of `addParentComponent(world, child, { parent })`, which is removed, and use `world.removeParent(child)`, `world.getParent(child)` and `world.getChildren(parent)` (children in the order they were parented, kept when siblings or unrelated entities are removed). `setParent` throws for a removed entity or a parent that is the child or one of its descendants, and keeps the child's local transform. `ParentEcsComponent` and `parentId` move from `@forge-game-engine/forge/common` to `@forge-game-engine/forge/ecs`, and `parent` is now `readonly`; adding it with `addComponent` or removing it with `removeComponent` throws. A loop that removes entities from a query result should check `world.isAlive` before acting on later entities, which may have been removed along with their parent. UI layout, layout groups and canvas groups now arrange children in that sibling order, so removing an unrelated UI element no longer reorders a layout group's children
- **text:** `verticalAlign: 'middle'` centers the band from the first line's cap height to the last line's baseline, instead of the string's rendered glyphs. A label no longer moves when its text changes ("LEVEL 1" and "QUIT", or a lowercase label gaining a "g"), and labels centered at the same point share a baseline. `createButton`, `createDropdown` and `createTooltip` labels move with it. If you offset a `'middle'` label by hand to put its capitals in the middle, remove the offset
- **text:** The font atlas generator measures `metrics.capHeight` on the reference capital's ink, without the distance field padding around its quad, and the shipped default font is updated (`capHeight` goes from `0.881` to `0.690` em). `verticalAlign: 'capline'` now puts the top of a capital exactly on the anchor, so `'capline'` text sits about `0.19` em (times `size`) higher than before; adjust positions you tuned around the old value. Regenerate your own atlases with `forge-generate-font-atlas` to correct their `capHeight`
- **rendering:** `Color`'s red, green and blue are no longer clamped to `1`, so a tint can make a sprite brighter than its texture: a button can rest at `Color.white` and brighten on hover with a `hoverColor` such as `new Color(1.2, 1.2, 1.2)`, and on an `hdr` camera a sprite tinted `new Color(3, 3, 3)` blooms more than a white-tinted one. On the canvas or an 8-bit render target, each channel of the result still stops at full brightness. Negative channels are still clamped to `0` and alpha to `[0, 1]`, and `toRGBAString` writes channels above `1` as `255`. If you dimmed sprites below `1` at rest so they could brighten, tint them `Color.white` at rest and above `1` when brightened instead. If you relied on values above `1` being clamped (for example a color eased with an overshooting easing), clamp them yourself. `Color.fromHSLA` now throws for a saturation or lightness outside `0`-`100`
- **ecs:** Entities are now generational handles, so a reference to a removed entity can never point at an unrelated entity that took its place. A handle packs a slot index and a generation into the same `number`; a reused slot gets a new handle, so the removed entity's handle stops matching anything: `getComponent` returns `null` for it, the new `EcsWorld.isAlive(entity)` returns `false`, and `removeEntity` on it does nothing and returns `false` (it now returns `true` when it removes an entity). Removing the same entity twice in a tick no longer hands its id to two later entities, and the least recently freed slot is reused first. An entity now stays alive until `removeEntity`: `removeComponent` no longer removes an entity whose last component it removed, so call `removeEntity` yourself if you relied on that. `addComponent` and `addTag` now throw for a removed entity (or a handle the world didn't create) instead of silently writing to it. Entities of reused slots are no longer small numbers, so don't do arithmetic on handles or use them as array indices. New exports from `ecs`: `entityIndex`, `entityGeneration` and `formatEntity`, for debugging; error messages that name an entity now print its index and generation (e.g. `12v3`)
- **math:** Every angle and direction now follows one convention: radians, `0` along `+X`, positive turning towards `+Y` (counter-clockwise, since the world is Y-up). `Vec2.up` is now `(0, 1)` and `Vec2.down` is `(0, -1)`; if you used `Vec2.up` to mean "down the screen", use `Vec2.down`. `radiansToVector(angle)` now returns `(cos angle, sin angle)`, so `radiansToVector(0)` is `(1, 0)` and it's the inverse of `vectorToRadians`; drop any `+ Math.PI / 2` you added to round-trip between them, and add `- Math.PI / 2` when facing a direction with art drawn facing up. `applyExplosiveForce` and circle-circle collisions now push coincident bodies up rather than down
- **particles:** `ParticleEmitter`'s `directionRange` and `rotationRange` are now in radians, following the same convention (`directionRange` defaults to `{ min: 0, max: 2 * Math.PI }`). Convert an old `directionRange` (degrees clockwise from up) as `{ min: Math.PI / 2 - degreesToRadians(oldMax), max: Math.PI / 2 - degreesToRadians(oldMin) }` (note that `min` and `max` swap), and an old `rotationRange` with `degreesToRadians`. An emitter's spawn shape and `directionRange` now turn with the world rotation of the entity it's on, so an emitter on a child entity follows its parent; if an emitter's entity has a rotation and you want world-space directions, move the emitter to an unrotated entity. `emitParticleBurst` takes a `rotation` option to turn a burst the same way
- **physics:** `TerrainCollider` and `createTerrainMesh` now put the solid ground below the surface points (toward `-y`), as the Y-up world expects, instead of above them. Author terrain points as the ground's surface in world coordinates on an unrotated entity: if you rotated the terrain entity by `Math.PI` and negated and reversed its points to get ground underneath, remove all three. `TerrainCollider.bottomY` is now `depth` below the lowest point (`min(y) - depth`) and surface normals point towards `+y`
- **physics:** Collider shapes stay where they're authored, and dynamic bodies turn about their shape's center of mass. `PolygonCollider` no longer moves its vertices so their centroid sits on the entity, so a shape drawn around a sprite's pivot lines up with the sprite; if you moved a sprite's `pivot` to the centroid to match the old shifted collider (as the physics demo did for its triangles), remove that. `Collider.offset` is removed: author a polygon's vertices where the shape should be, and give a `CircleCollider` a local `center` as its third argument (`new CircleCollider(radius, density, center)`), which turns with the entity. Colliders now report `localCenterOfMass` (the centroid) beside `mass` and `momentOfInertia`, all read-only. `RigidBodyEcsComponent` no longer has `mass` or `momentOfInertia`, and a dynamic body takes all three from its entity's `ColliderEcsComponent`: delete `mass` and `momentOfInertia` from your `addRigidBodyComponent` calls, change a collider's `density` to change its body's mass, and give a dynamic body that has no collider one with `mask: 0` (a dynamic body with no collider now throws). `RigidBodyEcsComponent.velocity` is the velocity of the body's center of mass. `applyImpulse(world, entity, impulse, point)` and `applyTorque(world, entity, torque, deltaTimeInSeconds)` now take the world and entity and look the body's mass up themselves: replace `applyImpulse(impulse, point, position.world, rigidBody)` with `applyImpulse(world, entity, impulse, point)` and `applyTorque(torque, dt, rigidBody)` with `applyTorque(world, entity, torque, dt)`. `getRigidBodyInverseMass(rigidBody)` is replaced by `getRigidBodyMassData(world, entity)`, which also returns the body's local center of mass, and `getWorldCenterOfMass` turns it into world space. `JointBody` has `centerOfMass` instead of `position`. `sweepCircleCircle`, `sweepCirclePolygon` and `sweepCircleTerrain` take the circle's world center at the start and end of the move (`CircleCollider.getWorldCenter`), not its entity's position
- **physics:** `raycast`'s fourth argument is now an options object. Replace `raycast(world, start, end, false)` with `raycast(world, start, end, { sort: false })`
- **rendering:** The render system no longer draws sprites, nine-slice regions or text glyphs whose quads are entirely outside a camera's view. Code that disabled sprites only to save drawing them while off screen can be deleted. A material with a custom vertex shader that moves vertices beyond the sprite's quad may be skipped while partly visible
- **rendering:** `createProjectionMatrix` now takes the world-space `Rect` to show, such as `getCameraView(...).bounds`, instead of `(width, height, cameraPosition, zoom, pixelsPerUnit)`
- **ui:** A `'screenPixels'`-unit size or margin, and `UiSafeAreaEcsComponent` insets, now follow the canvas camera's `zoom`, so they keep their on-screen size on a world-space canvas whose camera zooms. A screen-space canvas's root rect now fills its camera's view, so it follows a moved or zoomed UI camera
- **rendering:** Render targets can be canvas-sized. `createRenderTarget(renderContext, size, format?)` takes the render context instead of `gl`, and a `size` that's either `'canvas'` or a fixed `{ width, height }`. A canvas-sized target is resized by `RenderContext.resize` along with the canvas, so a camera's target always matches it: replace `createRenderTarget(renderContext.gl, renderContext.width, renderContext.height)` with `createRenderTarget(renderContext, 'canvas')` and delete any code that resized camera targets to follow the canvas. `RenderTarget.resize` throws for a canvas-sized target. `RenderTarget`'s `swapBuffers()`, `resize(width, height)` and `dispose()` no longer take `gl`, and `width`/`height` are read-only. `PingPongTarget` changes the same way: `new PingPongTarget(renderContext, size, format?)`, `resize(width, height)` and `dispose()`. The render context keeps a reference to each canvas-sized target until it's disposed, so `dispose()` targets you stop using. Screen-space UI canvases now render into a canvas-sized target, and `createUiLayoutEcsSystem` no longer resizes their camera's target. `RenderContext.maxPixelRatio` can be set at runtime, for example from a graphics quality setting: it re-applies the last resize at the new cap (or is stored for the next resize while the canvas has no size), so remove any cast you used to write it and the `resize` call that followed. `RenderContext`'s `width`, `height`, `cssWidth`, `cssHeight` and `pixelRatio` are now read-only, changed only by `resize`
- **text:** `FontAtlasCache.getOrLoad` takes the URL of both atlas files, `getOrLoad({ metricsUrl, imageUrl })`, instead of finding the image next to the JSON, so atlases imported through Vite, webpack or another bundler that renames files now load. Pass the URLs your bundler gives you for the `.json` and `.png` (with Vite, `import metricsUrl from './my-font.json?url'` and `import imageUrl from './my-font.png'`), and look loaded atlases up with `get(metricsUrl)`. `getOrLoad` rejects if the image's size doesn't match the JSON's `atlasSize`, or if one `metricsUrl` is requested with two different image URLs. Concurrent calls for the same atlas now share one load. `FontAtlasCache` no longer implements `AssetCache` and its `load` method and `assets` map are no longer public; call `getOrLoad` instead. `FontAtlasData` and `FontAtlasFileData` no longer have an `atlasImage` field and `forge-generate-font-atlas` no longer writes one; existing JSON files that have it still load
- **input:** Input actions now read their sources' current state instead of holding whatever a source last sent them. An axis keeps a held key's, stick's or cursor's value every frame, so `actionResetTypes`, `ActionResetType` and the axes' third constructor argument are removed: delete `actionResetTypes.noReset` arguments, and an axis that used the default reset now holds its value while its key or stick is held. Mouse wheel input still lasts one frame, because the mouse source withdraws it; a frame's wheel events are now summed instead of the last one winning. When two sources drive one axis, the one pushed furthest wins, so an idle gamepad no longer overrides a held key and releasing one source leaves the other's input; a hold stays held while any source holds it. Switching groups no longer carries a held button over: a hold, or an up-moment trigger, only responds to a press made while its group is active, so delete code that ended a hold by hand after `setActiveGroup` (axes still pick up keys held through the switch). Actions are now read-only: `set`, `startHold`, `endHold`, `trigger` and `reset` are removed and `name`/`inputGroup` are `readonly`; drive actions through a source in tests. Custom input sources report through `InputManager.setAxis1dInput`, `setAxis2dInput`, `setHoldInput`, `setTriggerInput` (taking the new `TriggerInputBinding`) and `removeSourceInput` instead of the removed `dispatch*Action` methods, and reporting for an action that wasn't added to the manager throws, so remove an action's bindings before removing it from the manager. Every source's `stop()` now releases what it held
- **ui:** `resolveCanvasPointerPosition` takes the pointer's viewport position (CSS pixels, Y-down) as its last argument instead of a `UiPointerSource`. Pass `pointerSource.position`
- **rendering:** Bloom, Gaussian blur and tone mapping no longer copy their result back into the camera's render target, saving one full-screen draw per effect per frame and a full-resolution scratch buffer each. A `RenderTarget` now has two color buffers: the new `beginPostProcessPass(renderContext, target)` makes the other one current, binds and clears it, and returns the texture holding the target's contents, so a custom screen effect is that call plus `drawFullscreenQuad` with a material that samples the returned texture (see "Writing a post-processing effect" in the Multipass Rendering guide). Delete your effect's scratch target, copy material and copy-back draw. `RenderTarget.colorTexture` and `RenderTarget.framebuffer` are now read-only getters that change whenever a post-processing pass runs on the target, so read them when you draw instead of keeping them from setup. Bloom with `passes: 0` now draws nothing, like the blur, instead of adding its unblurred highlights; set `passes` to `0` to turn bloom off without changing `intensity`
- **rendering:** GPU resources take the render context, so they can be rebuilt after a lost WebGL context: `new Texture(gl, options)` becomes `new Texture(renderContext, options)` (prefer `createTexture`), and `Geometry` is created from vertex data it keeps, `new Geometry(renderContext, [{ name, data, size }])`, instead of buffers you made and `addAttribute` (which is removed, with its `type`, `normalized`, `stride`, `offset` and `divisor` options). `geometry.bind(gl, program)` becomes `geometry.bind(material)`, `geometry.dispose(gl)` becomes `geometry.dispose()` (it now frees its buffers too), and `createQuadGeometry(gl)` becomes `createQuadGeometry(renderContext)`; draw sprites and full-screen passes from the render context's own `renderContext.quadGeometry`. `resolveRenderTargetFormat(gl, format)` becomes `resolveRenderTargetFormat(renderContext, format)`, reading the new `renderContext.supportsHdrRenderTargets` (the render context requests `EXT_color_buffer_float` when it's created). `renderContext.instanceBuffer` is read-only and recreated on restore, so read it when drawing. `Texture.glTexture`, `RenderTarget.framebuffer` and `ShaderProgram.program` are `null` for a resource created while the context is lost, until it's restored; `ShaderProgram` takes the render context instead of `gl` and a black-texture callback, and `Material.program` throws until the program is linked
- **ui:** A progress bar's and a slider's fill now covers the whole track and is revealed by a `MaskEcsComponent` whose `amount` `createUiProgressBarEcsSystem`/`createUiSliderEcsSystem` set from the value, instead of being resized. A nine-slice fill no longer squashes its end caps at low values, and children of the fill (a label) are revealed with it. If you build a progress bar or slider by hand, give its `fill` entity a full-size rect and a linear or radial mask (`addMaskComponent`); the systems throw for a fill without one. Remove any minimum width or hide-at-zero code you added to keep a fill's caps from squashing
- **rendering:** Every sprite fragment shader must apply masks: include `spriteMask` (`#pragma forge include(spriteMask)`) and multiply the output alpha by `spriteMaskCoverage()`. `createSpriteMaterial` throws for a fragment shader that doesn't

#### Removed

- **rendering:** `Renderable`, `InstanceDataSegment`, `combineInstanceDataSegments`, `spriteInstanceDataSegment`, `setupInstanceAttribute`, `createTextureFromImage`, `createEmptyTexture`, `getSharedBlackTexture`, `getSharedWhiteTexture`, `bindTextureToUniform`, `createProgram` and `createShader` are no longer exported. Use `createTexture`, `renderContext.whiteTexture`/`blackTexture`, `createSpriteMaterial` and `Material` instead. The text module's `createTextRenderable`, `textEffectsInstanceDataSegment` and `textEmboldenInstanceDataSegment` are removed too
- **physics:** `AabbEcsComponent`, `aabbId` and `addAabbComponent`. A collider no longer needs a separate AABB component to take part in collision detection or raycasts: the broad phase writes its bounds to the collider's new `aabb` field. Delete your `addAabbComponent` calls, and read `collider.aabb` where you read the AABB component
- **rendering:** `calculateVisibleWorldSize`, `calculatePixelsPerUnit`, `screenToWorldSpace`, `worldToScreenSpace` and `canvasToWorldSpace` are removed; use the camera's view instead. `calculateVisibleWorldSize(width, height, verticalWorldUnits)` becomes `getCameraView(world, camera, renderContext).size`, which also accounts for zoom; `screenToWorldSpace(pointer, ...)` becomes `view.viewportToWorld(pointer)`; `worldToScreenSpace(...)` becomes `view.worldToViewport(position)`, which unlike the old function flips Y to the Y-down viewport; `calculatePixelsPerUnit(...)` becomes `view.pixelsPerUnit`. Constants that mirrored a camera's `verticalWorldUnits` for these calls can be deleted
- **rendering:** `CameraEcsComponent.scissorRect`, which nothing read, is removed
- **audio:** `AudioEcsComponent`, `audioId`, `addAudioComponent` and `createAudioEcsSystem`, along with the Howler.js peer dependency, so you can uninstall `howler` and `@types/howler`. Create one mixer with `createSoundMixer()` and buses for your volume settings, load sounds with `new SoundAssetCache(mixer).getOrLoad(url)` instead of creating `Howl`s, replace `playSound: true` one-shots with `playSound(bus, sound, options)`, and replace sounds that belong to an entity (music, loops) with `addSoundComponent(world, entity, { sound, bus, loop })` and `createSoundEcsSystem()`. Removing an entity now stops its sound, so drop any code that stopped or unloaded sounds before removing entities
- **rendering:** `SpriteEcsComponent.enabled` and `TextEcsComponent.enabled` are removed. Hide an entity with `addVisibilityComponent(world, entity, { visible: false })` and show it again by setting `visible`, which also hides its children and takes it out of UI layout and input; a part that needs hiding on its own goes on its own child entity. `createToggle`'s checkmark, `createTextInput`'s caret, selection, composition underline and placeholder, `createDropdown`'s option list and `createTooltip`'s panel now carry a `VisibilityEcsComponent` instead of switching `enabled`. `createDropdown` parents its option rows to a new `list` entity (returned on `Dropdown`), hidden while closed, and no longer turns the rows' `interactable`/`blocksRaycasts` off; its `interactable` option now applies to the rows too. `TooltipEcsComponent.label` is removed: the tooltip system shows and hides `panel`, whose `VisibilityEcsComponent` it requires, and the label inherits it

#### Fixed

- **ui:** The UI raycast skips the part of an element that a rect `MaskEcsComponent` on it or an ancestor clips away, so masked-out content can't be clicked or hovered
- **physics:** The package's root entry point (`@forge-game-engine/forge`) now exports the physics module, as it does every other module, so physics appears in the API reference. Imports from `@forge-game-engine/forge/physics` are unchanged
- **rendering:** `addSpriteComponent` copies the `pivot`, `uvOffset`, `uvScale` and `slices` it's given, so sprites built from one options object (such as one `createImageSprite` result) no longer share them. Two explosions from one template used to show whichever animation frame was written last, and one UI element's layout could move another's pivot. You no longer need to clone those vectors by hand before adding a sprite
- **input:** `KeyboardInputSource` ignores keys typed into an editable element (`<input>`, `<textarea>`, `<select>`, `contentEditable`, including inside a shadow root): they don't count as held and don't dispatch bindings, and a release of a key it never saw go down is ignored. Typing into an HTML form next to the game no longer moves the player, while a key held before typing started is still released. `KeyboardInputSource` no longer implements `Resettable` (its `reset()` only cleared unused state), so remove any `inputManager.addResettable(keyboardInputSource)` call
- **rendering:** `Material.setUniform` (and `setColorUniform`/`setVectorUniform`) accepts every uniform its shaders declare, including one the GLSL compiler removed because nothing reads it. Which uniforms a compiler removes depends on the GPU and driver, so a game could throw on some phones (for example when a `mediump` hash folded to zero there and took the only reader of `u_time` with it) and run fine everywhere else. A removed uniform's value is checked against its declared type and size and stored, and simply has nothing to upload. Setting a name neither shader declares still throws, now with `Uniform "<name>" is not declared in material "<vertex>" + "<fragment>". Declared uniforms: ...`. A uniform array's size must be an integer literal, a `#define` or a `const int`, and a uniform declared twice must use the same type and size in both places, or creating the `Material` throws. New export: `parseUniformDeclarations`, and `ForgeShaderSource.uniformDeclarations` returns a shader's declared uniforms

## [0.25.8] - 2026-10-03

#### Fixed

- **text:** Tracked text no longer runs its words together. Since 0.25.7, `letterSpacing` was left out of the gap between words, so a word gap was barely wider than a letter gap and "FLY AGAIN" read as one word. Each word gap now gets one letter space on top of the whitespace, as before 0.25.7, while a line's last letter still gets none, so centered and right-aligned text stay exact. If you widened your font's space glyph to work around this, remove that

## [0.25.7] - 2026-10-03

#### Added

- **utilities:** `createGame` takes an optional second `options` argument whose `renderContext` field is forwarded to `createRenderContext`, so a game set up with `createGame` can cap its render resolution, e.g. `createGame('game', { renderContext: { maxPixelRatio: 1.5 } })`
- **particles:** Particles can now fade out, slow down, move with the world and spawn in shapes. New `ParticleEmitter` options: `lifetimeOpacity` (fades each particle's sprite, applied by the new `createParticleOpacityEcsSystem`), `acceleration` (for gravity or drift), `drag` (the share of speed kept per second), `getVelocityOffset` (an extra velocity read every frame, for motion that follows game state), `spawnShape` (`point`, `circle`, `ring` or `box`) with `emitOutward` to aim particles away from its center, `emissionRate` (a steady stream of particles per second, no `emit()` calls needed) and `onParticleSpawned` (to add your own components to each particle)
- **particles:** `emitParticleBurst(world, emitter, position, random, { count })` spawns a one-off burst at any world position without an emitter entity, for example where a pickup was just collected

#### Changed

- **physics:** `createEulerIntegrationEcsSystem` now integrates velocity into a body's `position.local`/`rotation.local` instead of `world`, so `createTransformEcsSystem` is the only system that writes `world` and physics no longer fights it. That means a physics game can use the UI, particles or parented sprites, which all need the transform system. Register `createTransformEcsSystem()` once, after your own systems and `registerUiSystems` and before the physics and render systems, since physics reads `world`. Move or teleport anything by writing `local`, never `world`. A dynamic or kinematic body with a `ParentEcsComponent` now throws, since its velocity is in world space; connect bodies with joints or springs instead
- **common:** `addPositionComponent`, `addRotationComponent` and `addScaleComponent` no longer accept a `world` option, since `world` is output written by `createTransformEcsSystem`. Pass the value as `local` instead. A new component's `world` now starts as a copy of `local` rather than zero (or one, for scale), so an entity created mid-frame isn't at the origin until the next transform pass. `PositionDefaultedOptions` is replaced by `PositionOptions`, and `RotationOptions`/`ScaleOptions` are new
- **particles:** Particles spawn at their picked scale instead of 1
- **particles:** Particles spawn around the world position of the entity their emitter is on (or the world origin), within `spawnShape`. The `spawnPosition` option is removed; move the emitter entity instead
- **particles:** `new ParticleEmitter(sprite, options)` no longer takes a `renderLayer` argument, which was never used. Drop the second argument and set the sprite's `layer` instead, since particles are drawn on it. `sprite` can now be a `SpriteEcsComponent` or a `Sprite`
- **particles:** A particle's direction of travel now comes from the new `directionRange` option (0 degrees is up, clockwise), and `rotationRange` only sets the initial rotation of its sprite, defaulting to `{ min: 0, max: 0 }`. Rename `rotationRange` to `directionRange` where it aimed particles, and add `rotationRange: { min: 0, max: 360 }` if you also want randomly turned sprites. `ParticleEcsComponent` now holds `velocity`, `acceleration`, `drag`, `rotationSpeed`, `startOpacity`, `endOpacity` and `getVelocityOffset`, and particles no longer get a `SpeedEcsComponent`, so code that read a particle's speed should read `Vec2.magnitude(particle.velocity)` instead
- **input:** Gamepad stick Y axes (`gamepadAxes.leftStickY`/`rightStickY`) now read pushing up as positive, matching the keyboard, the D-pad's north button and world space, so a stick and a D-pad bound to the same action agree out of the box. `GamepadAxis1dBinding`'s `inverted` option and `GamepadAxis2dBinding`'s `invertX`/`invertY` options are removed: delete `inverted: true`/`invertY: true` from your stick bindings, and if you relied on the old down-is-positive reading or want inverted look controls, negate the action's value in game code

#### Removed

- **ui:** `UiWorldSpaceFollowEcsComponent`, `addUiWorldSpaceFollowComponent`, `uiWorldSpaceFollowId` and `createUiWorldSpaceFollowEcsSystem` are removed. The follow system wrote a world-space canvas's position alongside the layout system and trailed its target by a frame. To keep a health bar upright above its target, write the canvas's `RectTransformEcsComponent.anchoredPosition` from the target's position in your own system, registered before `registerUiSystems`, or parent the canvas with `addParentComponent` if it should rotate with its target

#### Fixed

- **common:** `createTransformEcsSystem` no longer makes a root entity's `scale.world` the same object as its `scale.local`. Once such an entity got a parent, its local scale was overwritten with the composed world scale and compounded every frame
- **particles:** Particles from an emitter given a `Sprite` (for example from `createSprite`) now render. They used to be skipped, because a `Sprite` has no `enabled` field
- **particles:** Each particle now gets its own copy of the emitter's sprite, so changing one particle's `tintColor` or `opacityMultiplier` no longer changes every particle from that emitter
- **particles:** Particles moving at 0 degrees now travel up the screen, as documented. They used to travel down
- **particles:** `lifetimeScaleReduction` now scales particles to their spawned scale times `lifetimeScaleReduction`, as documented. It used to scale them to `lifetimeScaleReduction` itself, whatever their spawned scale
- **text:** `letterSpacing` is no longer added after a word's last letter, so it only goes between letters. Centered text with letter spacing used to sit half a letter space left of center, and right-aligned text a full letter space short of its right edge. `letterSpacing` stays in ems (multiplied by `size`); its docs wrongly said world units. Text with letter spacing is now one letter space narrower per word, so remove any offset you added to compensate
- **rendering:** Gaussian blur and bloom are now sized in CSS pixels instead of render target (device) pixels, so the same `passes`, `threshold` and `intensity` look the same at every display pixel ratio. Since 0.25.6, a high-DPI display made the blur and the bloom halo spread less far on screen, and made bloom much brighter close to small bright sprites. Looks at a pixel ratio of 1 are unchanged. On a high-DPI display the Gaussian blur now runs at CSS-pixel resolution, which also makes it cheaper there
- **rendering:** Bloom's glow now only adds light to whatever is presented beneath its camera's render target, such as a background camera's layer. It used to give the halo partial opacity of its own, so the glow covered part of the layer behind it and dimmed colors the glow lacks (a yellow glow over a blue background reduced the blue)

## [0.25.6] - 2026-10-03

#### Added

- **rendering:** `RenderContext` gains `pixelRatio`, `cssWidth`/`cssHeight` (the canvas's on-page size in CSS pixels) and a `maxPixelRatio` option (also on `createRenderContext`) to cap the pixel ratio for fill-rate-heavy games. `getDevicePixelRatio()` reads the browser's current `window.devicePixelRatio`
- **rendering:** `Material.setUniform` accepts a `Uint32Array` for `uint`/`uvecN` uniforms, and a uniform array can now be set by its declared name (`u_waves`) as well as the `u_waves[0]` name WebGL reports for it
- **input:** `GamepadInputSource` now supports every action type, not just `Axis1dAction`. New `GamepadTriggerBinding` (fires once on a button's press or release, picked with `buttonMoments`), `GamepadHoldBinding` (held while a button is pressed) and `GamepadAxis2dBinding` (from a stick's X and Y axes, or four buttons such as the D-pad) go in the source's new `triggerBindings`, `holdBindings` and `axis2dBindings` sets. Like its axis-1d bindings, hold and axis-2d bindings that target the same action are combined, and only dispatch when the gamepad's own value changes, so they don't override the keyboard or mouse on a shared action
- **input:** `GamepadAxis1dBinding`'s stick form takes a new `inverted` option, and `GamepadAxis2dBinding`'s stick form takes `invertX`/`invertY`. The W3C Standard Gamepad reports a stick pushed up as `-1`, so invert a stick's Y axis to drive an up-is-positive action shared with `KeyboardAxis1dBinding(action, keyCodes.w, keyCodes.s)` or a D-pad binding

#### Changed

- **rendering:** `RenderContext.width`/`height` are now the drawing buffer's size in device pixels, which is larger than the canvas's CSS size on a high-DPI display. Anything that converts a mouse position (CSS pixels) to world space, such as a `screenToWorldSpace` call, should now pass `renderContext.cssWidth`/`cssHeight` and a `pixelsPerUnit` computed from `cssHeight`. Render targets and shader resolution uniforms should keep using `width`/`height`
- **rendering:** `RenderContext.resize(width, height, devicePixelRatio?)` now takes the canvas's CSS size and sizes the drawing buffer at that times the device pixel ratio (defaulting to the current `window.devicePixelRatio`, capped at `maxPixelRatio`). It does nothing when the size wouldn't change. `Resizable.resize` takes the same `devicePixelRatio` argument
- **text:** `buildTextCameraCommands` takes the text query result (`entities` plus the text, text mesh and position component arrays) as one argument instead of four, followed by an optional `pixelRatio`. `pushTextRenderCommands` also takes an optional trailing `pixelRatio`
- **rendering:** `Material.setUniform` now throws when a value doesn't fit the uniform's declared GLSL type, naming the declared type, the values it accepts and the value received. Previously a mismatched value was stored and then dropped or mis-uploaded silently when the material was bound
- **input:** `InputManager.setActiveGroup` now hands input over between groups. The group being deactivated is released: its `Axis1dAction`s and `Axis2dAction`s are set to `0` and its held `HoldAction`s end. The group being activated picks up whatever is held right now: each `actionResetTypes.noReset` axis gets the latest value dispatched to it while its group was inactive (or the value it had when its group was last deactivated), and each `HoldAction` whose key or button is still down starts. Calling it with the group that is already active does nothing. Only actions added to the `InputManager` are released on deactivation
- **input:** `Axis1dAction.set` now clamps its value to `[-1, 1]`, the range its docs already described
- **input:** `MouseAxis1dBinding` and `MouseAxis2dBinding` now dispatch through the `InputManager`, so like every other binding they only reach actions in the active input group
- **input:** Add `Axis1dAction.actionResetType` and `Axis2dAction.actionResetType`, exposing the reset type each action was created with

#### Fixed

- **rendering:** The canvas now renders at the display's native resolution on displays scaled above 100% (most laptops and every HiDPI/Retina screen) and in browser-zoomed pages, instead of rendering at CSS resolution and being upscaled (and blurred) by the browser. `createContainerResizeSync` (wired up by `createGame`) also re-sizes the canvas when the device pixel ratio changes, such as when the page is zoomed or the window moves to a monitor with a different scale factor
- **rendering:** Built-in systems that work in CSS pixels keep their physical size and stay accurate at a pixel ratio above 1: UI pointer hit-testing and sliders, safe-area insets, `constantPixelSize` UI canvases, `'screenPixels'` UI sizes, and text outline/shadow widths
- **input:** Switching input groups no longer leaves a keyboard-driven axis stuck or reversed. A key released while its axis's group was inactive used to leave the axis at `1` with nothing held, and a key pressed while it was inactive and released after drove it to `-1`, because `KeyboardAxis1dBinding`/`KeyboardAxis2dBinding` added to and subtracted from the action's current value. The keyboard now sets each axis from the keys held, summing every binding on the source for that action and clamping to `[-1, 1]`, so binding both WASD and the arrow keys to one action no longer reaches `2` when both are held, a key-up for a key pressed before the page had focus no longer moves the axis, and releasing a key bound to an `actionResetTypes.zero` axis no longer produces a one-frame impulse in the opposite direction
- **input:** A gamepad stick held still across an input-group switch is now applied once its group becomes active, instead of the action staying at its old value until the stick moves
- **input:** `InputManager.dispatchHoldEndAction` no longer raises `holdEndEvent` for a hold that never started, such as a key pressed while the action's group was inactive
- **rendering:** A nine-sliced sprite's omitted `nativeWidth`/`nativeHeight` now default to the sprite's size when it's created by `createImageSprite` (the imported texture's world size) or attached by `addSpriteComponent`, instead of to its current size every frame. Previously, resizing a sliced sprite - which the UI layout system does to every `createPanel`/`createButton`/etc. element each frame - made its border insets map to a tiny sliver of the texture, smearing a texel or two across each corner. Pass `nativeWidth`/`nativeHeight` explicitly only when the insets aren't in the same units as the sprite's imported size
- **physics:** A collider entity with no `RotationEcsComponent` now takes part in collision detection and raycasting, treated as unrotated (a rotation of `0`). Previously `createBroadPhaseEcsSystem`, `createNarrowPhaseEcsSystem` and `raycast` all required the component, so a static wall or trigger volume without one was silently skipped and never produced a collision pair, manifold or raycast hit
- **rendering:** Translucent sprites and text drawn by a camera with a `renderTarget` now reach the screen at the opacity they were drawn with. The render target used to store each pixel's alpha squared, and presenting it then applied that alpha again, so a 50% sprite came out at a quarter of its intended opacity or less, and a 35% one was all but invisible. This affected every screen-space UI canvas (`createUiCanvas` always renders through its own render target), as well as any camera rendering into a target for post-processing. Render targets and the canvas now consistently hold premultiplied alpha, and `createPresentEcsSystem` blends layers with `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)` to match. If you raised alphas or tints to compensate, set them back to the values you actually intended
- **rendering:** Translucent sprites drawn straight onto the canvas no longer leave the canvas itself partially transparent, which let the web page behind it show through them. A translucent `clearColor` is now also applied correctly, since `RenderContext.clear` premultiplies it
- **rendering:** `createPresentEcsSystem` no longer erases cameras that render straight to the canvas. Whenever any camera had a `renderTarget` (a screen-space UI canvas's camera included), the present pass cleared the canvas before drawing the lowest render target, wiping out a world camera without a target of its own. A canvas camera's output is now kept, and every presented render target is blended on top of it
- **input:** Unplugging a gamepad no longer leaves the actions it was driving stuck. `GamepadInputSource` now handles `gamepaddisconnected` (and a gamepad that disappears from `navigator.getGamepads()` without one): it sets every axis it last set to a non-zero value back to `0`, and ends every hold it started. A source constructed with `gamepadIndex` `-1` then falls back to another connected gamepad, if there is one
- **rendering:** `Material` now chooses each uniform's upload from its declared GLSL type instead of the value's length. A 16-float `Float32Array` on a `vec4[4]` or `float[16]` uniform is no longer uploaded as a `mat4` (a GL error that left the uniform unset), `Float32Array`s of any valid length (such as a `float`, `mat2`, `mat3x2` or a uniform array) are uploaded instead of ignored, numbers set on `int`/`uint` uniforms use the integer upload, and a texture set on a `samplerCube`, `sampler3D` or `sampler2DArray` is bound to that sampler's texture target

## [0.25.5] - 2026-09-19

#### Changed

- **physics:** `TerrainCollider` now models its heightmap as a continuous chain of surface edges (`surface`, replacing `segments`) rather than a row of closed quadrilaterals, following the same design as a Box2D chain shape. Narrow-phase collision runs against that chain only, so a contact normal always comes from the ground's actual surface and never from an interior boundary between two neighboring stretches of it. The solid slab is still what `computeAabb` and `raycastTerrain` see, so broad-phase culling and raycasting are unchanged. A `TerrainCollider` is now one-sided: a body underneath the terrain is pushed back up through its surface instead of out of its bottom, and one that has passed entirely out of the bottom of the slab stops colliding
- **physics:** `detectCollision` now returns an array of manifolds instead of a single manifold or `null`, as do `detectCircleTerrainCollision` and `detectPolygonTerrainCollision`. A body wide enough to straddle several of a `TerrainCollider`'s surface edges gets one manifold per edge it touches, each carrying its own feature ids, so every contact warm-starts independently across ticks instead of a single contact changing hands between edges. `createNarrowPhaseEcsSystem` writes them all into `collisionManifolds`, so a single entity pair can now contribute more than one manifold per tick
- **physics:** Add `NarrowPhaseManifold` (a `CollisionManifold` without its entity ids) and `clipAgainstReferenceFace` (the reference/incident face clipping stage `detectPolygonFacesCollision` already used internally) to the public API

#### Fixed

- **physics:** A body resting on or rolling across a `TerrainCollider` can no longer be pushed sideways along the ground it is resting on. Closing each stretch of ground off into its own quadrilateral gave the boundary between two neighboring stretches a face of its own to collide with, and for a body wide enough to reach past the ground beneath it that face could beat every real surface face on penetration depth - producing a fully horizontal contact normal on gently rolling ground

## [0.25.4] - 2026-09-18

#### Changed

- **rendering:** `createTerrainRenderEcsSystem` no longer takes a `TerrainMesh` parameter; it now draws every entity with a new `TerrainMeshEcsComponent` (attached via `addTerrainMeshComponent`), so a world can have any number of independently culling-masked terrain meshes instead of exactly one baked into the system at creation. It also manages `RenderContext.clearStrategy` itself whenever a terrain mesh is present, so callers no longer need to set `clearStrategy = CLEAR_STRATEGY.none` by hand to avoid the sprite pipeline wiping the terrain mesh each frame

#### Fixed

- **physics:** `TerrainCollider` narrow-phase (`detectCircleTerrainCollision`/`detectPolygonTerrainCollision`) no longer flips which terrain segment "wins" on sub-pixel floating-point noise when a body rests across several near-coplanar segments at once. The unstable selection used to reset `createCollisionResolutionEcsSystem`'s warm-started accumulated impulse every time it flipped, preventing the contact from ever fully converging and causing visible steady-state sinking under moderate-to-heavy loads

## [0.25.3] - 2026-09-17

#### Added

- **common:** Add the `Resizable` interface (`width`, `height`, `resize(width, height)`), implemented by `RenderContext`
- **utilities:** Add `createContainerResizeSync(container, resizables)`, watching a container element and calling `resize()` on every `Resizable` (e.g. a `RenderContext`) whenever its size changes - the container-resize handling that used to live inside `Game`, now a standalone utility with its own independent lifecycle
- **rendering:** Add `importTexture`, a simple texture import pipeline that converts a texture's pixel dimensions into a world-unit size via a `pixelsPerUnit` setting (mirroring a per-texture "Pixels Per Unit" import setting)

#### Changed

- **utilities:** `Game`'s constructor now takes an array of `EcsWorld`s instead of a single one, so one `Game` can drive more than one world, e.g. a gameplay world alongside a separate UI overlay world. `Game` is now a simple loop orchestrator with no notion of rendering or resizing at all: it no longer accepts a `RenderContext`/`Resizable`, or does any `ResizeObserver` wiring - that responsibility moved to the new `createContainerResizeSync`. `createGame` is unaffected externally and still returns a single `world`/`renderContext` pair (now passed to `Game` as a one-element array), plus a new `resizeSync` keeping the render context's canvas sized to its container
- **rendering:** `createImageSprite` now sizes a sprite via `importTexture`, using its own `pixelsPerUnit` option (default `100`) instead of using the texture's pixel dimensions directly as world units. This is a behavior change: pass `pixelsPerUnit: 1` to keep a sprite's previous size

## [0.25.2] - 2026-09-15

_No user-facing changes._

## [0.25.1] - 2026-09-14

#### Added

- **docs:** The documentation site's homepage hero now plays a looping, blurred background video

#### Fixed

- **utilities:** `Game` now resizes its `RenderContext` to match its container whenever the container's size changes (via a `ResizeObserver`, started on `run()` and stopped on `stop()`), so a running game's canvas, camera projection, and UI layout follow a resized window/container instead of staying pinned to whatever size the container was when the game started. `createGame` wires this up automatically. The actual resize is deferred to the next animation frame rather than done synchronously in the `ResizeObserver` callback, since mutating the canvas's size directly in response to a resize notification is what triggers the browser's "ResizeObserver loop completed with undelivered notifications" error
- **demos:** Fix the space shooter demo leaving bare canvas past the background's edges (and its bloom/blur post-processing staying at a stale resolution) after a resize, now that resizing actually reaches the demo - the background's world size and its shader's `u_resolution` uniform are recalculated whenever the render context resizes, and the demo's background/foreground `RenderTarget`s resize along with it. The documentation site's demo fullscreen toggle also no longer tears down and recreates the whole game to pick up the container's new size, since `Game` now resizes in place
- **demos:** Fix the UI Main Menu demo's left nav panel keeping a fixed on-screen pixel width instead of scaling with the rest of the screen, now that resizing actually reaches the demo - it now uses a plain reference-pixel width like every other element in the demo, so it keeps the same proportion of the screen at any window size

## [0.25.0] - 2026-09-13

#### Added

- **text:** Add `@forge-game-engine/forge/text`'s font atlas pipeline (Phase 1 of MSDF text rendering, no rendering yet): `npm run generate-font-atlas` turns a `.ttf`/`.otf` font into a multi-channel signed distance field (MSDF) atlas PNG plus a versioned `FontAtlasData` JSON, and `FontAtlasCache` loads that pair into a `FontAtlas` at runtime
- **text:** Add static single-line text rendering (Phase 2 of MSDF text rendering): `addTextComponent`/`TextEcsComponent` (string, `FontAtlas`, size, color, letter spacing, layer) is shaped by `createTextShapingEcsSystem` into a cached `TextMeshEcsComponent` (kerned glyph quads + bounds), drawn through `createRenderEcsSystem` via the same instanced sprite batching nine-slice sprites use, with a new MSDF fragment shader that stays crisp at any scale
- **text:** Add multi-line layout (Phase 3 of MSDF text rendering): `TextEcsComponent.maxWidth` greedily word-wraps text across multiple lines, `horizontalAlign` (`'left'` | `'center'` | `'right'` | `'justify'`) and `verticalAlign` (`'top'` | `'middle'` | `'bottom'`) position lines within `maxWidth` and the block against the entity's position, and `lineHeight` controls the spacing between line baselines. `center`/`right` align each line against `maxWidth` itself, not just against each other - a single unwrapped line (or any line as wide as the block's own widest line) previously always computed a zero offset, silently no-op'ing `center`/`right` for the single-line case regardless of value
- **text:** Add outline and soft-shadow/glow effects (Phase 4 of MSDF text rendering): `TextEcsComponent.outlineColor`/`outlineWidth` and `shadowColor`/`shadowOffset`/`shadowSoftness`, in screen-pixel-range units so an effect's size stays constant on screen regardless of camera zoom or entity scale. Every glyph's outline/shadow draws in its own pass, always completing before any glyph's fill draws on top of it, so both effects render at the same, uniform strength across a whole word (including tightly-kerned pairs like "rg") and can safely merge with a neighboring glyph's own effect - bridging the gap between letters, like a Photoshop "stroke"/"outer glow" layer effect - without ever painting over any glyph's fill; the only limit on either effect is the font atlas's own encoded `distanceRange` budget, identical for `outlineWidth` and `shadowSoftness`/`shadowOffset` alike - see the new Text Effects doc for the safe range and how it scales with the text's on-screen size
- **text:** Ship a pre-generated default MSDF font atlas (Liberation Sans, SIL OFL 1.1) at `assets/fonts/default/default.json` in the `@forge-game-engine/forge` package (Phase 5 of MSDF text rendering), so `addTextComponent`/`FontAtlasCache` render text with zero font setup - no font file, license, or `forge-generate-font-atlas` run required to get started. The documentation site's text demo now loads this shipped atlas directly and adds an interactive playground (live text, size, alignment, wrap, and outline/glow controls - width, offset, and softness) driven by `createTextShapingEcsSystem`'s existing dirty tracking
- **physics:** Add `raycast(world, start, end, sort?)`, casting a line segment against every entity in an `EcsWorld` with a `ColliderEcsComponent` (`CircleCollider`, `PolygonCollider`, and `TerrainCollider` alike) and returning every intersection as a `RaycastHit` (`entity`, `point`, `normal`, `distance`), ordered by distance from `start` by default
- **physics:** Add `RigidBodyEcsComponent.type` (`'dynamic'` | `'kinematic'` | `'static'`, defaulting to `'dynamic'`), letting a body be moved directly by game code (`'kinematic'`) so it still pushes dynamic bodies on contact without itself being affected by gravity, forces, or impulses - previously only possible implicitly, by giving an entity no `RigidBodyEcsComponent` at all (still supported, and equivalent to `type: 'static'`)
- **utilities:** Add `DirectedAcyclicGraph<T>`, a generic topological-ordering data structure (`addNode`, `addEdge`, `removeNode`, `topologicalSort`) that throws a descriptive error when an edge would create a cycle or reference an unregistered node
- **ecs:** Add `EcsWorld.addSystem`'s `before`/`after` options, letting a system be ordered relative to specific other systems instead of an arbitrary numeric priority, and `EcsWorld.addSystemGroup`/`createSystemGroup`, for ordering whole groups of systems (each with their own `before`/`after`) against each other - see the "Ordering systems with before/after" and "Grouping systems" sections of the ECS World doc
- **ecs:** Add `EcsWorld.getComponentAccessor(componentKey)`, resolving a component's storage once and returning a fast `entity => component | null` accessor, for a system that looks up the same optional component (one it can't add to its own `query` because not every matched entity has it) for many entities in a tight loop instead of calling `getComponent` - which re-resolves `componentKey` on every call - repeatedly
- **input:** Add canvas-space pointer state directly on `MouseInputSource`: `position`, `delta`, `scroll`, `buttonsDown`, `buttonsHeld`, and `buttonsUp`, for code (a UI hit-tester, a drag gesture, a debug overlay) that wants the raw device state without an intervening `InputAction` binding
- **rendering:** Add `SpriteEcsComponent.sortDepth`, an optional per-sprite override for the depth a sprite is sorted by within its `layer`, taking priority over the existing default (`position.world.y`) when set
- **ui:** Add `@forge-game-engine/forge/ui`'s layout core: `RectTransformEcsComponent`/`addRectTransformComponent` and the pure `resolveRect` anchor/pivot/stretch resolver, `UiAnchor` presets (point, edge-stretch, and full-stretch anchors), `CanvasEcsComponent`/`createUiCanvas` (a dedicated, static UI camera with its own transparent-cleared `RenderTarget`, isolated from the world by a caller-supplied `cullingMask` - Forge doesn't reserve or default to any particular render category bit for UI, so pick one your game isn't already using elsewhere and reuse it for every UI visual's own category), `createUiLayoutEcsSystem` (a top-down, hierarchy-pre-order layout resolve that writes `position.local`, sprite `width`/`height`/`pivot`, and `sortDepth` on both sprites and text - so a panel's draw order relative to its own label never depends on where it happens to sit in the world), and `createPanel`/`createLabel` aggregate factories. See the new UI doc and demo for a HUD example
- **ui:** Add interaction: `UiInteractableEcsComponent`/`addUiInteractableComponent` (`onInvoke`, `onPointerEnter`/`onPointerExit`/`onPointerDown`/`onPointerUp`, `onBeginDrag`/`onDrag`/`onEndDrag`, and `isHovered`/`isFocused`/`isPressed`/`isDragging`/`wasInvokedThisFrame` state), `createUiRaycastEcsSystem` (a reverse-hierarchy-order, first-hit-wins pointer hit test, publishing `CanvasEcsComponent.hoveredEntity`/`isPointerOverUi`), `createUiInteractionEcsSystem` (the pointer hover/press/drag state machine, correct even when a pointer enter-and-press or press-and-release land in the same tick), `UiFocusEcsComponent`/`createUiNavigationEcsSystem` (automatic nearest-neighbor gamepad/keyboard focus navigation, with per-side explicit overrides, plus `submitInput`/`cancelInput`), `UiColorTransitionEcsComponent`/`createUiTransitionEcsSystem` (an eased tint per interaction state), the `UiNavigationDirection`/`uiNavigationDirections` map, and the `createButton` aggregate factory. Pointer hit-testing and interaction are driven through the structural `UiPointerSource` interface rather than a hard dependency on `MouseInputSource`, so a touchscreen, stylus, or other pointing device can drive the same systems; `createUiCanvas`'s `pointerSource` option accepts anything satisfying that shape (`MouseInputSource` does, unchanged). Invocation (`onInvoke`) is source-agnostic - the same event fires whether a pointer click or a gamepad/keyboard submit action caused it. See the new UI doc's "Interaction" section and the updated demo for a clickable, focus-navigable button. **Breaking change:** `createUiCanvas` now takes a required `time: Time` argument (`createUiCanvas(world, renderContext, time, options?)`), driving the new color-transition tweens
- **text:** Add `TextEcsComponent.category`, an optional per-entity override for the render category glyphs draw with (matched against a camera's `cullingMask`, the same convention `SpriteEcsComponent`/`Renderable` already use), defaulting to the existing `TEXT_RENDER_CATEGORY` - an ordinary default, not a value the engine reserves or forces onto every text entity
- **text:** Add `TextEcsComponent.sortDepth`, mirroring `SpriteEcsComponent.sortDepth` - an optional per-text override for the depth it's sorted by within its `layer`, taking priority over the existing default (`position.world.y`) when set
- **text:** Add `TextEcsComponent.verticalAlign: 'baseline' | 'capline'`, alongside the existing `'top'`/`'middle'`/`'bottom'`: `'baseline'` anchors the first line's own baseline directly (most useful for single-line text), and `'capline'` is `'top'` anchored to the font's new `capHeight` metric (a capital letter's actual top) instead of its `ascender` (the font's *tallest* glyphs, including ascenders like "b"/"d"/"h" that reach higher than a flat capital) - useful for a title or label set in caps, where anchoring to the taller ascender leaves a visible gap above the text. `FontAtlasData.metrics.capHeight` is measured from whichever flat-top capital (`H`/`I`/`E`/`F`/`L`/`T`) is present in the atlas's charset; `forge-generate-font-atlas` computes it automatically, and the shipped default atlas has been regenerated with it. **Breaking change:** the font atlas file format bumps to `formatVersion: 2` for the new required `capHeight` field - any atlas generated with an older `forge-generate-font-atlas` must be regenerated.
- **text:** Add exported `textHorizontalAlignments`/`TextHorizontalAlign` and `textVerticalAlignments`/`TextVerticalAlign` maps for `TextEcsComponent.horizontalAlign`/`verticalAlign`, matching the existing `uiScaleModes`/`mouseButtons`/`keyCodes` const-map convention, so callers reference `textHorizontalAlignments.center` instead of the raw string literal `'center'`
- **ui:** Add controls: `UiToggleEcsComponent`/`UiToggleGroupEcsComponent`/`createUiToggleEcsSystem`/`createToggle` (checkboxes, and mutually-exclusive radio groups via a shared `UiToggleGroupEcsComponent`), `UiSliderEcsComponent`/`createUiSliderEcsSystem`/`createSlider` (a click-and-drag track with a handle and optional fill, `minValue`/`maxValue`/`wholeNumbers`), `UiProgressBarEcsComponent`/`createUiProgressBarEcsSystem`/`createProgressBar` (a read-only linear fill indicator driven by `value`, with no interaction dependency so a `value` write is reflected the same frame), and `UiDropdownEcsComponent`/`createDropdown` (a header showing the selected option plus a click-to-open list of option rows, each an ordinary `createButton`). See the new UI doc's "Controls" section and the updated demo
- **ui:** Add `UiAnchor.stretchHorizontalLeft`/`stretchTopLeft`, left-pivoted variants of `stretchHorizontal`/`stretchTop` for a `TextEcsComponent` label that needs to stay centered via `horizontalAlign`/`maxWidth` (a center-pivoted anchor's local x = 0 sits at the box's middle, not its left edge, which is what that alignment box is actually measured from). `createUiLayoutEcsSystem` now also keeps a stretch-x-anchored text entity's `maxWidth` in sync with its resolved rect's width every frame, so a label anchored this way centers correctly with no caller-side measurement, even against a dynamically-sized parent (e.g. a title in a full-width top bar) or text that changes later. See the UI doc's updated "Labels" section
- **ui:** Add layout groups: `LayoutElementEcsComponent`/`addLayoutElementComponent` (min/preferred/flexible size overrides, plus `ignoreLayout`), `HorizontalLayoutGroupEcsComponent`/`VerticalLayoutGroupEcsComponent` (`addHorizontalLayoutGroupComponent`/`addVerticalLayoutGroupComponent`) and `GridLayoutGroupEcsComponent`/`addGridLayoutGroupComponent`, all arranged by the new `createUiLayoutGroupEcsSystem` - a two-pass, bottom-up-measure/top-down-arrange system that resizes and positions a group's direct children (nesting freely, including a group measuring another group's own content), plus `ContentSizeFitterEcsComponent`/`addContentSizeFitterComponent` (shrink-wraps an entity to its own measured content) and `AspectRatioFitterEcsComponent`/`addAspectRatioFitterComponent`/`createUiAspectRatioFitterEcsSystem` (`widthControlsHeight`/`heightControlsWidth`/`fitInParent`/`envelopeParent`). `createUiCanvas` registers both new systems automatically, before `createUiLayoutEcsSystem`. See the new UI doc's "Layout groups" section
- **ui:** Add a chevron indicator to `createDropdown`'s header, flipping between `v` (closed) and `^` (open) in step with `dropdown.isOpen` - the bundled default font atlas is ASCII-only, so these stand in for a down/up-pointing triangle. The header's own label now reserves space on the right edge for it, exposed on the returned `Dropdown` as a new `chevron` label entity
- **ui:** Add column-aligned form layout: `LayoutElementEcsComponent.sizeToText` (also settable via `createLabel`'s new `sizeToText` option) sizes a label to its own shaped text instead of a hand-set rect size, and `GridLayoutGroupEcsComponent`'s new `columnWidthMode`/`rowHeightMode: 'fixed' | 'content'` fields derive a column's width (or row's height) from the largest measured cell placed in it, with `cellAlignment` controlling where a smaller cell sits within its shared column/row. Together these let a label/control grid (a settings form, an inspector panel) align every row's control to the widest label automatically, with no hand-computed pixel offsets - `columnWidthMode`/`rowHeightMode: 'content'` requires `constraint: 'fixedColumnCount' | 'fixedRowCount'` and throws for `'flexible'`. See the UI doc's updated "Labels" and "Layout groups" sections
- **ui:** Add `UiAnchor.stretchTopRight`, the right-pivoted mirror of `stretchTopLeft`, for a full-width top-pinned band whose local origin should sit on the right edge (manual position math, a non-text child) rather than the left or center
- **ui:** Add world-space canvas render mode (Phase 5 polish of the UI system design): `CanvasEcsComponent.renderMode`/`createUiCanvas`'s new `renderMode` option (`'screenSpace'` (default) | `'worldSpace'`) puts a canvas's content in the game world instead of overlaid on the screen - diegetic UI like a health bar over an enemy's head or a name tag. A world-space canvas's root rect is an ordinary `RectTransformEcsComponent` (sized via the new `anchor`/`anchoredPosition` options, mirroring `createPanel`) positioned through the normal entity hierarchy rather than the render destination's size, and draws through whichever camera the new `camera` option names - typically the game's own world camera, via `createUiLayoutEcsSystem`, rather than a dedicated UI camera `createUiCanvas` creates for `'screenSpace'` mode. Also adds `UiWorldSpaceFollowEcsComponent`/`addUiWorldSpaceFollowComponent` and `createUiWorldSpaceFollowEcsSystem` (registered by the caller, once, after `createTransformEcsSystem` - unlike the rest of the UI pipeline): a world-space canvas that follows `target`'s world *position* only, never its rotation, so a health bar stays upright above its target instead of swinging around as the target turns - deliberately a separate mechanism from `addParentComponent`, whose meaning (inherit the full world transform) stays exactly as it already was for every other entity in the engine. See the UI doc's new "World-space canvases" section. **Breaking change:** `createUiCanvas`'s options (`CreateUiCanvasOptions`) and `CanvasEcsComponent` are now discriminated unions on `renderMode`, replacing `CreateUiCanvasRequiredOptions`/`CreateUiCanvasDefaultedOptions` - `ScreenSpaceUiCanvasOptions` requires `cullingMask` and allows `referenceResolution`/`scaleMode`/`layer`, `WorldSpaceUiCanvasOptions` requires `camera` and allows `anchor`/`anchoredPosition`, and passing the wrong combination for a given `renderMode` is now a compile-time type error instead of a thrown Error
- **ui:** Add `CanvasGroupEcsComponent`/`addCanvasGroupComponent` (Phase 5 polish of the UI system design): `alpha`/`interactable`/`blocksRaycasts` apply to a whole subtree at once - fading, disabling, or making click-through an entire panel/modal with one component instead of one per element. `alpha` multiplies into every descendant's rendered opacity via the new `createUiCanvasGroupEcsSystem` (registered automatically by `createUiCanvas`), on top of - not instead of - each element's own tint/color alpha; `interactable`/`blocksRaycasts` combine the same way but are read on demand by the raycast/interaction/navigation systems. Nested groups multiply/AND together up the parent chain; `ignoreParentGroups` opts a subtree out of inheriting from its ancestors. See the UI doc's new "Canvas groups" section
- **rendering:** Add `SpriteEcsComponent.opacityMultiplier`, an optional additional multiplier applied to `tintColor.a` when computing a sprite's final rendered alpha - kept separate from `tintColor.a` itself so a system (e.g. the new `CanvasGroupEcsComponent`) can apply an environment-wide fade without overwriting, and later needing to restore, whatever alpha a caller authored on `tintColor`
- **text:** Add `TextEcsComponent.opacityMultiplier`, mirroring `SpriteEcsComponent.opacityMultiplier` for a text entity's fill - its outline/shadow effects don't currently inherit it
- **ui:** Add tooltips (Phase 5 polish of the UI system design): `createTooltip` attaches a floating panel/label to an already-interactable entity, parented directly to it and pinned just above its top edge so it follows automatically as an ordinary UI child; `TooltipEcsComponent`/`createUiTooltipEcsSystem` (registered automatically by `createUiCanvas`) show it once the source reads `hover`/`pressed` under `deriveUiInteractionVisualState` - hovered by pointer or focused by gamepad/keyboard - continuously for at least `showDelayMilliseconds` (defaults to `400`), hiding it immediately once that ends. See the UI doc's new "Tooltips" section
- **ui:** Add a UI-safe-area concept for notched displays (Phase 5 polish of the UI system design): `UiSafeAreaEcsComponent`/`addUiSafeAreaComponent` on a `UiAnchor.stretchAll()`-anchored element, combined with `createUiCanvas`'s new `getSafeAreaInsets` option, registers `createUiSafeAreaEcsSystem` to shrink that element's rect inward from a device's notch/camera cutout/rounded corners/home indicator every frame, converted from CSS pixels into that canvas's own UI world units. Per-edge (`top`/`right`/`bottom`/`left`) opt-out for content that intentionally extends under one edge. See the UI doc's new "Safe area" section
- **rendering:** Add `getSafeAreaInsets`, reading a browser viewport's current `env(safe-area-inset-*)` values back into plain numbers (there's no direct JS API for these) via the standard hidden-probe-element technique - returns all zeroes in a browser with no notch/cutout or without `env()` support, so it's always safe to call unconditionally
- **ui:** Add a `fitReferenceResolution` `UiScaleMode`, alongside the existing `scaleWithScreenSize`/`matchWidth`/`constantPixelSize`: it keeps a screen-space canvas's root rect at least `referenceResolution` on both axes, letterboxing/pillarboxing whichever axis has excess space instead of cropping or squashing it - useful for a UI with content anchored out to all four edges, which the other modes can each only guarantee for one axis at a time
- **ui:** Add `sizeUnit`/`marginUnit: 'screenPixels'` to `UiAxis.point`/`UiAxis.stretch` (and `widthUnit`/`heightUnit` to `UiAnchor`'s edge-pinned band presets), letting one element's `size`/`margin` stay a literal, unscaled on-screen pixel count instead of scaling with its canvas's live scale factor like the rest of the anchor system does by default - useful for a fixed-width sidebar or a HUD icon that should hold a constant on-screen size regardless of the window's aspect ratio or resolution. See the UI doc's new "Pixel-locking one element with `screenPixels`" section

#### Changed

- **math:** `Vector2`/`Vector3` are now plain `{ x, y }`/`{ x, y, z }` objects instead of classes, constructed with an object literal (`{ x: 1, y: 2 }`) and operated on via `Vec2`/`Vec3` static methods (`Vec2.add`, `Vec2.rotate`, `Vec2.normalize`, etc.) that mutate their first (`target`) argument in place and return it, rather than allocating a new vector, for performance in hot loops like physics integration; see the "Vectors and Rectangles" doc for the full API and migration guidance. **Breaking change.**
- **math:** `Vec2.normalize`/`Vec3.normalize` now throw when given a zero-length vector instead of silently returning it unchanged, since a normalized direction is undefined for a zero vector. **Breaking change.**
- **utils:** `createGame` utility now throws a more useful error message when no matching DOM element is found that has the id matching `containerId`
- **utils:** `createImageSprite` now makes layer an optional value in the options argument rather than a required argument to the function. Defaults to `1`.
- **math:** `Rect` is now a plain `{ min, max }` object instead of an `{ origin, size }` class, constructed with an object literal and operated on via the new `Rects` static-method namespace (`Rects.contains`, `Rects.intersects`, `Rects.size`, `Rects.clone`) rather than instance methods, matching the `Vector2`/`Vec2` convention. `Rect` was constructed nowhere in the engine outside its own tests, so this is not expected to affect existing content.
- **ui:** `RectTransformEcsComponent`'s `anchorMin`/`anchorMax`/`pivot`/`sizeOrMargin` fields are replaced by per-axis `x`/`y` fields of the new `UiAxis` type: a `UiPointAxis` (`{ kind: 'point', anchor, pivot, size }`) or a `UiStretchAxis` (`{ kind: 'stretch', anchorMin, anchorMax, pivot, margin }`), built with `UiAxis.point`/`UiAxis.stretch`. Previously, `sizeOrMargin`'s `x`/`y` components silently meant different things (a literal size or a stretch margin) depending on that axis's anchoring, with nothing preventing the wrong one from being set; the type checker now rules that out; a point axis has no `margin` field to set, and a stretch axis has no `size` field. `UiAnchor`'s presets (`topLeft`, `stretchTop`, `stretchAll`, etc.) are now factory functions taking the size/margin values their own axes actually need (e.g. `UiAnchor.center({ x: 200, y: 60 })`, `UiAnchor.stretchTop({ height: 64, horizontalMargin: 0 })`) instead of plain objects spread alongside a separate `sizeOrMargin` option; `createPanel`/`createLabel`/`createButton`/`createToggle`/`createSlider`/`createProgressBar`/`createDropdown`'s `sizeOrMargin` option is removed - pass the size/margin into the `anchor` option's factory call instead. See the UI doc's updated "RectTransform" section. **Breaking change.**
- **ui:** Add `registerUiSystems(world, renderContext, time, options?)`, and simplify `createUiCanvas(world, renderContext, options)` to only create a canvas entity - it no longer registers any systems, and no longer takes a `time` argument. Previously, `createUiCanvas` registered every UI system as a side effect, guarded by module-level state so a second call (for a second canvas on the same world) wouldn't register the layout/interaction pipeline twice; that state had no way to detect a system being removed from the world later, and gave no error if a caller registered a UI system directly and then called `createUiCanvas` too. `registerUiSystems` now does this instead - called once per `EcsWorld`, the same way `registerInputs` is - so `createUiCanvas` is a plain, freely-repeatable factory like every other `create*` function in the module, and there's no hidden bookkeeping that can drift out of sync with the world's actual state. `pointerSource`/`getSafeAreaInsets` move from `createUiCanvas`'s options to `registerUiSystems`'s, since they configure the shared pipeline for the whole world, not one canvas. See the updated "Creating a Canvas" doc. **Breaking change.**
- **ui:** `GridLayoutGroupEcsComponent`/`addGridLayoutGroupComponent`'s `constraint`/`columnWidthMode`/`rowHeightMode` fields are now a discriminated union on `constraint`: `columnWidthMode`/`rowHeightMode: 'content'` is only assignable once `constraint` is `'fixedColumnCount'`/`'fixedRowCount'`, a compile-time error instead of the thrown `Error` it was previously for `'flexible'`. **Breaking change.**
- **rendering:** `createRenderEcsSystem` now orders sprites/glyphs for drawing with a linear-time counting sort instead of a general-purpose comparison sort, measurably reducing per-frame cost in scenes with many sprites. Draw order (by `layer` then depth) is unaffected, including tie-breaking - sprites at the same depth still draw in the same relative order they did before.
- **rendering:** `createRenderEcsSystem` now resolves each sprite's optional rotation/scale/flip components via the new `EcsWorld.getComponentAccessor` once per frame instead of calling `EcsWorld.getComponent` three times per sprite, measurably reducing per-frame cost in scenes with many sprites. No behavior change.

#### Removed

- **math:** Removed the `Vector2`/`Vector3` classes, including `new Vector2(...)`/`new Vector3(...)` construction, their instance methods (`.add()`, `.subtract()`, `.clone()`, etc.), and their static constant getters (`Vector2.zero`, `Vector2.up`, etc.), replaced by the `Vec2`/`Vec3` static-method API above. **Breaking change.**
- **ecs:** Removed `EcsWorld.addSystem`'s numeric `registrationOrder` parameter and the `SystemRegistrationOrder` constants, replaced by the `before`/`after` options and system groups described above - an arbitrary priority number didn't tell you how many systems would run before yours, or what priorities were already taken, and gave no way to express "run before/after this specific system". **Breaking change.**
- **utilities:** Removed `SortedSet`, which existed solely to back `EcsWorld`'s old priority-ordered system list and has no other consumers; use `DirectedAcyclicGraph` for ordering use cases going forward. **Breaking change.**
- **common:** Removed `DepthEcsComponent`/`addDepthComponent`, which was never read by anything in the engine; use the new `SpriteEcsComponent.sortDepth` for controlling sprite draw order instead. **Breaking change.**

#### Fixed

- **common:** Fix `createTransformEcsSystem` composing a child's world position by plain addition of the parent's world position, ignoring the parent's world rotation and scale entirely - a child parented to a rotated and/or scaled entity now orbits/scales with it instead of spinning or resizing in place at an un-rotated, un-scaled offset. **Behavior change** for any existing content that parents a positioned entity to a rotated or scaled one and was authored against the previous (incorrect) composition.
- **rendering:** Fix `SpriteEcsComponent.pivot` using a Y-down convention (`(0, 0)` was the sprite's top-left) while every other Y-facing value in the engine (world position, rotation) is Y-up - `pivot` is now Y-up too, so `(0, 0)` is the bottom-left corner and `(1, 1)` is the top-right corner. Nine-slice region placement (`computeNineSliceRegions`) is updated to match. The centered default (`(0.5, 0.5)`) is unaffected. **Breaking change** for any content using a non-centered pivot: those sprites now render vertically mirrored around their old pivot point until the pivot's `y` is updated (`1 - oldPivotY`).
- **utilities:** Fix `Game`'s render loop occasionally producing a negative `deltaTime` for one frame (e.g. right after constructing hundreds of entities in a single tick), by reading `performance.now()` at the point the frame callback runs instead of trusting `requestAnimationFrame`'s supplied timestamp, which is not guaranteed to be monotonic relative to the previous frame
- **input:** Fix `MouseInputSource` caching its container's `getBoundingClientRect()` once in its constructor and reusing it for every `mousemove` event - cursor positions (and any binding derived from them) were wrong after the container was resized, scrolled, or otherwise reflowed. The bounding rect is now recomputed fresh on every `mousemove`
- **text:** Fix `forge-generate-font-atlas` deriving `FontAtlasMetrics.ascender`/`descender` from the font's nominal `base`/`lineHeight` BMFont fields instead of the atlas's actually rendered glyph ink - for the shipped default atlas (Liberation Sans) this undershot both bounds (`ascender` was smaller than the rendered top of "b"/"d"/"h"/"i"/"l", `descender` was smaller in magnitude than the rendered bottom of "("/")"/"j"), so every `verticalAlign` (`'top'`, `'middle'`, `'bottom'`) positioned text noticeably higher than intended, with `'top'`-aligned ascenders visibly poking above their anchor. `ascender`/`descender` are now the actual max/min glyph bounds across the atlas's charset; regenerate any existing atlas with `forge-generate-font-atlas` to pick up the fix
- **text:** Fix `TextEcsComponent.verticalAlign: 'middle'` centering on the font's own `ascender`/`descender` metrics instead of the shaped text's actual rendered ink - since a font's ascender is typically taller than its descender is deep (most glyphs have no descender at all), this systematically positioned every descender-less string (numbers, titles, most short UI labels, e.g. a `"Score: 1234"` HUD readout) above the true visual center of its box. `'middle'` now centers on this specific string's own rendered bounds instead; `'top'`/`'bottom'` are unchanged (still anchored to the font's metrics, so a line's position stays stable as its text is edited). **Behavior change** for existing content relying on the old, metrics-based `'middle'` centering.
- **ui:** Fix `createButton`'s label reading as shifted right of the button's true center - `horizontalAlign: 'center'` only re-centers text within an explicit `maxWidth` box, which `createButton` never set, so a label always started exactly at the button's center point and grew rightward from there instead of being centered on it. The label now sets `maxWidth`/`horizontalAlign` (defaulting `maxWidth` to `sizeDelta.x`, overridable via the new `labelMaxWidth` option for a stretch-anchored button, where `sizeDelta.x` is a margin rather than a width) so the engine's own centering keeps the label centered even as its text changes later, instead of a one-off pre-measured offset that only matched the label's *initial* text. This also fixes `createDropdown`'s header and option-row labels, which are built from `createButton` - including the header staying centered after selecting a different option, and the option rows (which stretch to the header's width) centering against that width instead of their own zero-width `sizeDelta`.
- **ui:** Fix `createUiInteractionEcsSystem` re-focusing a still-hovered interactable on every tick instead of only on the hover-enter edge - a pointer left resting over an element (not actively moving) silently re-asserted focus onto it every tick, always winning over (and effectively blocking) any keyboard/gamepad focus navigation made in the meantime, since interaction runs after navigation in the pipeline. Most visible with a dropdown: opening it via keyboard while the mouse happened to be resting on the header made arrow keys unable to move focus into the now-visible option rows at all. Hovering still focuses an element the moment the pointer moves onto it - it just no longer keeps re-claiming focus back from keyboard/gamepad input every frame afterward.
- **ui/text:** Fix `horizontalAlign: 'center'`/`'right'`/`'justify'` measuring its alignment box from a `TextEcsComponent`'s own local `x = 0`, which only lands on the visible box's actual left edge for a left (`pivot.x: 0`) anchor - a stretch-x anchor with a center pivot (`UiAnchor.stretchAll`, `stretchHorizontal`, and any custom anchor like them) silently offset centered/right-aligned/justified text away from the panel it was meant to fill. `createUiLayoutEcsSystem` now also syncs a new `TextEcsComponent.horizontalAlignPivot` field from the anchor's own `pivot.x` for any stretch-x-anchored label, alongside the existing `maxWidth` sync, so `horizontalAlign` now works correctly under any pivot - not just a left one - with no caller-side workaround needed.
- **rendering:** Fix the sprite fragment shader dropping `SpriteEcsComponent.tintColor`'s alpha component entirely, using only the sampled texture's own alpha - a sprite's final alpha is now `texture.a * tintColor.a`, so tinting a sprite partially transparent (`tintColor.a < 1`) actually renders it that way instead of silently staying fully opaque. The default `tintColor.a` is `1`, so this doesn't change how any existing content renders unless it was already (ineffectively) setting a non-`1` tint alpha.

## [0.24.2] - 2026-08-03

#### Added

- **physics:** Add `TerrainCollider`, a static, non-convex 2D ground collider defined by a heightmap of surface points (rolling hills, a canyon profile, any left-to-right surface with more than one slope), resolved via `createBroadPhaseEcsSystem`/`createNarrowPhaseEcsSystem` against `CircleCollider`/`PolygonCollider` bodies exactly like other colliders

## [0.24.1] - 2026-08-03

#### Added

- **physics:** Add revolute (hinge) and prismatic (slider) joints, via `addRevoluteJointComponent`/`createRevoluteJointEcsSystem` and `addPrismaticJointComponent`/`createPrismaticJointEcsSystem`, constraining two entities together with a warm-started, soft-constraint velocity solve, with optional angle/translation limits
- **physics:** Add `AngularVelocityMotorEcsComponent`/`createAngularVelocityMotorEcsSystem`, driving a single entity's angular velocity towards a target speed within a per-tick torque budget
- **physics:** Add `LinearSpringEcsComponent`/`createLinearSpringEcsSystem` and `LinearDamperEcsComponent`/`createLinearDamperEcsSystem`, Hooke's-law and velocity-damping force generators connecting two entities' anchor points, for soft connections like vehicle suspension
- **physics:** Add `applyTorque`, a one-shot torque helper mirroring `applyImpulse` for angular-only forces (a thruster, a scripted nudge)
- **physics:** Add `applyExplosiveForce`, applying a radial impulse (falling off linearly with distance) to every dynamic body within a radius of a point, for area-effect blasts
- **physics:** Add `angularDrag` to `RigidBodyEcsComponent`, damping `angularVelocity` towards `0` every tick (applied by `createEulerIntegrationEcsSystem`); defaults to `0`, so existing bodies are unaffected
- **fphysics:** Add AABB broad-phase and SAT narrow-phase collision detection for `CircleCollider` and the new `PolygonCollider`, via `createBroadPhaseEcsSystem` and `createNarrowPhaseEcsSystem`
- **fphysics:** Add `createCollisionResolutionEcsSystem`, a sequential-impulse collision resolver with soft-constraint penetration correction, Coulomb friction, restitution, and warm-starting of accumulated impulses across ticks; `ColliderEcsComponent` gains `friction`/`restitution` properties

#### Changed

- **physics:** Renamed the physics module's source directory from `fphysics` back to `physics` now that the old physics engine it temporarily coexisted with has been removed; the published `@forge-game-engine/forge/physics` subpath is unchanged, but was previously unresolvable (it pointed at a `dist/physics` output that no longer existed) and is now fixed

#### Fixed

- **physics:** Fix `createCollisionResolutionEcsSystem`'s normal-impulse solve dividing its soft-constraint `impulseScale` correction term by effective mass a second time, making that correction scale with mass² instead of staying mass-invariant. This was unnoticeable for the small test-scale bodies covered by unit tests, but caused massive, growing interpenetration ("sinking"/tunneling through other bodies) for real-world-scale masses, most visibly as balls passing through each other in the Newton's Cradle demo, bricks sinking into each other in the wrecking-ball demo, and the car falling through terrain
- **rendering:** Fix sprites rotating in the opposite direction (mirrored) from their entity's actual `RotationEcsComponent.world`/physics rotation. `position.world.y` is negated when uploaded to the sprite shader (to convert the engine's Y-up world space to the shader's Y-down space), but rotation wasn't given the same treatment, so a positive rotation visually spun the sprite the wrong way relative to its (correctly rotating) collider. This only became visible once colliders had a distinguishable, non-symmetric shape (e.g. a rotating `PolygonCollider` triangle) to reveal the mismatch
- **rendering:** Fix `SpriteEcsComponent.pivot` applying only half of its intended offset (e.g. `pivot: (0, 0)` landed 25% in from the sprite's edge instead of at the edge, and a pivot matching a rotated collider's centroid left the sprite visibly adrift from its own collider - gapping off the ground on one side, sinking into it on another - as the entity rotated). A rendering-pipeline change had widened the vertex quad's coordinate range without widening the pivot term to match; nine-slice sprites were unaffected since they always render their regions with a centered pivot
- **common:** Fix `Time.update` clamping its very first call's delta (the gap between the timestamp's arbitrary clock offset, e.g. a `requestAnimationFrame` timestamp measured from page navigation start, and `Time`'s `0` baseline) against the same oversized-delta guard meant for mid-simulation hitches, permanently offsetting every subsequent `timeInMilliseconds`/`timeInSeconds` value behind the real elapsed time

## [0.24.0] - 2026-07-27

#### Added

- **rendering:** Add `preserveDrawingBuffer` option to `createRenderContext`/`RenderContext`, for consumers that need to read the canvas's pixels back (e.g. `toDataURL`, `drawImage`) after a frame has already been presented
- **rendering:** Add `calculateVisibleWorldSize` to compute the width/height, in world units, a camera's view spans at given destination dimensions, so game logic can size and position things relative to what's actually visible instead of reading canvas pixel dimensions directly

#### Changed

- **rendering:** Cameras now show a fixed number of vertical world units (`verticalWorldUnits`, default `10`) regardless of screen resolution or aspect ratio, replacing the old implicit 1-world-unit-equals-1-pixel behavior. This is a behavior change: existing sprite and physics sizes will render at a different scale until re-tuned to the new default

#### Fixed

- **input:** Fix `MouseInputSource` triggering `TriggerAction` bindings regardless of the active input group, ignoring `InputManager`'s active-group gating that `KeyboardInputSource` and every other action type already respect
- **demos:** Fix the linear-spring-damper, revolute-joint, torque, physics, prismatic-joint, car, wrecking-ball, and Newton's cradle demos naively non-uniformly stretching bordered sprites (ropes, doors, flywheels, walls, cradle frame) instead of nine-slicing them, and tinting already-colored artwork; the wrecking-ball and Newton's cradle demos also now render each ball's crane/pendulum arm, rotating correctly as it swings

## [0.23.1] - 2026-07-24

#### Fixed

- **rendering:** Fix nine-slice sprites rendering their top/bottom border and corner regions vertically flipped relative to their left/right regions, causing distorted or misaligned edges
- **rendering:** Fix nine-slice sprites tearing apart when rotated, instead of rotating as one intact sprite

## [0.23.0] - 2026-07-23

#### Added

- Add LinearSpring and LinearDamper for soft body connections
- **rendering:** Add nine-slice support for sprites
- **demos:** Add car demo
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

