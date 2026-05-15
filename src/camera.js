import { camera, controls, setSkipControlsUpdate } from "./scene.js";
import * as THREE from "three";

// #region ── Enum des modes caméra ────────────────────────────────────────────

export const CameraMode = Object.freeze({
  FREE: "free",
  ZOOMING: "zooming",
  FOLLOWING: "following",
  RETURNING: "returning",
});

// #endregion

// #region ── État interne ─────────────────────────────────────────────────────

const state = {
  mode: CameraMode.FREE,
  targetMesh: null,
  radiusMultiplier: 4,
  targetPosition: new THREE.Vector3(),
  targetLookAt: new THREE.Vector3(),
  spherical: new THREE.Spherical(),
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
  pinchDist: undefined,
};

// #endregion

// #region ── Drag et zoom en mode FOLLOWING ───────────────────────────────────

// Les OrbitControls sont disposés en mode FOLLOWING — on gère drag et zoom manuellement
// via THREE.Spherical sur le canvas pour orbiter autour de la planète ciblée.
const canvas = document.getElementById("canvas");

canvas.addEventListener("mousedown", (e) => {
  if (state.mode !== CameraMode.FOLLOWING || e.button !== 0) return;
  state.isDragging = true;
  state.lastMouseX = e.clientX;
  state.lastMouseY = e.clientY;
});

canvas.addEventListener("mousemove", (e) => {
  if (!state.isDragging || state.mode !== CameraMode.FOLLOWING) return;
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

// #region ── Touch events (mobile) en mode FOLLOWING ─────────────────────────

canvas.addEventListener(
  "touchstart",
  (e) => {
    if (state.mode !== CameraMode.FOLLOWING) return;
    if (e.touches.length === 1) {
      state.isDragging = true;
      state.lastMouseX = e.touches[0].clientX;
      state.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Pinch : on mémorise la distance initiale
      state.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      state.pinchDist = Math.hypot(dx, dy);
    }
  },
  { passive: true }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    if (state.mode !== CameraMode.FOLLOWING) return;

    if (e.touches.length === 1 && state.isDragging) {
      const dx = e.touches[0].clientX - state.lastMouseX;
      const dy = e.touches[0].clientY - state.lastMouseY;
      state.lastMouseX = e.touches[0].clientX;
      state.lastMouseY = e.touches[0].clientY;
      state.spherical.theta -= dx * 0.005;
      state.spherical.phi -= dy * 0.005;
      state.spherical.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, state.spherical.phi)
      );
    } else if (e.touches.length === 2 && state.pinchDist !== undefined) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const scale = state.pinchDist / newDist; // > 1 = pinch in = zoom out
      state.pinchDist = newDist;
      state.spherical.radius *= scale;
      const r = state.targetMesh?.geometry?.boundingSphere?.radius ?? 1;
      state.spherical.radius = Math.max(
        r * 1.5,
        Math.min(r * 20, state.spherical.radius)
      );
    }
  },
  { passive: true }
);

canvas.addEventListener(
  "touchend",
  () => {
    state.isDragging = false;
    state.pinchDist = undefined;
  },
  { passive: true }
);

// #endregion

canvas.addEventListener(
  "wheel",
  (e) => {
    if (state.mode !== CameraMode.FOLLOWING) return;
    state.spherical.radius *= 1 + e.deltaY * 0.001;
    const r = state.targetMesh?.geometry?.boundingSphere?.radius ?? 1;
    state.spherical.radius = Math.max(
      r * 1.5,
      Math.min(r * 20, state.spherical.radius)
    );
  },
  { passive: true }
);

// #endregion

// #region ── Mise à jour caméra (appelée chaque frame) ────────────────────────

export function updateCamera() {
  if (state.mode === CameraMode.FREE) return;

  if (state.mode === CameraMode.ZOOMING) {
    const worldPos = new THREE.Vector3();
    state.targetMesh.getWorldPosition(worldPos);

    if (!state.targetMesh.geometry.boundingSphere) {
      state.targetMesh.geometry.computeBoundingSphere();
    }

    const radius = state.targetMesh.geometry.boundingSphere.radius;

    // La cible est initialisée une seule fois au début du zoom pour éviter
    // qu'elle suive la planète pendant le lerp (source du snap en fin de zoom)
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

    // Seuil plus large (radius * 1.2) — on bascule en FOLLOWING avant d'arriver
    // pour que la planète ait moins le temps de se décaler
    const dist = camera.position.distanceTo(state.targetPosition);
    if (dist < radius * 1.2) {
      const planetPos = new THREE.Vector3();
      state.targetMesh.getWorldPosition(planetPos);
      state.spherical.setFromVector3(camera.position.clone().sub(planetPos));

      controls.dispose();
      setSkipControlsUpdate(true);
      state.zoomInitialized = false;
      state.mode = CameraMode.FOLLOWING;
    }

    return;
  }

  if (state.mode === CameraMode.FOLLOWING) {
    const planetPos = new THREE.Vector3();
    state.targetMesh.getWorldPosition(planetPos);
    const offset = new THREE.Vector3().setFromSpherical(state.spherical);
    camera.position.copy(planetPos).add(offset);
    camera.lookAt(planetPos);
    // PAS de controls.update() — OrbitControls est disposé, l'appeler
    // recalculerait camera.position depuis ses spherical internes
    return;
  }

  if (state.mode === CameraMode.RETURNING) {
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
      state.mode = CameraMode.FREE;
      state.targetMesh = null;
    }
    return;
  }
}

// #endregion

// #region ── Actions de navigation ────────────────────────────────────────────

export function zoomTo(mesh, radiusMultiplier = 4) {
  if (state.mode === CameraMode.FOLLOWING) {
    controls.connect(document.getElementById("canvas"));
  }
  state.targetMesh = mesh;
  state.radiusMultiplier = radiusMultiplier;
  state.mode = CameraMode.ZOOMING;
  state.zoomInitialized = false;
  controls.enabled = false;
  state.isDragging = false;
}

export function zoomToSystem() {
  if (state.mode === CameraMode.FOLLOWING) {
    controls.connect(document.getElementById("canvas"));
  }
  state.targetPosition.set(0, 40, 100);
  state.targetLookAt.set(0, 0, 0);
  state.mode = CameraMode.RETURNING;
  state.targetMesh = null;
  controls.enabled = false;
  state.isDragging = false;
}

export function zoomToBelt() {
  if (state.mode === CameraMode.FOLLOWING) {
    controls.connect(document.getElementById("canvas"));
  }
  // Côté soleil (Z négatif) — on regarde la ceinture avec le soleil dans le dos
  // Faible inclinaison Y pour voir l'épaisseur sans trop plonger
  state.targetPosition.set(0, 5, 15);
  state.targetLookAt.set(0, 0, 26);
  state.mode = CameraMode.RETURNING;
  state.targetMesh = null;
  controls.enabled = false;
  state.isDragging = false;
}

// Reconnecte les controls si on était en FOLLOWING avant de changer de cible
export function prepareForNewTarget() {
  if (state.mode === CameraMode.FOLLOWING) {
    controls.connect(document.getElementById("canvas"));
  }
}

// #endregion

// #region ── Accesseurs ───────────────────────────────────────────────────────

export function isZooming() {
  return state.mode === CameraMode.ZOOMING;
}

export function getCameraMode() {
  return state.mode;
}

// #endregion
