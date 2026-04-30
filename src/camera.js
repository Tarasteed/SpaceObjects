import { camera, controls } from "./scene.js";
import * as THREE from "three";

// État de l'animation caméra
const state = {
  animating: false,
  targetPosition: new THREE.Vector3(),
  targetLookAt: new THREE.Vector3(),
};

// Appelé à chaque frame depuis la boucle principale
export function updateCamera() {
  if (!state.animating) return;

  // Lerp position — 5% de rapprochement par frame
  camera.position.lerp(state.targetPosition, 0.05);

  // Lerp de la cible des OrbitControls
  controls.target.lerp(state.targetLookAt, 0.05);
  controls.update();

  // Arrête l'animation quand on est assez proche
  const distPos = camera.position.distanceTo(state.targetPosition);
  if (distPos < 0.01) {
    state.animating = false;
    camera.position.copy(state.targetPosition);
    controls.target.copy(state.targetLookAt);
  }
}

// Zoome vers un mesh Three.js
export function zoomTo(mesh, radiusMultiplier = 4) {
  // Position mondiale du mesh (même s'il est enfant d'un pivot)
  const worldPos = new THREE.Vector3();
  mesh.getWorldPosition(worldPos);

  // Récupère le rayon de la sphère depuis sa géométrie
  mesh.geometry.computeBoundingSphere();
  const radius = mesh.geometry.boundingSphere.radius;

  // La caméra se place à radiusMultiplier × le rayon de l'objet
  const offset = new THREE.Vector3(0, radius * 1.5, radius * radiusMultiplier);
  state.targetPosition.copy(worldPos).add(offset);
  state.targetLookAt.copy(worldPos);

  state.animating = true;
}

// Revient à la vue système solaire complet
export function zoomToSystem() {
  state.targetPosition.set(0, 18, 45);
  state.targetLookAt.set(0, 0, 0);
  state.animating = true;
}