import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const rodGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
const up = new THREE.Vector3(0, 1, 0);

export function createGeometryBatch(parent, name, unlitMaterials = new Set()) {
  const buckets = new Map();
  const transform = new THREE.Object3D();
  function part(geometry, material, position, scale = [1, 1, 1], quaternion = null, tint = null) {
    transform.position.fromArray(position);
    transform.scale.fromArray(scale);
    if (quaternion) transform.quaternion.copy(quaternion);
    else transform.quaternion.identity();
    transform.updateMatrix();
    const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    copy.deleteAttribute('uv');
    copy.applyMatrix4(transform.matrix);
    if (material.vertexColors) {
      const color = tint instanceof THREE.Color ? tint : new THREE.Color(tint ?? '#ffffff');
      const colors = new Float32Array(copy.getAttribute('position').count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b;
      }
      copy.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    if (!buckets.has(material)) buckets.set(material, []);
    buckets.get(material).push(copy);
  }
  function box(material, position, size, yaw = 0, tint = null) {
    const rotation = yaw instanceof THREE.Quaternion ? yaw
      : new THREE.Quaternion().setFromAxisAngle(up, yaw);
    part(boxGeometry, material, position, size, rotation, tint);
  }
  function rod(material, start, end, radius, tint = null) {
    const from = new THREE.Vector3().fromArray(start);
    const to = new THREE.Vector3().fromArray(end);
    const direction = to.clone().sub(from);
    const length = direction.length();
    if (length <= 0) throw new RangeError(`${name}: a beam must have positive length`);
    part(rodGeometry, material, from.add(to).multiplyScalar(0.5).toArray(),
      [radius, length, radius],
      new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()), tint);
  }
  function finish() {
    const meshes = [];
    for (const [material, parts] of buckets) {
      const geometry = mergeGeometries(parts, false);
      if (!geometry) throw new Error(`Cannot batch ${name}: ${material.name}`);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${name}: ${material.name}`;
      mesh.castShadow = mesh.receiveShadow = !unlitMaterials.has(material);
      parent.add(mesh);
      meshes.push(mesh);
      parts.forEach(part => part.dispose());
    }
    buckets.clear();
    return meshes;
  }
  return { part, box, rod, finish };
}

export function openQuayRailing(root, { names, axis, fixed, min, max, label }) {
  root.updateMatrixWorld(true);
  const crossAxis = axis === 'x' ? 'z' : 'x';
  const rails = names.map(name => {
    const rail = root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
    if (!rail?.isMesh) throw new Error(`Cannot connect ${label}: missing ${name}`);
    const bounds = new THREE.Box3().setFromObject(rail);
    if (bounds.min[axis] >= min || bounds.max[axis] <= max) {
      throw new Error(`Cannot connect ${label}: entrance is outside ${name}`);
    }
    return { rail, bounds };
  });
  const railGeometry = new THREE.CylinderGeometry(0.018, 0.018, 1, 8);
  function point(along, y) {
    return axis === 'x' ? new THREE.Vector3(along, y, fixed) : new THREE.Vector3(fixed, y, along);
  }
  for (const { rail, bounds } of rails) {
    const y = (bounds.min.y + bounds.max.y) / 2;
    for (const [start, end] of [[bounds.min[axis], min], [max, bounds.max[axis]]]) {
      const from = root.worldToLocal(point(start, y));
      const to = root.worldToLocal(point(end, y));
      const direction = to.clone().sub(from);
      const segment = new THREE.Mesh(railGeometry, rail.material);
      segment.name = `${label} entrance railing`;
      segment.position.copy(from).add(to).multiplyScalar(0.5);
      segment.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      segment.scale.y = direction.length();
      root.add(segment);
    }
    rail.removeFromParent();
  }
  const blockedPosts = [];
  const position = new THREE.Vector3();
  root.traverse(obj => {
    if (!obj.isMesh || !obj.name.startsWith('Quay_railing_upright')) return;
    obj.getWorldPosition(position);
    if (Math.abs(position[crossAxis] - fixed) < 0.05
      && position[axis] > min - 0.03 && position[axis] < max + 0.03) blockedPosts.push(obj);
  });
  blockedPosts.forEach(post => post.removeFromParent());
  const postGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8);
  for (const along of [min, max]) {
    const post = new THREE.Mesh(postGeometry, rails[0].rail.material);
    post.name = `${label} entrance post`;
    post.position.copy(root.worldToLocal(point(along, 2.06)));
    root.add(post);
  }
}
