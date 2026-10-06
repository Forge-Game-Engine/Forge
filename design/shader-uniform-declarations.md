# Design: Material Uniforms Follow the Shader's Declarations

|                                       |                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                       |
| **Kind**                              | Defect                                                                                                                  |
| **Found in**                          | Galactic Journey demo: `src/background/background.shader.ts`, `src/background/background.system.ts`                    |
| **Engine version at time of writing** | `0.25.8`                                                                                                                |
| **Related**                           | [`demo-findings.md`](./demo-findings.md) (index of every finding from the demo), `rendering/material-uniforms.md` guide |

## 0. Targeted modules

| Path                                                          | Change   | Notes                                                                                   |
| ------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `src/rendering/shaders/pre-processing/forge-shader-source.ts` | Modified | Parses and caches the uniform declarations of its prepared source                       |
| `src/rendering/shaders/pre-processing/uniform-declarations.ts` | **New**  | `parseUniformDeclarations(source)`: the GLSL declaration scanner (pure, unit-tested)    |
| `src/rendering/materials/material.ts`                         | Modified | Declared uniforms become the material's interface; active uniforms only drive uploads   |
| `src/rendering/materials/uniform-types.ts`                    | Modified | Adds a lookup by GLSL type name next to the existing lookup by GL enum                  |
| `documentation-site/docs/docs/rendering/material-uniforms.md` | Modified | The "Unused uniforms don't exist" gotcha is replaced by the new rule                     |

Nothing is removed.

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
  declared uniform, validating values against the declared type for
  stripped uniforms and against the program's reported type for active
  ones.
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

three.js gives up typo detection to get there; Unity and Godot keep it,
because they know the declared set. Forge can do the same, since it has
the source.

---

## 5. Design

### 5.1 Rule

A material's uniforms are the uniforms declared in its two shader sources.

| `setUniform(name, value)` where `name` is... | Behavior                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| declared and active                          | Validated against the program's reported type and size (as today); uploaded on every `bind`         |
| declared and stripped by the compiler        | Validated against the declared type and size; stored; nothing to upload                             |
| not declared                                 | Throws, listing the declared uniforms                                                               |

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
   `uniform [precision] <type> <name>[ [<size>] ] (, <name>[ [<size>] ])* ;`.
   `layout(...)` qualifiers are allowed and ignored.
4. Skip `uniform <Identifier> { ... }` blocks (out of scope, §2).

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

At construction, `Material` builds its uniform table from the union of:

- the declarations of both sources (same name in both stages must have the
  same type, which GLSL ES 3.00 already requires; a mismatch is a link
  error before Forge ever sees it), and
- the active uniforms reported by the program. These are always a subset
  of the declarations, except for struct members (`u_light.color`), which
  the scanner doesn't expand. Keeping them in the union preserves today's
  behavior for structs.

Each entry records its declaration (type and size, preferring the
program's reported values for active uniforms) and its location, which is
`null` for a stripped uniform:

```ts
interface UniformSpec extends UniformDeclaration {
  /** `null` when the compiler stripped the uniform: stored, never uploaded. */
  readonly location: WebGLUniformLocation | null;
}
```

`setUniform` validates with the existing `createUniformUpload` for every
declared uniform, so a texture passed to a `float` throws whether or not
the driver kept the uniform. `bind` iterates only the specs with a
location, so stripped uniforms cost nothing per draw.

The GLSL-name lookup reuses the existing table: `uniform-types.ts` builds
a second map from each type's `glslName` to the same `UniformType` object,
so there is still one table of types.

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
- [`sprite-textures.md`](./sprite-textures.md): when programs are shared
  between materials, the declarations are already shared through
  `ForgeShaderSource`.

---

## 6. Phases

### Phase 1: Declarations become the interface

| #   | Task                                                                                                                           | Size |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1.1 | `parseUniformDeclarations`: comment stripping, `#define`/`const int` sizes, multi-declarators, precision and layout qualifiers | M    |
| 1.2 | `ForgeShaderSource.uniformDeclarations`, cached and invalidated by `applyPreProcessor`                                         | S    |
| 1.3 | GLSL-name lookup in `uniform-types.ts`, built from the existing table                                                          | S    |
| 1.4 | `Material` builds specs from declarations ∪ active uniforms; `location: null` for stripped ones; `bind` skips them             | M    |
| 1.5 | Undeclared-name error listing declared uniforms and naming both shaders                                                        | S    |
| 1.6 | Unit tests: stripped uniform settable, validated against its declared type, undeclared name throws, struct members still work  | M    |
| 1.7 | e2e: a shader with a declared, unread uniform on a real canvas; `setUniform` on it doesn't throw and the frame renders         | S    |
| 1.8 | Update `material-uniforms.md`; changelog bullet under `#### Fixed`                                                             | S    |

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

**Trade-off.** Forge now parses GLSL, a little. The parser only needs
declaration syntax, which is small and stable, and it's unit-tested in
isolation.

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
scanner reports the conflict as an error at construction.

### DL-4: Values for stripped uniforms

**Options.** (a) Accept and discard. (b) Validate and store.

**Decision: (b).**

**Rationale.** Validation must not depend on the driver either, or a type
mismatch would throw on one device and not another, which is the same
class of bug. Storing costs nothing per draw and means a value survives a
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
  qualifiers, multiple declarators on one line, arrays sized by literal,
  `#define` and `const int`, declarations inside comments (ignored),
  uniform blocks (skipped), conflicting duplicate declarations (error).
- **Unit (`Material`)**: the existing mocked-context tests already
  require `getActiveUniform` to report real GL types (see AGENTS.md
  "Test Conventions"). New tests leave one declared uniform out of the
  mocked active list and assert it can be set, is validated, and is never
  passed to a `uniform*` call on `bind`.
- **e2e**: a minimal scene whose fragment shader declares
  `uniform float u_unused;` and never reads it. Real compilers (ANGLE,
  SwiftShader) strip it. The scene sets it every frame and steps a few
  frames; the test asserts no error was thrown and that the frame rendered
  (relative pixel check per the `write-e2e-test` skill).

## 10. Documentation and demo follow-up

- `material-uniforms.md`: replace the "Unused uniforms don't exist"
  gotcha with the rule in §5.1, and explain that the stripped/active
  distinction no longer matters to callers.
- Demo: no code change is required. The `highp` change in
  `background.shader.ts` stays, because the stars need 32-bit precision to
  render, but its comment no longer needs to warn about `u_time`.
