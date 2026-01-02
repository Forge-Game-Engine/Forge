"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanCodeSnippet = void 0;
/* eslint-disable sonarjs/regex-complexity */
/* eslint-disable sonarjs/slow-regex */
var cleanCodeSnippet = function (code) {
    // Remove single-line "// @ts-nocheck" comments
    var out = code.replaceAll(/^\s*\/\/\s*@ts-nocheck\s*$/gm, '');
    // Remove top-level ES module import declarations (single- or multi-line).
    // Anchored to line start so dynamic import(...) expressions are preserved.
    // Matches forms like:
    //   import defaultExport from 'module';
    //   import { a, b } from 'module';
    //   import type { T } from 'module';
    //   import 'module';
    out = out.replaceAll(/^\s*import(?:[\s\S]*?from\s*['"][^'"]+['"]|[\s\S]*?['"][^'"]+['"])?\s*;?\s*(?=\r?\n|$)/gm, '');
    // Replace calls like getImageUrl('file.png') with 'file.png'
    out = out.replaceAll(/getImageUrl\s*\(\s*([^)]+?)\s*\)/g, '$1');
    // Trim leading blank lines and collapse 3+ consecutive newlines to two.
    out = out.replace(/^\s*\n+/, '').replaceAll(/\n{3,}/g, '\n\n');
    return out;
};
exports.cleanCodeSnippet = cleanCodeSnippet;
