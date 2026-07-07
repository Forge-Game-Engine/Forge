import { ShaderPreProcessor } from './shader-pre-processor';

export interface ForgeShaderPragma {
  lineNumber: number;
  rawLine: string;
  identifier: string;
  values: string[];
}

/**
 * Represents a shader source file with metadata.
 */
export class ForgeShaderSource {
  private readonly _rawSource: string;
  private readonly _pragmas: ForgeShaderPragma[] = [];

  private _preparedSource: string;

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
    this._preparedSource = rawSource;

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
   * Gets the prepared source code of the shader.
   * This is the source code after any preprocessing steps, such as resolving includes.
   *
   * @returns The prepared shader source code.
   */
  get preparedSource(): string {
    return this._preparedSource;
  }

  /**
   * Applies a single pre-processor to the shader source.
   * The pre-processor can modify the shader source, for example by resolving includes or other transformations.
   *
   * @param preProcessor - The pre-processor to apply.
   */
  public applyPreProcessor(preProcessor: ShaderPreProcessor): void {
    this._preparedSource = preProcessor.process(this);
  }

  /**
   * Applies multiple pre-processors to the shader source in sequence.
   * Each pre-processor can modify the shader source, for example by resolving includes or other transformations.
   *
   * @param preProcessors - An array of pre-processors to apply.
   */
  public applyPreProcessors(preProcessors: ShaderPreProcessor[]): void {
    for (const preProcessor of preProcessors) {
      this.applyPreProcessor(preProcessor);
    }
  }

  public getPragmas(identifier: string): ForgeShaderPragma[] {
    return this._pragmas.filter((pragma) => pragma.identifier === identifier);
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
  }

  /**
   * Processes a single line of shader source code.
   * Identifies and delegates parsing to appropriate handlers for #include and #property directives.
   *
   * @param line - The line of shader source to process.
   * @param lineNumber - The zero-based line number for error reporting.
   */
  private _processLine(line: string, lineNumber: number): void {
    if (/#pragma\s+forge/.test(line)) {
      this._parsePragma(line, lineNumber);
    }
  }

  /**
   * Parses a #pragma forge directive from a shader line.
   * Expected format: #pragma forge name(value)
   *
   * @param line - The line containing the #pragma forge directive.
   * @param lineNumber - The zero-based line number for error reporting.
   * @throws {Error} If the #pragma forge directive has invalid syntax.
   */
  private _parsePragma(line: string, lineNumber: number): void {
    // Completely safe from backtracking because [^)]* and \) are mutually exclusive
    const match = /^\s*#pragma\s+forge\s+(\w+)(?:\s*\(([^)]*)\))?/.exec(line);

    if (!match) {
      throw new Error(
        `Invalid shader syntax at line ${lineNumber + 1}:${line.indexOf('#pragma forge') + 1}. Expected "#pragma forge identifier(value1, value2, ...)" but got "${line.trim()}"`,
      );
    }

    const [fullMatch, identifier, rawValues] = match;
    const column = line.indexOf(fullMatch) + 1;

    if (!identifier) {
      throw new Error(
        `Invalid shader syntax, missing identifier at line ${lineNumber + 1}:${column}. Expected "#pragma forge identifier(value1, value2, ...)" but got "${fullMatch}"`,
      );
    }

    // The JS layer handles the cleanup cleanly without regex overhead
    const trimmedValues = rawValues ? rawValues.trim() : '';
    const values = trimmedValues
      ? trimmedValues.split(',').map((v) => v.trim())
      : [];

    const pragma = {
      lineNumber,
      rawLine: line,
      identifier: identifier,
      values: values,
    };

    this._pragmas.push(pragma);
  }
}
