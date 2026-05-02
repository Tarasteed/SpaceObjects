import * as THREE from "three";
import { scene } from "./scene.js";

const loader = new THREE.TextureLoader();

export function createPlanet({
  radius,
  texturePath,
  position,
  emissive = false,
  roughness = 0.8,
}) {
  const geo = new THREE.SphereGeometry(radius, 64, 64);

  // MeshBasicMaterial = ignore les lumières (pour le Soleil)
  // MeshStandardMaterial = réagit aux lumières (pour les planètes)
  const mat = emissive
    ? new THREE.MeshBasicMaterial({
        map: loader.load(texturePath),
        color: new THREE.Color(2.0, 1.6, 1.0),
      })
    : new THREE.MeshStandardMaterial({
        map: loader.load(texturePath),
        roughness: roughness, // 1.0 par défaut = trop mat
        metalness: 0.0,
      });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}

export function createSaturnRings(saturnMesh) {
  const geo = new THREE.RingGeometry(1.4, 2.4, 64);
  const mat = new THREE.MeshBasicMaterial({
    map: loader.load("/textures/2k_saturn_ring_alpha.png"),
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.01, // ignore les pixels quasi-transparent
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = Math.PI / 2 - 0.3;
  saturnMesh.add(ring);
}
