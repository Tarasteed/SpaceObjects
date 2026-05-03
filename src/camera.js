import { camera, controls } from "./scene.js";
import * as THREE from "three";

const state = {
  mode: "free",
  targetMesh: null,
  targetPosition: new THREE.Vector3(),
  targetLookAt: new THREE.Vector3(),
  lastWorldPos: new THREE.Vector3(), // ← clé du fix
  radiusMultiplier: 4,
};

export function updateCamera() {
  if (state.mode === "free") return;

  if (state.mode === "following") {
    const newWorldPos = new THREE.Vector3();
    state.targetMesh.getWorldPosition(newWorldPos);

    // Déplace caméra ET cible du même delta que la planète
    // La distance caméra/cible reste constante → plus de dézoom
    const delta = newWorldPos.clone().sub(state.lastWorldPos);
    camera.position.add(delta);
    controls.target.add(delta);
    controls.update();

    state.lastWorldPos.copy(newWorldPos);
    return;
  }

  if (state.mode === "zooming") {
    const worldPos = new THREE.Vector3();
    state.targetMesh.getWorldPosition(worldPos);

    if (!state.targetMesh.geometry.boundingSphere) {
      state.targetMesh.geometry.computeBoundingSphere();
    }

    const radius = state.targetMesh.geometry.boundingSphere.radius;
    const offset = new THREE.Vector3(
      0,
      radius * 1.5,
      radius * state.radiusMultiplier
    );
    state.targetPosition.copy(worldPos).add(offset);
    state.targetLookAt.copy(worldPos);

    camera.position.lerp(state.targetPosition, 0.05);
    controls.target.lerp(state.targetLookAt, 0.08);
    controls.update();

    const dist = camera.position.distanceTo(state.targetPosition);
    if (dist < radius * 0.1) {
      // Initialise lastWorldPos juste avant de passer en following
      state.targetMesh.getWorldPosition(state.lastWorldPos);
      // Force la position finale propre
      camera.position.copy(state.targetPosition);
      controls.target.copy(state.targetLookAt);
      controls.update();
      state.mode = "following";
      controls.enabled = true;
    }
    return;
  }

  if (state.mode === "returning") {
    controls.enabled = false;

    camera.position.lerp(state.targetPosition, 0.05);
    controls.target.lerp(state.targetLookAt, 0.08);
    controls.update();

    const dist = camera.position.distanceTo(state.targetPosition);
    if (dist < 0.1) {
      camera.position.copy(state.targetPosition);
      controls.target.copy(state.targetLookAt);
      controls.enabled = true;
      controls.update();
      state.mode = "free";
      state.targetMesh = null;
    }
    return;
  }
}

export function zoomTo(mesh, radiusMultiplier = 4) {
  state.targetMesh = mesh;
  state.radiusMultiplier = radiusMultiplier;
  state.mode = "zooming";
  controls.enabled = false;
}

export function zoomToSystem() {
  state.targetPosition.set(0, 24, 60);
  state.targetLookAt.set(0, 0, 0);
  state.mode = "returning";
  state.targetMesh = null;
}

export function isFollowing() {
  return state.mode === "following" || state.mode === "zooming";
}
