/**
 * Represents a shader source file with metadata extraction capabilities.
 *
 * This class parses shader source code to extract:
 * - Shader name (from #property name directive)
 * - Include dependencies (from #include directives)
 * - Custom properties (from #property directives)
 *
 * @example
 * ```typescript
 * const shaderSource = new ForgeShaderSource(`
 *   #property name: myShader
 *   #property version: 1.0
 *   #include <common>
 *
 *   void main() {
 *     gl_FragColor = vec4(1.0);
 *   }
 * `);
 *
 * console.log(shaderSource.name); // "myShader"
 * console.log(shaderSource.includes); // Set { "common" }
 * console.log(shaderSource.getPropertyValue('version')); // "1.0"
 * ```
 */
export class ForgeShaderSource {
  private readonly _rawSource: string;
  private readonly _includes: Set<string> = new Set();
  private readonly _properties: Map<string, string> = new Map();

  private _name!: string;

  /**
   * Constructs a new instance of the `ForgeShaderSource` class.
   * Parses the provided shader source code and extracts metadata.
   *
   * @param rawSource - The raw source code of the shader.
   * @throws {Error} If the shader source does not contain a valid #property name directive.
   * @throws {Error} If any #include or #property directive has invalid syntax.
   */
  constructor(rawSource: string) {
    this._rawSource = rawSource;

    this._parseRawSource(rawSource);
  }

  /**
   * Gets the raw, unprocessed source code of the shader.
   *
   * @returns The raw shader source code as provided to the constructor.
   */
  get rawSource(): string {
    return this._rawSource;
  }

  /**
   * Gets the set of include dependencies declared in the shader.
   * These are extracted from #include directives in the source.
   *
   * @returns A Set containing the names of all included shaders.
   */
  get includes(): Set<string> {
    return this._includes;
  }

  /**
   * Gets the name of the shader.
   * The name is extracted from the required #property name directive.
   *
   * @returns The shader name.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Gets the value of a custom property by its name.
   * Properties are defined using #property directives in the shader source.
   * Property names are case-insensitive.
   *
   * @param name - The name of the property to retrieve.
   * @returns The value of the property, or `null` if the property does not exist.
   *
   * @example
   * ```typescript
   * // Shader source contains: #property version: 1.0
   * shader.getPropertyValue('version'); // "1.0"
   * shader.getPropertyValue('VERSION'); // "1.0" (case-insensitive)
   * shader.getPropertyValue('missing'); // null
   * ```
   */
  public getPropertyValue(name: string): string | null {
    return this._properties.get(name.toLowerCase()) ?? null;
  }

  /**
   * Parses the raw shader source code line by line to extract metadata.
   * Processes #include and #property directives, and validates that a name property exists.
   *
   * @param source - The shader source code to parse.
   * @throws {Error} If the shader source does not contain a #property name directive.
   * @private
   */
  private _parseRawSource(source: string): void {
    const lines = source.split('\n');

    lines.forEach((line, lineNumber) => {
      this._processLine(line, lineNumber);
    });

    const name = this.getPropertyValue('name');

    if (!name) {
      throw new Error(
        `Unable to find shader name. Please ensure the shader source contains a #property name: value directive.`,
      );
    }

    this._name = name;
  }

  /**
   * Processes a single line of shader source code.
   * Identifies and delegates parsing to appropriate handlers for #include and #property directives.
   *
   * @param line - The line of shader source to process.
   * @param lineNumber - The zero-based line number for error reporting.
   * @private
   */
  private _processLine(line: string, lineNumber: number): void {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('#include')) {
      this._parseInclude(line, lineNumber);
    } else if (trimmedLine.startsWith('#property')) {
      this._parseProperty(line, lineNumber);
    }
  }

  /**
   * Parses an #include directive from a shader line.
   * Expected format: #include <name>
   *
   * @param line - The line containing the #include directive.
   * @param lineNumber - The zero-based line number for error reporting.
   * @throws {Error} If the #include directive has invalid syntax.
   * @private
   */
  private _parseInclude(line: string, lineNumber: number): void {
    const match = new RegExp(/#include <(\w+)>/).exec(line);

    if (!match) {
      throw new Error(
        `Invalid shader syntax at line ${lineNumber + 1}:${line.indexOf('#include') + 1}. Expected "#include <name>" but got "${line.trim()}"`,
      );
    }

    const [fullMatch, name] = match;
    const column = line.indexOf(fullMatch) + 1;

    if (!name) {
      throw new Error(
        `Invalid shader syntax at line ${lineNumber + 1}:${column}. Expected "#include <name>" but got "${fullMatch}"`,
      );
    }

    this._includes.add(name);
  }

  /**
   * Parses a #property directive from a shader line.
   * Expected format: #property name: value
   * Property names are stored in lowercase for case-insensitive retrieval.
   *
   * @param line - The line containing the #property directive.
   * @param lineNumber - The zero-based line number for error reporting.
   * @throws {Error} If the #property directive has invalid syntax.
   * @private
   */
  private _parseProperty(line: string, lineNumber: number): void {
    const match = new RegExp(/#property (\w+)\s*:\s*([\w.]+)/).exec(line);

    if (!match) {
      throw new Error(
        `Invalid shader syntax at line ${lineNumber + 1}:${line.indexOf('#property') + 1}. Expected "#property name: value" but got "${line.trim()}"`,
      );
    }

    const [fullMatch, name, value] = match;

    if (!name || !value) {
      throw new Error(
        `Invalid shader syntax at line ${lineNumber + 1}:${line.indexOf('#property') + 1}. Expected "#property name: value" but got "${fullMatch}"`,
      );
    }

    this._properties.set(name.toLowerCase(), value);
  }
}
