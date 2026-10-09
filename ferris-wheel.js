import * as THREE from 'three';
import { createGeometryBatch, openQuayRailing } from './harbour-modeling.js';
import { FERRIS_WHEEL } from './harbour-layout.js';

export { FERRIS_WHEEL };

export function connectPleasurePier(root) {
  openQuayRailing(root, {
    names: ['Quay railing horizontal.012', 'Quay railing horizontal.013'],
    axis: 'z', fixed: FERRIS_WHEEL.entranceX,
    min: FERRIS_WHEEL.entranceMinZ, max: FERRIS_WHEEL.entranceMaxZ, label: 'Pleasure pier',
  });
}

export function createFerrisWheel() {
  const group = new THREE.Group();
  group.name = 'Pleasure pier';
  group.position.set(FERRIS_WHEEL.x, 0, FERRIS_WHEEL.z);
  const wheel = new THREE.Group();
  wheel.name = 'Ferris wheel';
  wheel.rotation.y = FERRIS_WHEEL.yaw;
  group.add(wheel);

  const cream = new THREE.MeshStandardMaterial({
    name: 'Salt-worn cream frame', color: '#d6d4b6', roughness: 0.78, metalness: 0.15,
  });
  const iron = new THREE.MeshStandardMaterial({
    name: 'Dark quay iron', color: '#3d564e', roughness: 0.82, metalness: 0.25,
  });
  const timber = new THREE.MeshStandardMaterial({
    name: 'Pleasure pier timber', color: '#927f63', roughness: 0.95,
  });
  const teal = new THREE.MeshStandardMaterial({
    name: 'Faded teal trim', color: '#63867c', roughness: 0.85, metalness: 0.1,
  });
  const cabinPaint = new THREE.MeshStandardMaterial({
    name: 'Muted cabin paint', color: '#ffffff', roughness: 0.82, metalness: 0.1,
  });
  const bulbMaterial = new THREE.MeshStandardMaterial({
    name: 'Small warm bulbs', color: '#f2dfb5', emissive: '#ffd4a1',
    emissiveIntensity: 0.4, roughness: 0.65,
  });
  const bandMaterial = new THREE.MeshStandardMaterial({
    name: 'Warm rim tracing', color: '#f0cfa0', emissive: '#ffd0a0',
    emissiveIntensity: 0.15, roughness: 0.7,
  });
  const unlit = new Set([bulbMaterial, bandMaterial]);
  const batches = (parent, name) => createGeometryBatch(parent, name, unlit);

  const pier = batches(group, 'Pleasure pier');
  for (let plank = 0; plank < 20; plank++) {
    pier.box(timber, [0, 1.64, -2.1 + (plank + 0.5) * 0.23], [6.4, 0.12, 0.214]);
  }
  for (const z of [-1.95, 0.2, 2.35]) {
    pier.box(timber, [0, 1.5, z], [6.55, 0.16, 0.14]);
  }
  for (const x of [-3.2, 3.2]) {
    pier.box(timber, [x, 1.54, 0.2], [0.12, 0.25, 4.7]);
  }
  for (let plank = 0; plank < 28; plank++) {
    pier.box(timber, [1.75, 1.64, -8.15 + (plank + 0.5) * 6.15 / 28],
      [1.1, 0.12, 6.15 / 28 - 0.016]);
  }
  pier.box(timber, [2.385, 1.64, -7.475], [0.19, 0.12, 1.35]);
  for (const z of [-7.65, -5.2, -2.75]) {
    pier.box(timber, [1.75, 1.5, z], [1.22, 0.16, 0.14]);
    for (const x of [1.27, 2.23]) pier.rod(timber, [x, -0.55, z], [x, 1.58, z], 0.09);
  }
  for (const x of [-2.85, -0.1, 2.85]) {
    for (const z of [-1.85, 2.2]) {
      pier.rod(timber, [x, -0.55, z], [x, 1.58, z], 0.09);
    }
  }
  function railing(start, end) {
    for (const y of [2.0, 2.42]) {
      pier.rod(iron, [start[0], y, start[1]], [end[0], y, end[1]], 0.018);
    }
    const steps = Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / 0.7);
    for (let i = 0; i <= steps; i++) {
      const x = THREE.MathUtils.lerp(start[0], end[0], i / steps);
      const z = THREE.MathUtils.lerp(start[1], end[1], i / steps);
      pier.rod(iron, [x, 1.7, z], [x, 2.42, z], 0.025);
    }
  }
  railing([-3.2, -2.1], [1.2, -2.1]);
  railing([2.3, -2.1], [3.2, -2.1]);
  railing([-3.2, 2.5], [3.2, 2.5]);
  railing([-3.2, -2.1], [-3.2, 2.5]);
  railing([3.2, -2.1], [3.2, 2.5]);
  railing([1.2, -8.15], [1.2, -2.1]);
  railing([2.3, -6.8], [2.3, -2.1]);
  railing([1.2, -8.15], [2.4, -8.15]);
  pier.box(teal, [2.2, 1.97, 1.75], [0.55, 0.54, 0.5]);
  pier.box(cream, [2.2, 2.28, 1.75], [0.66, 0.08, 0.57]);
  pier.rod(iron, [2.2, 2.3, 1.52], [2.2, 2.7, 1.52], 0.025);
  pier.box(cream, [2.2, 2.59, 1.52], [0.5, 0.24, 0.04]);
  pier.box(timber, [-2.35, 2.02, 1.65], [0.75, 0.1, 0.35]);
  pier.box(timber, [-2.35, 2.22, 1.43], [0.75, 0.24, 0.06]);
  for (const x of [-2.62, -2.08]) {
    pier.rod(iron, [x, 1.7, 1.65], [x, 2.2, 1.65], 0.025);
  }
  for (const x of [-2.8, 2.8]) {
    pier.rod(iron, [x, 1.7, 2.15], [x, 2.97, 2.15], 0.025);
    pier.box(bulbMaterial, [x, 2.88, 2.15], [0.1, 0.14, 0.1]);
    pier.box(iron, [x, 2.98, 2.15], [0.18, 0.05, 0.18]);
  }
  pier.finish();

  const frame = batches(wheel, 'Ferris supports');
  const { hubHeight } = FERRIS_WHEEL;
  for (const z of [-0.9, 0.9]) {
    for (const x of [-1.3, 1.3]) {
      frame.box(iron, [x, 1.74, z], [0.42, 0.08, 0.3]);
      frame.rod(cream, [x, 1.78, z], [0, hubHeight, z], 0.095);
    }
    frame.rod(cream, [0, hubHeight, z - 0.1], [0, hubHeight, z + 0.1], 0.21);
  }
  for (const x of [-1.3, 1.3]) {
    frame.rod(iron, [x, 1.9, -0.9], [x, 1.9, 0.9], 0.04);
  }
  frame.rod(iron, [-1.2, 2.05, -0.9], [1.2, 2.05, -0.9], 0.035);
  frame.rod(iron, [0, hubHeight, -1.1], [0, hubHeight, 1.1], 0.095);
  frame.box(cream, [0, 1.785, 0.58], [0.85, 0.17, 0.63]);
  for (const x of [-0.63, 0.63]) {
    frame.rod(iron, [x, 1.7, 1.05], [x, 2.15, 1.05], 0.025);
    frame.rod(iron, [x, 1.7, 1.78], [x, 2.15, 1.78], 0.025);
    frame.rod(iron, [x, 2.15, 1.05], [x, 2.15, 1.78], 0.025);
  }
  frame.finish();

  const rotor = new THREE.Group();
  rotor.name = 'animated_ferris_wheel';
  rotor.position.y = hubHeight;
  wheel.add(rotor);
  const rotating = batches(rotor, 'Ferris rim and spokes');
  const rimGeometry = new THREE.TorusGeometry(FERRIS_WHEEL.radius, 0.055, 6, 64);
  const innerRimGeometry = new THREE.TorusGeometry(FERRIS_WHEEL.radius - 0.15, 0.022, 4, 64);
  const bandGeometry = new THREE.TorusGeometry(FERRIS_WHEEL.radius, 0.014, 4, 96);
  const gondolas = [];
  for (const z of [-0.42, 0.42]) {
    rotating.part(rimGeometry, cream, [0, 0, z]);
    rotating.part(innerRimGeometry, cream, [0, 0, z]);
    rotating.part(bandGeometry, bandMaterial, [0, 0, z < 0 ? -0.485 : 0.485]);
  }
  for (let i = 0; i < FERRIS_WHEEL.gondolas; i++) {
    const angle = i / FERRIS_WHEEL.gondolas * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * FERRIS_WHEEL.radius;
    const y = Math.sin(angle) * FERRIS_WHEEL.radius;
    for (const z of [-0.42, 0.42]) {
      rotating.rod(cream, [0, 0, z], [x, y, z], 0.028);
      rotating.rod(bandMaterial, [x * 0.13, y * 0.13, z < 0 ? -0.455 : 0.455],
        [x * 0.95, y * 0.95, z < 0 ? -0.455 : 0.455], 0.008);
    }
    rotating.rod(iron, [x, y, -0.42], [x, y, 0.42], 0.022);
    const gondola = new THREE.Object3D();
    gondola.name = `Ferris gondola ${i + 1}`;
    gondola.position.set(x, y, 0);
    rotor.add(gondola);
    gondolas.push(gondola);
  }
  rotating.rod(cream, [0, 0, -0.46], [0, 0, 0.46], 0.24);
  for (const z of [-0.49, 0.49]) {
    rotating.rod(teal, [0, 0, z - 0.03], [0, 0, z + 0.03], 0.16);
  }
  rotating.finish();
  rimGeometry.dispose();
  innerRimGeometry.dispose();
  bandGeometry.dispose();

  const bulbGeometry = new THREE.IcosahedronGeometry(0.045, 0);
  const bulbs = new THREE.InstancedMesh(bulbGeometry, bulbMaterial, 100);
  bulbs.name = 'Ferris rim bulbs';
  const bulbTransform = new THREE.Object3D();
  for (let i = 0; i < bulbs.count; i++) {
    const angle = (i % 50) / 50 * Math.PI * 2;
    bulbTransform.position.set(Math.cos(angle) * FERRIS_WHEEL.radius,
      Math.sin(angle) * FERRIS_WHEEL.radius, i < 50 ? -0.49 : 0.49);
    bulbTransform.updateMatrix();
    bulbs.setMatrixAt(i, bulbTransform.matrix);
  }
  bulbs.instanceMatrix.needsUpdate = true;
  rotor.add(bulbs);

  const template = new THREE.Group();
  const cabin = batches(template, 'Ferris gondolas');
  const shellGeometry = new THREE.CylinderGeometry(0.38, 0.32, 0.29, 4, 1, false, Math.PI / 4);
  cabin.part(shellGeometry, cabinPaint, [0, -0.565, 0], [1.06, 1, 0.94]);
  shellGeometry.dispose();
  cabin.box(cream, [0, -0.2, 0], [0.63, 0.055, 0.57]);
  cabin.box(cream, [0, -0.71, 0], [0.5, 0.035, 0.45]);
  for (const x of [-0.235, 0.235]) {
    for (const z of [-0.2, 0.2]) {
      cabin.box(cream, [x, -0.34, z], [0.025, 0.25, 0.025]);
    }
  }
  for (const z of [-0.2, 0.2]) {
    cabin.rod(iron, [0, 0, z], [0, -0.175, z], 0.016);
    cabin.box(iron, [0, -0.39, z * 0.75], [0.37, 0.035, 0.08]);
    cabin.rod(iron, [0, -0.23, z * 1.2], [0, -0.27, z * 1.2], 0.008);
    cabin.box(iron, [0, -0.265, z * 1.2], [0.1, 0.015, 0.05]);
    cabin.box(bulbMaterial, [0, -0.31, z * 1.2], [0.075, 0.075, 0.04]);
  }
  cabin.finish();
  const palette = ['#63867c', '#bb7261', '#b39458'].map(color => new THREE.Color(color));
  const cabinMeshes = template.children.map(mesh => {
    const instances = new THREE.InstancedMesh(mesh.geometry, mesh.material, FERRIS_WHEEL.gondolas);
    instances.name = mesh.name;
    instances.castShadow = instances.receiveShadow = mesh.material !== bulbMaterial;
    instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Fixed sweep bounds avoid stale instance culling as upright cabins move.
    instances.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, FERRIS_WHEEL.hubHeight - 0.36, 0), FERRIS_WHEEL.radius + 0.85
    );
    if (mesh.material === cabinPaint) {
      for (let i = 0; i < instances.count; i++) {
        instances.setColorAt(i, palette[i % palette.length]);
      }
    }
    wheel.add(instances);
    return instances;
  });
  const instanceMatrix = new THREE.Matrix4();
  function update(time) {
    if (!Number.isFinite(time) || time < 0) throw new RangeError('Wheel time must be finite and nonnegative');
    const angle = (time % FERRIS_WHEEL.revolutionSeconds) / FERRIS_WHEEL.revolutionSeconds * Math.PI * 2;
    rotor.rotation.z = angle;
    rotor.updateMatrix();
    for (let i = 0; i < gondolas.length; i++) {
      const gondola = gondolas[i];
      gondola.rotation.z = -angle;
      gondola.updateMatrix();
      instanceMatrix.multiplyMatrices(rotor.matrix, gondola.matrix);
      cabinMeshes.forEach(mesh => mesh.setMatrixAt(i, instanceMatrix));
    }
    cabinMeshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
  }
  function setDusk(dusk) {
    bulbMaterial.emissiveIntensity = dusk ? 3 : 0.4;
    bandMaterial.emissiveIntensity = dusk ? 1.2 : 0.15;
  }
  update(0);
  return { group, rotor, gondolas, update, setDusk };
}
