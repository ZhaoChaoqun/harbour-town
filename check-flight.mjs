import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const source = fs.readFileSync(new URL('./viewer.js', import.meta.url), 'utf8');
const start = source.indexOf('function flightNoise(');
const end = source.indexOf('const smokeCanvas', start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({
  THREE,
  flightHeading: new THREE.Vector3(),
  steeringTarget: new THREE.Vector3(),
  flightEuler: new THREE.Euler(0, 0, 0, 'YXZ'),
});
vm.runInContext(source.slice(start, end), context);
const metrics = { minimumForwardDot: 1, maximumBank: 0, maximumTurnRate: 0, maximumAbsX: 0 };
for (let index = 0; index < 26; index++) {
  const layer = index < 10 ? 'rear' : index < 18 ? 'middle' : 'front';
  const bounds = layer === 'rear' ? { minY: 9.1, maxY: 12.3, minZ: -11, maxZ: -3.1 }
    : layer === 'middle' ? { minY: 6.1, maxY: 9.1, minZ: 1.4, maxZ: 5.4 }
      : { minY: 4.1, maxY: 7.9, minZ: 6.0, maxZ: 14.0 };
  const yaw = index * 1.731;
  const modelForward = new THREE.Vector3(Math.sin(yaw), -0.02, Math.cos(yaw)).normalize();
  const entry = {
    seed: index + 1, layer, bounds, obj: new THREE.Object3D(), modelForward,
    headingCorrection: new THREE.Quaternion().setFromUnitVectors(modelForward, new THREE.Vector3(0, 0, 1)),
    direction: new THREE.Vector3(), target: new THREE.Vector3(),
    yaw, pitch: 0, bank: 0, turn: 0, speed: 1.15, waypoint: 0, nextTargetTime: 0,
  };
  entry.obj.position.set(-12 + index * 0.9, (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2);
  context.chooseFlightTarget(entry, 0);
  for (let step = 1; step <= 10800; step++) {
    const previous = entry.obj.position.clone();
    context.flyGull(entry, step / 60, 1 / 60);
    const movement = entry.obj.position.clone().sub(previous).normalize();
    const facing = modelForward.clone().applyQuaternion(entry.obj.quaternion);
    const dot = facing.dot(movement);
    metrics.minimumForwardDot = Math.min(metrics.minimumForwardDot, dot);
    metrics.maximumBank = Math.max(metrics.maximumBank, Math.abs(entry.bank));
    metrics.maximumTurnRate = Math.max(metrics.maximumTurnRate, Math.abs(entry.turn));
    metrics.maximumAbsX = Math.max(metrics.maximumAbsX, Math.abs(entry.obj.position.x));
    assert.ok(dot > 0.9999, `Bird ${index} flies sideways/backwards at ${step}`);
    assert.ok(Math.abs(entry.turn) <= 0.60001);
    assert.ok(Math.abs(entry.bank) < 0.28);
    assert.ok(Math.abs(entry.pitch) <= 0.16001);
    assert.ok(entry.speed >= 0.94 && entry.speed <= 1.46);
    assert.ok(Number.isFinite(entry.obj.position.length()));
    assert.ok(Math.abs(entry.obj.position.x) < 19);
    assert.ok(entry.obj.position.y > bounds.minY - 0.7 && entry.obj.position.y < bounds.maxY + 0.7);
    const towerDistance = Math.hypot(entry.obj.position.x - 5.1, entry.obj.position.z + 1.8);
    assert.ok(entry.obj.position.y >= 12.1 || towerDistance > 0.85,
      `Bird ${index} intersects the tower at ${step}`);
  }
}
console.log(JSON.stringify({ ...metrics, simulatedSecondsPerBird: 180, birds: 26 }));
