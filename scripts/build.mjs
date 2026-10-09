import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const three = path.join(root, 'node_modules/three');
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const installed = JSON.parse(await readFile(path.join(three, 'package.json'), 'utf8'));
if (installed.version !== manifest.dependencies.three) {
  throw new Error(`Expected Three.js ${manifest.dependencies.three}, found ${installed.version}. Run npm ci.`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'vendor/build'), { recursive: true });
await mkdir(path.join(dist, 'vendor/examples'), { recursive: true });
await mkdir(path.join(dist, 'assets'), { recursive: true });
for (const file of ['index.html', 'viewer.js', 'ferris-wheel.js', 'harbour-modeling.js',
  'harbour-layout.js', 'harbour-expansion.js', 'harbour-lighting.js', 'assets/harbour_town.glb']) {
  await cp(path.join(root, file), path.join(dist, file));
}
for (const file of ['three.module.js', 'three.core.js']) {
  await cp(path.join(three, 'build', file), path.join(dist, 'vendor/build', file));
}
await cp(path.join(three, 'examples/jsm'), path.join(dist, 'vendor/examples/jsm'), {
  recursive: true,
});
await cp(path.join(three, 'LICENSE'), path.join(dist, 'vendor/LICENSE'));
console.log(`Built dist/ with Three.js ${installed.version} and its MIT license.`);
