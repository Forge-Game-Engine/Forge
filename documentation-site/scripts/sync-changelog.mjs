#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(__dirname, '..', '..', 'CHANGELOG.md');
const destinationPath = join(__dirname, '..', 'docs', 'changelog.md');

const frontMatter = `---
description: Notable changes to the Forge game engine, by version.
---

`;

const changelog = readFileSync(sourcePath, 'utf8');

writeFileSync(destinationPath, frontMatter + changelog);
console.log(`Synced ${sourcePath} -> ${destinationPath}`);
