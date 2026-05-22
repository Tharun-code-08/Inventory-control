/**
 * Renders public/favicon.svg into PNG + ICO for browsers that cache /favicon.ico.
 * Run: node scripts/generate-favicons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const svg = readFileSync(join(publicDir, 'favicon.svg'), 'utf8');

function renderPng(size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  return resvg.render().asPng();
}

const png32 = renderPng(32);
const png180 = renderPng(180);

writeFileSync(join(publicDir, 'favicon-32.png'), png32);
writeFileSync(join(publicDir, 'apple-touch-icon.png'), png180);

const ico = await pngToIco([png32]);
writeFileSync(join(publicDir, 'favicon.ico'), ico);

console.log('Wrote favicon-32.png, apple-touch-icon.png, favicon.ico');
