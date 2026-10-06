# Design: Material Uniforms Follow the Shader's Declarations

|                                       |                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                       |
| **Kind**                              | Defect                                                                                                                  |
| **Found in**                          | Galactic Journey demo: `src/background/background.shader.ts`, `src/background/background.system.ts`                     |
| **Engine version at time of writing** | `0.25.8`                                                                                                                |
| **Related**                           | [`demo-findings.md`](./demo-findings.md) (index of every finding from the demo), `rendering/material-uniforms.md` guide |

## 0. Targeted modules

| Path                                                                                           | Change   | Notes                                                                                  |
| ---------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `src/rendering/shaders/pre-processing/forge-shader-source.ts`                                  | Modified | Parses and caches the uniform declarations of its prepared source                      |
| `src/rendering/shaders/pre-processing/uniform-declarations.ts`                                 | **New**  | `parseUniformDeclarations(source)`: the GLSL declaration scanner (pure, unit-tested)   |
| `src/rendering/shaders/pre-processing/dependency-resolution/resolve-includes-pre-processor.ts` | Modified | Its duplicate-declaration check uses the scanner's declaration matcher                 |
| `src/rendering/materials/material.ts`                                                          | Modified | Declared uniforms become the material's interface; the program only supplies locations |
| `src/rendering/materials/uniform-types.ts`                                                     | Modified | Adds a lookup by GLSL type name next to the existing lookup by GL enum                 |
| `documentation-site/docs/docs/rendering/material-uniforms.md`                                  | Modified | The "Unused uniforms don't exist" gotcha is replaced by the new rule                   |

---

## 1. Summary

`Material.setUniform(name, value)` throws when `name` isn't an _active_
uniform of the linked program. Whether a uniform is active isn't something
the game controls: the GLSL compiler drops every uniform that can't affect
the output, and what it can prove varies between drivers, precisions and
code paths.

The demo hit this on phones. Its starfield shader ran at `mediump`, which
phone GPUs implement as 16-bit floats. At 16 bits every star in its hash
works out to zero, so the phone's compiler removed the star code, and
`u_time` with it, because the twinkle was the only thing reading it.
`createBackgroundEcsSystem` sets `u_time` every frame, so on those phones
the game threw on its first frame. On desktop GPUs, where `mediump` is
32-bit, the same code ran fine. The demo switched the shader to `highp`
(see the comment at the top of `background.shader.ts`), which fixed the
stars, but the crash would come back the next time any driver strips a
uniform that the game sets.

The material's interface should be the uniforms the shader _declares_, not
the ones the driver happens to keep. This design makes `Material` read the
declarations from the shader source, which it already has, and treat the
program's active uniforms purely as the set it uploads to:

- Setting a declared uniform always works. If the driver kept it, its
  value is uploaded on bind, exactly as today. If the driver stripped it,
  the value is checked against the declared type and stored, and there's
  nothing to upload.
- Setting a name the shader never declares still throws, so typos are
  still caught on the first call, on every device.

---

## 2. Scope

### In scope

- Parsing `uniform` declarations (name, GLSL type, array size) out of a
  `ForgeShaderSource`'s prepared source, once per shader.
- `Material.setUniform`/`setColorUniform`/`setVectorUniform` accepting any
  declared uniform, validating every value against the declared type and
  array size, whether or not the driver kept the uniform.
- The error for an undeclared name listing the declared uniforms (not just
  the active ones, which is what makes today's message misleading).
- Unit tests with a mocked context that leaves declared uniforms out of
  `getActiveUniform`, and an e2e check against a real compiler.
- Updating the Material Uniforms guide.

### Out of scope

- **Uniform blocks** (`uniform Block { ... };`) and **struct-typed
  uniforms**. `Material` doesn't support uniform blocks today. Struct
  members keep working the way they do now (see §5.3): their active member
  names (`u_light.color`) stay settable. Parsing struct definitions to
  accept stripped struct members is left for when a shader in the engine
  needs it.
- A shader program cache shared between materials. Each `Material` still
  compiles its own program; [`sprite-textures.md`](./sprite-textures.md)
  covers sharing programs. Parsing declarations on `ForgeShaderSource`
  rather than `Material` means that change doesn't redo this work.
- Default values for uniforms that were never set (the `TODO` in
  `Material.bind`). Unrelated to this defect.

---

## 3. Background

### 3.1 What the engine does today

`Material` builds its uniform table in `_detectUniforms`
(`src/rendering/materials/material.ts`, lines 181-218) from
`gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)` and
`gl.getActiveUniform`. `setUniform` (lines 97-107) looks the name up in that
table and throws `Uniform "<name>" does not exist on material` when it's
missing. The Material Uniforms guide documents this as a gotcha:

> **Unused uniforms don't exist.** The GLSL compiler removes any uniform the
> shader never reads, and `setUniform` throws for a name the linked program
> doesn't have. Comment out the code that reads a uniform, and the
> `setUniform` call for it starts throwing too.

That makes a shader's interface depend on the driver's dead-code analysis:

- **Device-dependent crashes.** Precision, constant folding and
  loop unrolling differ between GPUs and drivers (ANGLE on Windows, Metal
  through ANGLE on macOS, Adreno, Mali, PowerVR, SwiftShader in CI). A
  uniform that survives on the developer's machine can be stripped on a
  player's phone, and the game throws there and nowhere else.
- **Editing a shader breaks CPU code.** Commenting out the line that reads
  a uniform while tuning an effect makes every `setUniform` call for it
  throw, so the shader can't be edited without also editing the systems
  that drive it.
- **The error message points at the wrong thing.** It lists the active
  uniforms as "available", so a stripped uniform looks like a typo.

### 3.2 Why the declarations are already available

Every `Material` is built from two `ForgeShaderSource`s, which hold the
prepared GLSL (`preparedSource`, after `#include`s are resolved). The
uniform declarations are right there in the text. The engine also already
knows how to map GLSL type names to uploads: each entry in
`uniform-types.ts` carries its `glslName` (`'vec4'`, `'sampler2D'`, ...)
next to its GL enum.

---

## 4. How established engines handle this

Every engine with string-named material parameters separates "what you can
set" from "what the GPU kept":

- **Unity**: material properties come from the shader's declarations, and
  `Material.SetFloat` stores the value on the material whether or not the
  compiled variant reads it. Nothing throws because a variant optimized a
  property away.
- **Godot**: shaders are written in Godot's shading language and compiled
  by Godot's own front end, so the parameter list
  (`Shader.get_shader_uniform_list`) comes from the source, independent of
  what the GPU driver later strips.
- **three.js**: `material.uniforms` is a plain map. The renderer only
  builds upload functions for active uniforms and skips the rest without
  complaint.
- **Bevy**: material uniforms are typed Rust structs bound as uniform
  buffers. The binding layout is fixed by the struct, not by shader usage.

None of them rejects an unknown name at runtime: Unity and Godot store any
name they're given (Unity has `Material.HasProperty` to check), and
three.js ignores names it has no upload for. Throwing for an undeclared
name is Forge's own choice, kept from today's behavior: a typo throws now,
and with this design it throws on every device instead of only where the
name happens to be missing. Forge can make that check because, like Godot,
it has the source.

---

## 5. Design

### 5.1 Rule

A material's uniforms are the uniforms declared in its two shader sources.

| `setUniform(name, value)` where `name` is... | Behavior                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| declared and active                          | Validated against the declared type and size; uploaded on every `bind`  |
| declared and stripped by the compiler        | Validated against the declared type and size; stored; nothing to upload |
| an active struct member (`u_light.color`)    | Validated against the program's reported type; uploaded on every `bind` |
| not declared                                 | Throws, listing the declared uniforms                                   |

Validation never depends on what the driver reports. That includes array
sizes: for an array, `getActiveUniform` reports the highest element index
the shader uses plus one, which a driver can trim. Uploading the full
declared length is safe, since GL ignores values past an array's active
size.

There's no flag to switch between strict and lenient behavior. The rule
above is both: strict about names, independent of the driver.

### 5.2 Parsing declarations

`ForgeShaderSource` gains a lazily computed, cached
`uniformDeclarations: ReadonlyMap<string, UniformSourceDeclaration>`:

```ts
interface UniformSourceDeclaration {
  /** The declared name, without any `[n]` suffix. */
  readonly name: string;
  /** The declared GLSL type name, e.g. `'vec4'` or `'sampler2D'`. */
  readonly glslTypeName: string;
  /**
   * The array size, `1` for a non-array uniform, or `undefined` if the size
   * is an expression the scanner couldn't resolve (see below).
   */
  readonly size: number | undefined;
}
```

The scanner (`parseUniformDeclarations`) works on the prepared source:

1. Strip `//` and `/* */` comments.
2. Collect `#define NAME <integer>` and `const int NAME = <integer>;`
   constants, so `uniform vec4 u_waves[MAX_WAVES];` resolves its size.
3. Match declarations of the form
   `uniform [precision] <type>[ [<size>] ] <name>[ [<size>] ] (, <name>[ [<size>] ])* ;`,
   so both `uniform vec4 u_x[4];` and `uniform vec4[4] u_x;` are read.
   `layout(...)` qualifiers are allowed and ignored.
4. Skip `uniform <Identifier> { ... }` blocks (out of scope, §2).
5. Map each type name through the GLSL-name lookup, which also accepts
   the aliases `mat2x2`, `mat3x3` and `mat4x4`. A declaration whose type
   isn't a known WebGL 2 uniform type (a struct type such as
   `uniform Light u_light;`) isn't settable by its own name and isn't
   listed as declared; its active members stay settable (§5.3).

An array size the scanner can't resolve (an expression such as
`N * 2`) is an error when the shader source is prepared, naming the
uniform and asking for a literal, a `#define` or a `const int`. Guessing
would bring back driver-dependent validation.

The include resolver already recognizes declaration lines, to drop
duplicates that two includes both declare
(`ResolveIncludesPreProcessor._isVariableDeclarationLine`). It switches to
the scanner's declaration matcher, so there's one definition of what a
uniform declaration looks like.

Preprocessor conditionals (`#if`, `#ifdef`) are deliberately **not**
evaluated. A uniform declared inside an inactive branch is treated as
declared. That over-approximates the interface, which is harmless: setting
such a uniform is a stored, never-uploaded value, exactly like a uniform
the compiler stripped. Evaluating conditionals would mean implementing the
GLSL preprocessor to get the same observable behavior.

Parsing happens once per `ForgeShaderSource`, and shaders are shared
through `ShaderCache`, so a shader used by many materials is scanned once.
The cache is invalidated when a pre-processor is applied, since that
changes `preparedSource`.

### 5.3 How `Material` uses it

At construction, `Material` builds its uniform table from:

- the declarations of both sources. The same name declared with different
  types or sizes in the two stages throws, the same rule DL-3 applies
  within one source. (GLSL ES 3.00 only requires matching types for
  uniforms both stages use, which are exactly the ones this design isn't
  about, so the linker can't be relied on to catch it.)
- the program, for each declared uniform's location: `null` if the
  compiler stripped it.
- the active struct members the program reports (`u_light.color`), which
  the scanner doesn't expand. They keep today's behavior: settable while
  active, validated against the reported type.

A declared array is reachable both as `u_items` and as `u_items[0]`, as it
is today, whether or not it's active, so neither spelling throws only on
drivers that strip the array.

Each entry records its declaration (the type and size from the source,
with the GL enum from the GLSL-name lookup) and its location:

```ts
interface UniformSpec extends UniformDeclaration {
  /** `null` when the compiler stripped the uniform: stored, never uploaded. */
  readonly location: WebGLUniformLocation | null;
}
```

`setUniform` validates with the existing `createUniformUpload` for every
declared uniform, so a texture passed to a `float` throws whether or not
the driver kept the uniform. `bind` walks the active uniforms in program
order, as today (the guide promises that textures take consecutive units
in that order), and skips specs without a location, so stripped uniforms
cost nothing per draw. Active entries whose location is `null` (built-ins
such as `gl_DepthRange.near`) are still skipped, as now.

The GLSL-name lookup reuses the existing table: `uniform-types.ts` builds
a second map from each type's `glslName` (and the `matNxN` aliases) to the
GL enum and `UniformType` of the same entry, so there is still one table of
types.

### 5.4 Error message

```
Uniform "u_tme" is not declared in material "sprite.vert" + "background.frag".
Declared uniforms: u_resolution, u_color, u_bgTexture, u_time, u_scroll, u_projection.
```

Naming the two shaders makes the message actionable in a game with many
materials.

### 5.5 Performance

- Scanning is linear in the source length and runs once per shader source.
  The engine's largest shader is a few hundred lines.
- `bind` does the same work as today: one upload per active uniform with a
  value.
- `setUniform` on a stripped uniform allocates the same validated upload
  closure as an active one and never calls it. That keeps the code path
  identical, and costs one small allocation per call, same as today.

### 5.6 Interaction with other designs

- [`webgl-context-loss.md`](./webgl-context-loss.md): rebuilding programs
  after a restored context re-queries active uniforms. Because values are
  stored for every declared uniform, a uniform that a different driver
  keeps after restore still has its value to upload.
- [`sprite-textures.md`](./sprite-textures.md) depends on this design
  landing first: its render system sets `u_texture` on every sprite
  material, and a procedural sprite shader that declares `u_texture`
  without sampling it would throw on every device under today's
  `Material`. When programs are shared between materials, the
  declarations are already shared through `ForgeShaderSource`.

---

## 6. Phases

### Phase 1: Declarations become the interface

| #   | Task                                                                                                                                                         | Size |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1.1 | `parseUniformDeclarations`: comments, `#define`/`const int` sizes, both array spellings, multi-declarators, qualifiers, unresolvable sizes                   | M    |
| 1.2 | `ForgeShaderSource.uniformDeclarations`, cached and invalidated by `applyPreProcessor`; `UniformSourceDeclaration` exported with JSDoc                       | S    |
| 1.3 | GLSL-name lookup (with `matNxN` aliases) in `uniform-types.ts`, built from the existing table; the include resolver uses the shared matcher                  | S    |
| 1.4 | `Material` builds specs from declarations, locations and active struct members; `[0]` aliases; cross-stage conflicts throw                                   | M    |
| 1.5 | Undeclared-name error listing declared uniforms and naming both shaders; update the three tests that assert today's message                                  | S    |
| 1.6 | Unit tests: stripped uniform settable and validated; a mocked, trimmed array size doesn't change validation; struct members still work                       | M    |
| 1.7 | e2e: a declared, unread uniform on a real canvas, asserting `getUniformLocation` is `null` for it and that setting it doesn't throw                          | S    |
| 1.8 | `material-uniforms.md`; changelog bullet under `#### Fixed`; build and check the docs demos that use `Material` (space shooter, brick breaker, erosion burn) | S    |

**Definition of done:** a shader whose compiler strips a declared uniform
can have that uniform set every frame without throwing, on every device;
an undeclared name throws on the first call with the declared list; the
demo's background system works whatever precision its shader uses.

This is one releasable phase. There's nothing to stage: the behavior
change is a strict relaxation for declared names and unchanged for
undeclared ones.

---

## 7. Decision log

### DL-1: What defines a material's uniforms

**Options.** (a) The program's active uniforms (status quo). (b) Any name
at all: unknown names are ignored, as in three.js. (c) The shader's
declared uniforms, with names outside them rejected.

**Decision: (c).**

**Rationale.** (a) is the defect: the interface changes with the driver.
(b) removes the crash but silently swallows typos, which then show up as
an effect that "doesn't do anything" with no error at all. (c) is
independent of the driver and still catches typos at the first call.

**Trade-off.** Forge parses a little more GLSL than it does now (the
include resolver already recognizes declaration lines). The parser only
needs declaration syntax, which is small and stable, and it's unit-tested
in isolation.

### DL-2: Where declarations are parsed and cached

**Options.** (a) In `Material`, per instance. (b) On `ForgeShaderSource`,
cached per shader.

**Decision: (b).**

**Rationale.** A shader is shared by every material that uses it through
`ShaderCache`. Parsing once per shader keeps material creation cost flat,
and the declarations are a property of the source, not of a material.

### DL-3: Preprocessor conditionals

**Options.** (a) Evaluate `#if`/`#ifdef`, so only live declarations
count. (b) Ignore them and treat every declaration as declared.

**Decision: (b).**

**Rationale.** A declaration in an inactive branch behaves exactly like a
stripped uniform under this design: settable and never uploaded. (a)
would mean implementing the GLSL preprocessor (macro expansion, `defined`,
arithmetic) to produce the same observable result.

**Assumption.** No shader declares the same uniform name with two
different types in two mutually exclusive branches. If one does, the
scanner reports the conflict as an error at construction, as it does for
a conflict between the two stages.

### DL-4: Values for stripped uniforms

**Options.** (a) Accept and discard. (b) Validate and store.

**Decision: (b).**

**Rationale.** Validation must not depend on the driver either, or a type
or size mismatch would throw on one device and not another, which is the
same class of bug. That's why the declared size, not the reported one,
is what an array value is checked against. Storing costs nothing per draw and means a value survives a
program rebuild (context restore) where a different set of uniforms may be
active.

### DL-5: A warning when setting a stripped uniform

**Options.** (a) `console.warn` once per uniform. (b) No warning.

**Decision: (b).**

**Rationale.** Setting a stripped uniform is correct code. A warning would
fire on some devices and not others, for code nobody needs to change.
Tools that want to know can call a debug accessor instead (open question
2).

---

## 8. Open questions

1. **Should struct uniforms be parsed too?** Today struct members are
   settable only while active. Parsing `struct` definitions would extend
   this design to them. No shader in the engine or the demo uses struct
   uniforms, so the proposal is to wait until one does.
   - (a) Defer (proposed). (b) Parse structs in Phase 1.
2. **Expose which uniforms are active?** A read-only
   `material.isUniformActive(name)` would help shader authors confirm that a
   uniform actually reaches the GPU while debugging, without making it part
   of the normal flow.
   - (a) Add it (small, debug-only value). (b) Leave it out until asked
     for.

---

## 9. Testing considerations

- **Unit (`parseUniformDeclarations`)**: precision qualifiers, `layout`
  qualifiers, multiple declarators on one line, both array spellings,
  arrays sized by literal, `#define` and `const int`, an unresolvable size
  (error), `matNxN` aliases, struct-typed declarations (not settable),
  declarations inside comments (ignored), uniform blocks (skipped),
  conflicting duplicate declarations (error).
- **Unit (`Material`)**: the existing mocked-context tests already
  require `getActiveUniform` to report real GL types (see AGENTS.md
  "Test Conventions"). New tests leave one declared uniform out of the
  mocked active list and assert it can be set, is validated, and is never
  passed to a `uniform*` call on `bind`.
- **e2e**: a minimal scene whose fragment shader declares
  `uniform float u_unused;` and never reads it. The test first asserts
  `gl.getUniformLocation(program, 'u_unused')` is `null`, so it proves the
  compiler stripped it rather than passing trivially, then sets it every
  frame, steps a few frames, and asserts no error was thrown and the frame
  rendered (relative pixel check per the `write-e2e-test` skill).

## 10. Documentation and demo follow-up

- `material-uniforms.md`: replace the "Unused uniforms don't exist"
  gotcha with the rule in §5.1, and explain that the stripped/active
  distinction no longer matters to callers.
- Demo: no code change is required. The `highp` change in
  `background.shader.ts` stays, because the stars need 32-bit precision to
  render, but its comment no longer needs to warn about `u_time`.
- Separately from this design: the docs site's space-shooter background
  (`_background.shader.ts`) runs the same star hash at `mediump`, so its
  stars likely vanish on phones. It doesn't crash, because `u_time` also
  scrolls its texture. Worth its own small fix.
