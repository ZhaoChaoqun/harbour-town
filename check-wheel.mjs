import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFerrisWheel, connectPleasurePier, FERRIS_WHEEL } from './ferris-wheel.js';

const wheel = createFerrisWheel();
const scene = new THREE.Scene();
scene.add(wheel.group);
assert.equal(wheel.gondolas.length, 10);
const meshes = [];
let lights = 0;
wheel.group.traverse(obj => {
  if (obj.isMesh) meshes.push(obj);
  if (obj.isLight) lights++;
});
assert.ok(meshes.length <= 15, `Too many wheel/pier batches: ${meshes.length}`);
assert.equal(meshes.filter(mesh => mesh.isInstancedMesh).length, 4);
const cabins = meshes.filter(mesh => mesh.isInstancedMesh && mesh.name.startsWith('Ferris gondolas'));
assert.equal(cabins.length, 3);
cabins.forEach(mesh => {
  assert.equal(mesh.count, 10);
  assert.ok(mesh.castShadow && mesh.receiveShadow);
  mesh.geometry.computeBoundingBox();
});
const up = new THREE.Vector3(0, 1, 0);
const quaternion = new THREE.Quaternion();
const matrix = new THREE.Matrix4();
const worldMatrix = new THREE.Matrix4();
let minimumDeckClearance = Infinity;
let minimumUprightDot = 1;
let maximumCabinDepth = 0;
for (let step = 0; step <= 960; step++) {
  wheel.update(step / 960 * FERRIS_WHEEL.revolutionSeconds);
  scene.updateMatrixWorld(true);
  for (let i = 0; i < wheel.gondolas.length; i++) {
    wheel.gondolas[i].getWorldQuaternion(quaternion);
    const uprightDot = up.clone().applyQuaternion(quaternion).dot(up);
    minimumUprightDot = Math.min(minimumUprightDot, uprightDot);
    assert.ok(uprightDot > 0.999999999, `Cabin ${i} tilts at step ${step}`);
    for (const cabin of cabins) {
      cabin.getMatrixAt(i, matrix);
      worldMatrix.multiplyMatrices(cabin.matrixWorld, matrix);
      const bounds = cabin.geometry.boundingBox.clone().applyMatrix4(worldMatrix);
      const clearance = bounds.min.y - FERRIS_WHEEL.deckHeight;
      minimumDeckClearance = Math.min(minimumDeckClearance, clearance);
      assert.ok(clearance > 0.4, `Cabin ${i} hits the platform at step ${step}`);
      assert.ok(bounds.max.y < 8.1, 'The wheel must stay near the main rooftop height');
      assert.ok(bounds.max.x < -13.5, 'Cabins must stay outside the existing quay/buildings');
      const localBounds = cabin.geometry.boundingBox.clone().applyMatrix4(matrix);
      maximumCabinDepth = Math.max(maximumCabinDepth, Math.abs(localBounds.min.z), Math.abs(localBounds.max.z));
      assert.ok(maximumCabinDepth < 0.365, 'Cabins must clear both rim faces and the A-frame supports');
      const pivotMatrix = wheel.gondolas[i].matrixWorld;
      for (let element = 0; element < 16; element++) {
        assert.ok(Math.abs(worldMatrix.elements[element] - pivotMatrix.elements[element]) < 0.00001,
          'Instanced cabin geometry does not follow its upright pivot');
      }
    }
  }
}
wheel.update(37.5);
const pausedMatrices = cabins.map(mesh => Array.from(mesh.instanceMatrix.array));
wheel.update(37.5);
assert.deepEqual(cabins.map(mesh => Array.from(mesh.instanceMatrix.array)), pausedMatrices);
wheel.update(37.55);
assert.ok(Math.abs(wheel.rotor.rotation.z - 37.55 / 120 * Math.PI * 2) < 1e-12);
wheel.update(0);
const initialMatrices = cabins.map(mesh => Array.from(mesh.instanceMatrix.array));
wheel.update(120);
assert.deepEqual(cabins.map(mesh => Array.from(mesh.instanceMatrix.array)), initialMatrices);
assert.throws(() => wheel.update(-1), RangeError);
assert.throws(() => wheel.update(Infinity), RangeError);
const bulbs = meshes.find(mesh => mesh.name === 'Ferris rim bulbs');
assert.equal(bulbs.count, 40);
assert.ok(!bulbs.castShadow);
wheel.setDusk(true);
assert.equal(bulbs.material.emissiveIntensity, 1.2);
wheel.setDusk(false);
assert.equal(bulbs.material.emissiveIntensity, 0.15);
assert.ok(!meshes.some(mesh => mesh.material.map), 'Wheel materials must not depend on textures');
assert.equal(lights, 0, 'Do not add per-bulb lights');

const quay = new THREE.Group();
const railingMaterial = new THREE.MeshStandardMaterial();
for (const [index, y] of [[12, 2], [13, 2.42]]) {
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 7.05, 8), railingMaterial);
  rail.name = THREE.PropertyBinding.sanitizeNodeName(`Quay railing horizontal.0${index}`);
  rail.rotation.x = Math.PI / 2;
  rail.position.set(-13, y, -1.975);
  quay.add(rail);
}
for (const [index, z] of [0.909, 0.268, -0.373].entries()) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8), railingMaterial);
  post.name = `Quay_railing_upright${index}`;
  post.position.set(-13, 2.06, z);
  quay.add(post);
}
connectPleasurePier(quay);
assert.equal(quay.children.filter(obj => obj.name === 'Pleasure pier entrance railing').length, 4);
assert.equal(quay.children.filter(obj => obj.name === 'Pleasure pier entrance post').length, 2);
assert.equal(quay.children.filter(obj => obj.name.startsWith('Quay_railing_upright')).length, 1);
quay.updateMatrixWorld(true);
for (const segment of quay.children.filter(obj => obj.name === 'Pleasure pier entrance railing')) {
  const bounds = new THREE.Box3().setFromObject(segment);
  assert.ok(bounds.max.z <= FERRIS_WHEEL.entranceMinZ + 0.00001
    || bounds.min.z >= FERRIS_WHEEL.entranceMaxZ - 0.00001, 'The quay entrance is blocked');
}
assert.throws(() => connectPleasurePier(new THREE.Group()), /missing Quay railing/);
console.log(JSON.stringify({
  gondolas: wheel.gondolas.length, revolutionSeconds: FERRIS_WHEEL.revolutionSeconds,
  sampledRotationSteps: 961, minimumDeckClearance, minimumUprightDot,
  maximumCabinDepth, meshBatches: meshes.length, instancedBatches: 4, bulbs: bulbs.count,
}));
