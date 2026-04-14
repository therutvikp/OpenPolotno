import { defineConfig } from 'tsup';
import { glob } from 'glob';
import path from 'path';

// Collect all entry points to preserve folder structure
const entries = glob.sync('src/**/*.{ts,tsx}', {
  ignore: ['src/**/*.test.*', 'src/**/*.spec.*'],
});

const entryMap: Record<string, string> = {};
entries.forEach((file) => {
  const key = file.replace(/^src\//, '').replace(/\.(ts|tsx)$/, '');
  entryMap[key] = file;
});

export default defineConfig({
  entry: entryMap,
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  external: [
    // React ecosystem
    'react', 'react-dom', 'react-konva', 'react-konva-utils', 'react-color',
    'reactcss', 'react-sortablejs', 'react-window', 'mobx-react-lite',
    // MobX
    'mobx', 'mobx-state-tree',
    // BlueprintJS
    '@blueprintjs/core', '@blueprintjs/icons', '@blueprintjs/select',
    // Other heavy deps
    'konva', 'quill', 'swr', 'use-image', 'sortablejs', 'nanoid',
    'gradient-parser', 'gifuct-js', 'fast-json-patch',
    'svg-round-corners', 'rasterizehtml', 'dompurify', 'cssom', 'mensch',
    '@meronex/icons',
  ],
  esbuildOptions(options) {
    options.jsx = 'transform';
    options.jsxFactory = 'React.createElement';
    options.jsxFragment = 'React.Fragment';
  },
  treeshake: false,
});
