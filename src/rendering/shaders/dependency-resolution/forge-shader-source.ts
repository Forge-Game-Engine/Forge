export class ForgeShaderSource {
  private readonly _rawSource: string;
  private readonly _includes: Set<string> = new Set();
  private readonly _properties: Map<string, string> = new Map();

  private _name!: string;

  /**
   * Constructs a new instance of the `ShaderMetadata` class.
   * @param rawSource - The raw source code of the shader.
   */
  constructor(rawSource: string) {
    this._rawSource = rawSource;

    this._parseRawSource(rawSource);
  }

  /**
   * Gets the raw source of the shader.
   */
  get rawSource(): string {
    return this._rawSource;
  }

  /**
   * Gets the includes of the shader.
   */
  get includes(): Set<string> {
    return this._includes;
  }

  /**
   * Gets the includes of the shader.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Gets the value of a property by its name.
   * @param name - The name of the property.
   * @returns The value of the property, or `null` if the property does not exist.
   */
  public getPropertyValue(name: string): string | null {
    return this._properties.get(name) ?? null;
  }

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

  private _processLine(line: string, lineNumber: number): void {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('#include')) {
      this._parseInclude(line, lineNumber);
    } else if (trimmedLine.startsWith('#property')) {
      this._parseProperty(line, lineNumber);
    }
  }

  private _parseInclude(line: string, lineNumber: number): void {
    const match = line.match(/#include <(\w+)>/);

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

  private _parseProperty(line: string, lineNumber: number): void {
    const match = line.match(/#property (\w+)\s*:\s*([\w.]+)/);

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
