import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(srcRoot, '..');

const oldLayerDirs = ['config', 'controllers', 'routes', 'services', 'utils', 'middleware'];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });

describe('compatibility layout cleanup', () => {
  it('removes old layer folders and imports', () => {
    for (const dir of oldLayerDirs) {
      expect(existsSync(path.join(srcRoot, dir)), `src/${dir}`).toBe(false);
    }

    for (const file of sourceFiles(path.join(srcRoot, 'modules'))) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/src\/(?:config|controllers|routes)/);
      expect(text, file).not.toMatch(/\.\.\/(?:config|controllers|routes)\//);
    }
  });
});
