import {
  camera,
  controls,
  setSkipControlsUpdate,
  skipControlsUpdate,
} from "./scene.js";
import * as THREE from "three";

const state = {
  mode: "free",
  targetMesh: null,
  radiusMultiplier: 4,
  targetPosition: new THREE.Vector3(),
  targetLookAt: new THREE.Vector3(),
  spherical: new THREE.Spherical(),
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
};

const canvas = document.getElementById("canvas");

// Listeners drag/zoom — actifs seulement en mode following
canvas.addEventListener("mousedown", (e) => {
  if (state.mode !== "following" || e.button !== 0) return;
  state.isDragging = true;
  state.lastMouseX = e.clientX;
  state.lastMouseY = e.clientY;
});

canvas.addEventListener("mousemove", (e) => {
  if (!state.isDragging || state.mode !== "following") {
    return;
  }
  const dx = e.clientX - state.lastMouseX;
  const dy = e.clientY - state.lastMouseY;
  state.lastMouseX = e.clientX;
  state.lastMouseY = e.clientY;
  state.spherical.theta -= dx * 0.005;
  state.spherical.phi -= dy * 0.005;
  state.spherical.phi = Math.max(
    0.05,
    Math.min(Math.PI - 0.05, state.spherical.phi)
  );
});

canvas.addEventListener("mouseup", () => {
  state.isDragging = false;
});
canvas.addEventListener("mouseleave", () => {
  state.isDragging = false;
});

canvas.addEventListener(
  "wheel",
  (e) => {
    if (state.mode !== "following") return;
    state.spherical.radius *= 1 + e.deltaY * 0.001;
    const r = state.targetMesh?.geometry?.boundingSphere?.radius ?? 1;
    state.spherical.radius = Math.max(
      r * 1.5,
      Math.min(r * 20, state.spherical.radius)
    );
  },
  { passive: true }
);

export function updateCamera() {
  if (state.mode === "free") return;

  if (state.mode === "zooming") {
    const worldPos = new THREE.Vector3();
    state.targetMesh.getWorldPosition(worldPos);

    if (!state.targetMesh.geometry.boundingSphere) {
      state.targetMesh.geometry.computeBoundingSphere();
    }

    const radius = state.targetMesh.geometry.boundingSphere.radius;

    // Recalcule la cible seulement si pas encore initialisée
    // (évite que la cible bouge avec la planète pendant le lerp)
    if (!state.zoomInitialized) {
      const offset = new THREE.Vector3(
        0,
        radius * 1.5,
        radius * state.radiusMultiplier
      );
      state.targetPosition.copy(worldPos).add(offset);
      state.zoomInitialized = true;
    }

    state.targetLookAt.copy(worldPos);

    camera.position.lerp(state.targetPosition, 0.025);
    controls.target.lerp(state.targetLookAt, 0.03);
    controls.update();

    // ✅ Seuil plus large — on bascule en following avant d'arriver
    // La planète a moins le temps de se décaler
    const dist = camera.position.distanceTo(state.targetPosition);
    if (dist < radius * 1.2) {
      const planetPos = new THREE.Vector3();
      state.targetMesh.getWorldPosition(planetPos);
      state.spherical.setFromVector3(camera.position.clone().sub(planetPos));

      controls.dispose();
      setSkipControlsUpdate(true);
      state.zoomInitialized = false;
      state.mode = "following";
    }
    
    return;
  }

  if (state.mode === "following") {
    const planetPos = new THREE.Vector3();
    state.targetMesh.getWorldPosition(planetPos);
    const offset = new THREE.Vector3().setFromSpherical(state.spherical);
    camera.position.copy(planetPos).add(offset);
    camera.lookAt(planetPos);
    // PAS de controls.update() — OrbitControls est disposé, l'appeler
    // recalculerait camera.position depuis ses spherical internes

    return;
  }

  if (state.mode === "returning") {
    camera.position.lerp(state.targetPosition, 0.025);
    controls.target.lerp(state.targetLookAt, 0.03);
    controls.update();

    const dist = camera.position.distanceTo(state.targetPosition);
    if (dist < 0.5) {
      camera.position.copy(state.targetPosition);
      controls.target.copy(state.targetLookAt);
      setSkipControlsUpdate(false);
      controls.connect(document.getElementById("canvas"));
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
  state.zoomInitialized = false;
  controls.enabled = false;
  state.isDragging = false;
}

export function zoomToSystem() {
  if (state.mode === "following") {
    controls.connect(document.getElementById("canvas"));
  }
  state.targetPosition.set(0, 24, 60);
  state.targetLookAt.set(0, 0, 0);
  state.mode = "returning";
  state.targetMesh = null;
  controls.enabled = false;
  state.isDragging = false;
}

export function zoomToBelt() {
  // Réactive les controls si on était en following
  if (state.mode === "following") {
    controls.connect(document.getElementById("canvas"));
  }
  // Côté soleil (Z négatif) — on regarde la ceinture avec le soleil dans le dos
  // Faible inclinaison Y pour voir l'épaisseur sans trop plonger
  state.targetPosition.set(0, 5, 15);
  state.targetLookAt.set(0, 0, 26);
  state.mode = "returning";
  state.targetMesh = null;
  controls.enabled = false;
  state.isDragging = false;
}

export function isFollowing() {
  return state.mode === "following" || state.mode === "zooming";
}
