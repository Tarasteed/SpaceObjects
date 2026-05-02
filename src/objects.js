import * as THREE from "three";
import { Lensflare, LensflareElement } from "three/addons/objects/Lensflare.js";
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

export function createLensFlare(sunMesh) {
  const loader = new THREE.TextureLoader();

  // lensflare0 = texture avec vrais rayons
  loader.load(
    "https://threejs.org/examples/textures/lensflare/lensflare0.png",
    (tex) => {
      // Couche 1 — rayons proches, moyennement intenses
      const mat1 = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 0.02,
        color: new THREE.Color(1.0, 0.8, 0.4),
      });
      const sprite1 = new THREE.Sprite(mat1);
      sprite1.scale.set(12, 12, 1);
      sunMesh.add(sprite1);

      // Couche 2 — rayons lointains, très subtils
      const mat2 = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 0.07,
        color: new THREE.Color(1.0, 0.7, 0.3),
      });
      const sprite2 = new THREE.Sprite(mat2);
      sprite2.scale.set(40, 40, 1);
      sunMesh.add(sprite2);

      // Couche 3 — halo très lointain, quasi invisible
      const mat3 = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 0.003,
        color: new THREE.Color(1.0, 0.6, 0.2),
      });
      const sprite3 = new THREE.Sprite(mat3);
      sprite3.scale.set(175, 175, 1);
      sunMesh.add(sprite3);
    }
  );
}
