/**
 * A `uniform` declared in a shader's source.
 */
export interface UniformSourceDeclaration {
  /** The declared name, without any `[n]` suffix. */
  readonly name: string;
  /**
   * The declared GLSL type name, e.g. `'vec4'` or `'sampler2D'`. The
   * `mat2x2`, `mat3x3` and `mat4x4` aliases are reported as `mat2`, `mat3`
   * and `mat4`. A struct-typed uniform reports its struct's name.
   */
  readonly glslTypeName: string;
  /** Whether the uniform is declared as an array, even one of size `1`. */
  readonly isArray: boolean;
  /** The array size, `1` for a uniform that isn't an array. */
  readonly size: number;
}

/** GLSL's alternative spellings of the square matrix types. */
const matrixTypeAliases: ReadonlyMap<string, string> = new Map([
  ['mat2x2', 'mat2'],
  ['mat3x3', 'mat3'],
  ['mat4x4', 'mat4'],
]);

const precisionQualifiers: ReadonlySet<string> = new Set([
  'lowp',
  'mediump',
  'highp',
]);

const identifierPattern = /^[A-Za-z_]\w*$/;
const integerLiteralPattern = /^(\d+)[uU]?$/;

/** One declarator of a `uniform` statement, before its size is resolved. */
interface UniformDeclarator {
  readonly name: string;
  /** The text between `[` and `]`, or `null` for a uniform that isn't an array. */
  readonly sizeExpression: string | null;
}

/** The syntax of one `uniform` statement. */
interface UniformStatement {
  readonly glslTypeName: string;
  readonly declarators: readonly UniformDeclarator[];
}

/**
 * Whether a line of GLSL is a complete `uniform` declaration statement
 * (not a uniform block), such as `uniform highp vec4 u_waves[4], u_color;`.
 * Recognizes exactly the statements {@link parseUniformDeclarations} reads.
 * @param line - The line to test.
 * @returns `true` if the line declares one or more uniforms.
 */
export const isUniformDeclarationLine = (line: string): boolean => {
  const match = /^\s*(?:layout\s*\([^)]*\)\s*)?uniform\b([^;{}]*);/.exec(
    stripComments(line),
  );

  return match !== null && readUniformStatement(match[1]) !== null;
};

/**
 * Reads the `uniform` declarations out of a GLSL source.
 *
 * Comments are ignored. Array sizes can be integer literals, or names
 * defined by `#define NAME <integer>` or `const int NAME = <integer>;`.
 * Both array spellings (`vec4 u_x[4]` and `vec4[4] u_x`), several
 * declarators in one statement, precision qualifiers and `layout(...)`
 * qualifiers are accepted. Uniform blocks (`uniform Block { ... };`) are
 * skipped. Preprocessor conditionals aren't evaluated, so a uniform declared
 * inside an inactive `#if` branch is still reported.
 * @param source - The GLSL source, with `#include`s already resolved.
 * @param shaderName - The shader's name, used in error messages.
 * @returns The declarations by name, in declaration order.
 * @throws An error if an array size isn't an integer literal, `#define` or
 * `const int`, if a declaration can't be read, or if the same name is
 * declared twice with a different type or size.
 */
export const parseUniformDeclarations = (
  source: string,
  shaderName: string,
): ReadonlyMap<string, UniformSourceDeclaration> => {
  const code = stripComments(source);
  const constants = collectIntegerConstants(code);
  // Directives are never declarations, and one such as `#define U uniform`
  // would otherwise read as the start of one.
  const statements = code.replaceAll(/^[ \t]*#[^\n]*/gm, '');
  const declarations = new Map<string, UniformSourceDeclaration>();

  // A statement ends at `;`, or at `{` for a uniform block or an inline
  // struct, whose members never carry the `uniform` keyword themselves.
  for (const match of statements.matchAll(/\buniform\b([^;{}]*)([;{}])/g)) {
    const [, body, terminator] = match;

    if (terminator !== ';') {
      continue;
    }

    const statement = readUniformStatement(body);

    if (statement === null) {
      throw new Error(
        `Unable to read the uniform declaration "uniform${body};" in shader "${shaderName}".`,
      );
    }

    for (const { name, sizeExpression } of statement.declarators) {
      addUniformDeclaration(
        declarations,
        {
          name,
          glslTypeName: statement.glslTypeName,
          isArray: sizeExpression !== null,
          size:
            sizeExpression === null
              ? 1
              : resolveArraySize(sizeExpression, name, constants, shaderName),
        },
        `shader "${shaderName}"`,
      );
    }
  }

  return declarations;
};

/**
 * Replaces each `/* *\/` comment with a space and removes each `//` comment,
 * in one pass over the source, so an unterminated `/*` can't make it
 * scan the rest of the source again (it comments out everything after it, as
 * it does in GLSL).
 */
const stripComments = (source: string): string => {
  const parts: string[] = [];
  let copiedUpTo = 0;
  let index = source.indexOf('/', copiedUpTo);

  while (index !== -1) {
    const next = source.charAt(index + 1);

    if (next !== '*' && next !== '/') {
      index = source.indexOf('/', index + 1);

      continue;
    }

    parts.push(source.slice(copiedUpTo, index));

    const isBlock = next === '*';
    const end = isBlock
      ? source.indexOf('*/', index + 2)
      : source.indexOf('\n', index + 2);

    if (isBlock) {
      parts.push(' ');
    }

    if (end === -1) {
      return parts.join('');
    }

    copiedUpTo = isBlock ? end + 2 : end;
    index = source.indexOf('/', copiedUpTo);
  }

  parts.push(source.slice(copiedUpTo));

  return parts.join('');
};

const collectIntegerConstants = (code: string): Map<string, number> => {
  const constants = new Map<string, number>();

  for (const [, name, value] of code.matchAll(
    /^[ \t]*#[ \t]*define[ \t]+(\w+)[ \t]+(\d+)[uU]?[ \t]*$/gm,
  )) {
    constants.set(name, Number(value));
  }

  for (const [, body] of code.matchAll(/\bconst\b([^;]*);/g)) {
    // `[precision] int|uint NAME = <integer>`
    const tokens = (body.match(/\w+|\S/g) ?? []).filter(
      (token) => !precisionQualifiers.has(token),
    );
    const [type, name, equals, value] = tokens;
    const literal = integerLiteralPattern.exec(value ?? '');

    if (
      tokens.length === 4 &&
      (type === 'int' || type === 'uint') &&
      equals === '=' &&
      literal !== null
    ) {
      constants.set(name, Number(literal[1]));
    }
  }

  return constants;
};

/**
 * Reads the syntax of a `uniform` statement from its body (everything
 * between `uniform` and `;`): an optional precision qualifier, a type, an
 * optional `[size]`, then comma-separated names, each with an optional
 * `[size]`.
 * @returns The statement, or `null` if the body isn't one.
 */
const readUniformStatement = (body: string): UniformStatement | null => {
  const tokens: string[] = body.match(/\w+|\S/g) ?? [];
  let index = precisionQualifiers.has(tokens.at(0) ?? '') ? 1 : 0;

  const readIdentifier = (): string | null => {
    const token = tokens.at(index);

    if (token === undefined || !identifierPattern.test(token)) {
      return null;
    }

    index++;

    return token;
  };

  /** `undefined` when the brackets don't close. */
  const readArraySize = (): string | null | undefined => {
    if (tokens.at(index) !== '[') {
      return null;
    }

    const closing = tokens.indexOf(']', index);

    if (closing === -1) {
      return undefined;
    }

    const expression = tokens.slice(index + 1, closing).join(' ');

    index = closing + 1;

    return expression;
  };

  const rawTypeName = readIdentifier();
  const typeArraySize = readArraySize();

  if (rawTypeName === null || typeArraySize === undefined) {
    return null;
  }

  const declarators: UniformDeclarator[] = [];

  do {
    const name = readIdentifier();
    const nameArraySize = readArraySize();

    if (
      name === null ||
      nameArraySize === undefined ||
      (typeArraySize !== null && nameArraySize !== null)
    ) {
      return null;
    }

    declarators.push({ name, sizeExpression: typeArraySize ?? nameArraySize });
  } while (tokens.at(index++) === ',');

  if (index <= tokens.length) {
    return null;
  }

  return {
    glslTypeName: matrixTypeAliases.get(rawTypeName) ?? rawTypeName,
    declarators,
  };
};

const resolveArraySize = (
  expression: string,
  name: string,
  constants: ReadonlyMap<string, number>,
  shaderName: string,
): number => {
  const literal = integerLiteralPattern.exec(expression);
  const size = literal ? Number(literal[1]) : constants.get(expression);

  if (size === undefined || size < 1) {
    throw new Error(
      `Uniform "${name}" in shader "${shaderName}" has the array size "${expression}", which Forge can't resolve. Use an integer literal, a "#define NAME <integer>" or a "const int NAME = <integer>;" for the size.`,
    );
  }

  return size;
};

/**
 * Adds a declaration, allowing an identical redeclaration (e.g. in both
 * branches of an `#if`) and rejecting a conflicting one.
 * @throws An error if `name` is already declared with a different type or
 * size.
 * @param declarations - The declarations found so far, by name.
 * @param declaration - The declaration to add.
 * @param sourceDescription - Where the declarations come from, for the
 * error message (e.g. `shader "sprite.frag"`).
 */
export const addUniformDeclaration = (
  declarations: Map<string, UniformSourceDeclaration>,
  declaration: UniformSourceDeclaration,
  sourceDescription: string,
): void => {
  const existing = declarations.get(declaration.name);

  if (existing === undefined) {
    declarations.set(declaration.name, declaration);

    return;
  }

  if (
    existing.glslTypeName !== declaration.glslTypeName ||
    existing.isArray !== declaration.isArray ||
    existing.size !== declaration.size
  ) {
    throw new Error(
      `Uniform "${declaration.name}" is declared as both ${describeDeclaration(existing)} and ${describeDeclaration(declaration)} in ${sourceDescription}.`,
    );
  }
};

const describeDeclaration = ({
  glslTypeName,
  isArray,
  size,
}: UniformSourceDeclaration): string =>
  isArray ? `${glslTypeName}[${size}]` : glslTypeName;
