import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createHarbourExpansion, connectHarbourExpansion } from './harbour-expansion.js';
import { connectPleasurePier } from './ferris-wheel.js';
import { HARBOUR_BUILDINGS, HARBOUR_PLATFORMS, architecturePoints } from './harbour-layout.js';

const town = createHarbourExpansion();
assert.equal(town.buildings.length, 10);
assert.equal(town.people.length, 32);
assert.equal(town.walkers.length, 6);
assert.equal(town.boats.length, 2);
assert.equal(town.lights.length, 4);
assert.equal(town.peopleMeshes.length, 3);
assert.equal(new Set(HARBOUR_BUILDINGS.map(building => building.color)).size, 10);
assert.ok(new Set(HARBOUR_BUILDINGS.map(building => building.floorHeight ?? 1.15)).size >= 4);
assert.equal(HARBOUR_BUILDINGS.filter(building => building.setback).length, 4);
assert.ok(town.staticMeshes.length <= 14, 'Buildings, piers and furnishings must be batched together');
for (const building of HARBOUR_BUILDINGS) {
  const platform = HARBOUR_PLATFORMS.find(platform => platform.name ===
    (building.x < 0 ? 'West neighbourhood' : 'East neighbourhood'));
  assert.ok(building.x - building.width / 2 - 0.15 >= platform.x - platform.width / 2);
  assert.ok(building.x + building.width / 2 + 0.15 <= platform.x + platform.width / 2);
  assert.ok(building.z - building.depth / 2 - 0.15 >= platform.z - platform.depth / 2);
  assert.ok(building.z + building.depth / 2 + 0.15 <= platform.z + platform.depth / 2);
}
for (let i = 0; i < town.buildings.length; i++) {
  for (let j = i + 1; j < town.buildings.length; j++) {
    const a = town.buildings[i], b = town.buildings[j];
    assert.ok(Math.abs(a.x - b.x) > (a.width + b.width) / 2 + 0.28
      || Math.abs(a.z - b.z) > (a.depth + b.depth) / 2 + 0.28,
    `${a.name} intersects ${b.name}`);
  }
}
const inBuilding = (x, z, building) => Math.abs(x - building.x) < building.width / 2 + 0.14
  && Math.abs(z - building.z) < building.depth / 2 + 0.14;
for (const [x, y, z] of town.people) {
  for (const building of town.buildings) {
    assert.ok(!inBuilding(x, z, building), `A grouped person stands inside ${building.name}`);
  }
  assert.ok([1.05, 1.3, 1.7].includes(y));
}
const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
let minimumWalkwayMargin = Infinity;
let minimumPedestrianDistance = Infinity;
for (let step = 0; step <= 2400; step++) {
  town.update(step / 10);
  const pedestrianPositions = [];
  for (const [index, walker] of town.walkers.entries()) {
    town.peopleMeshes[0].getMatrixAt(town.people.length + index, matrix);
    position.setFromMatrixPosition(matrix);
    pedestrianPositions.push(position.clone());
    assert.ok(Number.isFinite(position.length()));
    assert.ok(Math.abs(position.y - walker.height) < 0.007);
    for (const building of town.buildings) {
      assert.ok(!inBuilding(position.x, position.z, building),
        `${walker.name} enters ${building.name} at ${step / 10}s`);
    }
    if (walker.height === 1.05) {
      const margin = Math.min(position.x + 6.5, -0.5 - position.x, position.z - 4.7, 10.7 - position.z);
      minimumWalkwayMargin = Math.min(minimumWalkwayMargin, margin);
      assert.ok(margin > 0.17, `${walker.name} crosses the market railing`);
      for (const x of [-5.25, -3.45, -1.65]) {
        assert.ok(Math.abs(position.x - x) > 0.675 + 0.14
          || Math.abs(position.z - 6.3) > 0.325 + 0.14, 'A walker enters a market counter');
        for (const dx of [-0.72, 0.72]) for (const z of [5.63, 6.7]) {
          assert.ok(Math.hypot(position.x - x - dx, position.z - z) > 0.17,
            `${walker.name} hits a canopy post at ${step / 10}s: ${position.x}, ${position.z}`);
        }
      }
      for (let i = 0; i < pedestrianPositions.length; i++) {
        for (let j = i + 1; j < pedestrianPositions.length; j++) {
          const distance = pedestrianPositions[i].distanceTo(pedestrianPositions[j]);
          minimumPedestrianDistance = Math.min(minimumPedestrianDistance, distance);
          assert.ok(distance > 0.26, 'Pedestrian routes collide at a street crossing');
        }
        for (const [x, y, z] of town.people) {
          const distance = pedestrianPositions[i].distanceTo(new THREE.Vector3(x, y, z));
          minimumPedestrianDistance = Math.min(minimumPedestrianDistance, distance);
          assert.ok(distance > 0.26, 'A walker passes through a grouped person');
        }
      }
    } else if (walker.height === 1.3) {
      assert.ok(position.x > 9.85 && position.x < 14.35 && position.z > 1.95 && position.z < 5.25);
      for (const [x, z] of [[12.55, 3], [13.05, 3], [13.55, 3], [12.8, 3.5], [13.3, 3.5]]) {
        assert.ok(Math.abs(position.x - x) > 0.215 + 0.14 || Math.abs(position.z - z) > 0.215 + 0.14,
          'A porter walks through cargo');
      }
    }
  }
}
town.update(19.4);
const snapshot = () => ({
  matrices: town.peopleMeshes.map(mesh => Array.from(mesh.instanceMatrix.array)),
  boats: town.boats.map(boat => [boat.group.position.toArray(), boat.group.quaternion.toArray()]),
});
const paused = snapshot();
town.update(19.4);
assert.deepEqual(snapshot(), paused);
town.update(19.45);
assert.notDeepEqual(snapshot(), paused);
assert.throws(() => town.update(-1), RangeError);
assert.throws(() => town.update(NaN), RangeError);
town.setDusk(false);
assert.deepEqual(town.windowLevels.map(material => material.emissiveIntensity), [0.2, 0.5, 0.9]);
assert.ok(town.lights.every(({ light }) => light.intensity > 2));
town.setDusk(true);
assert.deepEqual(town.windowLevels.map(material => material.emissiveIntensity), [0.45, 0.95, 1.65]);
assert.ok(town.lights.every(({ light }) => !light.castShadow));
let meshes = 0, triangles = 0;
town.group.traverse(obj => {
  if (!obj.isMesh) return;
  meshes++;
  const vertices = obj.geometry.getAttribute('position');
  assert.equal(obj.geometry.getAttribute('normal').count, vertices.count);
  if (obj.material.vertexColors) assert.equal(obj.geometry.getAttribute('color').count, vertices.count);
  assert.ok(!obj.material.map, 'Procedural mesh surfaces must not depend on stripped UVs');
  triangles += (obj.geometry.index?.count ?? vertices.count) / 3 * (obj.isInstancedMesh ? obj.count : 1);
});
assert.ok(meshes <= 28 && triangles < 70000, 'The expanded city exceeds its geometry/draw batch budget');
assert.ok(architecturePoints().every(point => point.every(Number.isFinite)));

const bytes = fs.readFileSync(new URL('./assets/harbour_town.glb', import.meta.url));
const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject));
const model = gltf.scene;
model.updateMatrixWorld(true);
const animatedGroups = [];
model.traverse(obj => {
  if (obj.name.includes('animated_flight') || obj.name.includes('animated_gentle_bobbing')) animatedGroups.push(obj);
});
assert.equal(animatedGroups.filter(obj => obj.name.includes('animated_flight')).length, 26);
const originalBoats = animatedGroups.filter(obj => obj.name.includes('animated_gentle_bobbing'));
assert.equal(originalBoats.length, 2);
const boatTransforms = originalBoats.map(obj => obj.matrixWorld.toArray());
connectPleasurePier(model);
connectHarbourExpansion(model);
model.updateMatrixWorld(true);
assert.deepEqual(originalBoats.map(obj => obj.matrixWorld.toArray()), boatTransforms);
for (const name of ['Pleasure pier', 'Market stairs', 'Working dock stairs']) {
  const railings = [];
  model.traverse(obj => { if (obj.name === `${name} entrance railing`) railings.push(obj); });
  assert.equal(railings.length, 4);
}
const buoyPositions = [];
model.traverse(obj => {
  if (obj.isMesh && /^(Buoy_|Conical_navigation_buoy)/.test(obj.name)) {
    const point = obj.getWorldPosition(new THREE.Vector3());
    if (Math.abs(point.x + 7.3) < 0.001 && Math.abs(point.z - 12.6) < 0.001) buoyPositions.push(point);
  }
});
assert.equal(buoyPositions.length, 4, 'The buoy and its ripple must move together outside the market pier');
const scene = new THREE.Scene();
scene.add(town.group);
scene.updateMatrixWorld(true);
for (const boat of town.boats) {
  const bounds = new THREE.Box3().setFromObject(boat.group);
  for (const platform of HARBOUR_PLATFORMS) {
    const platformBounds = new THREE.Box3(
      new THREE.Vector3(platform.x - platform.width / 2, platform.height - 0.2, platform.z - platform.depth / 2),
      new THREE.Vector3(platform.x + platform.width / 2, platform.height + 0.7, platform.z + platform.depth / 2)
    );
    assert.ok(!bounds.intersectsBox(platformBounds), `${boat.group.name} intersects ${platform.name}`);
  }
}
console.log(JSON.stringify({
  buildings: town.buildings.length, steppedBuildings: 4, wallColors: 10,
  people: 38, walkers: 6, sampledWalkingSteps: 2401, minimumWalkwayMargin, minimumPedestrianDistance,
  additionalMooredBoats: 2, gatheringLights: 4, staticBatches: town.staticMeshes.length,
  meshBatches: meshes, triangles, originalGulls: 26, originalBoats: 2, connectedEntrances: 3,
}));
