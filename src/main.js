import { scene, startLoop, camera } from "./scene.js";
import { createPlanet, createSaturnRings } from "./objects.js";
import {
  buildSidebar,
  showTooltip,
  hideTooltip,
  buildBackButton,
  showBackButton,
  buildSimControls,
} from "./ui.js";
import { updateCamera, zoomTo, zoomToSystem } from "./camera.js";
import * as THREE from "three";
import { sim } from "./state.js";
import { OBJECTS } from "./data.js";

// Puis dérive les variables dont tu as besoin
const planetsData = OBJECTS.filter((o) => o.type === "planet");
const sunData = OBJECTS.find((o) => o.id === "sun");
const moonData = OBJECTS.find((o) => o.id === "moon");

// Map id → mesh (pour le zoom depuis la sidebar)
export const meshById = new Map();

const starSystems = [];

// ── Étoiles de fond ──────────────────────────────────────────
function createStars() {
  // Texture circulaire — évite les carrés
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);
  const starTexture = new THREE.CanvasTexture(canvas);

  const starGroups = [
    { count: 2000, color: new THREE.Color("#ffccaa"), size: 1.2, minDist: 80 }, // rouges/orangées
    { count: 800, color: new THREE.Color("#fff5e0"), size: 1.5, minDist: 80 }, // jaunes/blanches
    { count: 300, color: new THREE.Color("#ffffff"), size: 1.8, minDist: 100 }, // blanches
    { count: 80, color: new THREE.Color("#aabbff"), size: 2.8, minDist: 120 }, // bleues
  ];

  starGroups.forEach((group) => {
    const positions = [];
    for (let i = 0; i < group.count; i++) {
      const r = group.minDist + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const mat = new THREE.PointsMaterial({
      color: group.color,
      size: group.size,
      map: starTexture, // ← dans le material
      alphaTest: 0.01, // ← dans le material
      sizeAttenuation: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);
    starSystems.push({ points, isNebula: false, baseOpacity: 1.0 });
  });
}

createStars();

// ── Nébuleuse et poussière interstellaire ────────────────────
function createNebula() {
  // Crée une texture circulaire douce pour éviter les carrés
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const particleTexture = new THREE.CanvasTexture(canvas);

  // Nuages de nébuleuse — loin, colorés, petits et ronds
  const nebulaGroups = [
    { count: 120, color: "#2a1550", size: 3.5, dist: 120, opacity: 0.18 }, // violet
    { count: 100, color: "#0a1a40", size: 4.0, dist: 150, opacity: 0.15 }, // bleu nuit
    { count: 80, color: "#3a0a25", size: 3.0, dist: 130, opacity: 0.14 }, // rose sombre
    { count: 60, color: "#050f20", size: 4.5, dist: 180, opacity: 0.12 }, // bleu très sombre
  ];

  nebulaGroups.forEach((group) => {
    const positions = [];
    for (let i = 0; i < group.count; i++) {
      const r = group.dist + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) * 0.3, // très aplati — plan galactique
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(group.color),
      size: group.size,
      map: particleTexture, // ← texture circulaire, plus de carrés
      sizeAttenuation: true,
      transparent: true,
      opacity: group.opacity,
      depthWrite: false,
      alphaTest: 0.01,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    starSystems.push({ points, isNebula: true, baseOpacity: group.opacity });
  });

  // Poussière interstellaire — petite, grise, ronde
  const dustPositions = [];
  for (let i = 0; i < 400; i++) {
    const r = 50 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    dustPositions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) * 0.4,
      r * Math.sin(phi) * Math.sin(theta)
    );
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(dustPositions, 3)
  );
  const dustMat = new THREE.PointsMaterial({
    color: new THREE.Color("#2a3550"),
    size: 0.8,
    map: particleTexture,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    alphaTest: 0.01,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);
  starSystems.push({ points: dust, isNebula: false, baseOpacity: 0.2 });
}

createNebula();

// ── Soleil ───────────────────────────────────────
const sunMesh = createPlanet({
  radius: sunData.radius,
  texturePath: sunData.texturePath,
  position: [0, 0, 0],
  emissive: sunData.emissive,
});

sunMesh.userData.name = sunData.name;
sunMesh.userData.id = sunData.id;
meshById.set("sun", sunMesh);

// ── Création des pivots d'orbite ─────────────────
// Un "pivot" est un Object3D invisible placé au centre (0,0,0).
// La planète est son enfant, décalée sur l'axe X de orbitR.
// Faire tourner le pivot fait orbiter la planète autour du Soleil.
const pivots = planetsData.map((p) => {
  const pivot = new THREE.Object3D();
  scene.add(pivot);

  // La planète est placée à x=orbitR dans le référentiel du pivot
  const mesh = createPlanet({
    radius: p.radius,
    texturePath: p.texturePath,
    position: [p.orbitR, 0, 0],
  });

  // On retire le mesh de la scène et on le met sous le pivot
  scene.remove(mesh);
  pivot.add(mesh);

  // On stocke le nom pour les infobulles plus tard
  mesh.userData.name = p.name;
  mesh.userData.id = p.id;
  meshById.set(p.id, mesh);

  // Anneaux pour Saturne
  if (p.rings) {
    createSaturnRings(mesh);
  }

  // ── Lune ──────────────────────────────────────
  // La Lune est enfant d'un pivot attaché à la Terre,
  // elle-même enfant du pivot terrestre.
  // Elle orbite donc autour de la Terre, qui orbite autour du Soleil.
  let moonPivot = null;
  let moonMesh = null;

  if (p.hasMoon) {
    moonPivot = new THREE.Object3D();
    mesh.add(moonPivot); // attaché à la Terre, pas à la scène

    moonMesh = createPlanet({
      radius: moonData.radius,
      texturePath: moonData.texturePath,
      position: [moonData.orbitR, 0, 0],
    });

    scene.remove(moonMesh);
    moonPivot.add(moonMesh);
    moonMesh.userData.name = moonData.name;
    moonMesh.userData.id = moonData.id;
    meshById.set(moonData.id, moonMesh);
  }

  return {
    pivot,
    speed: p.speed,
    rotSpeed: p.rotSpeed,
    mesh,
    moonPivot,
    moonMesh,
  };
});

// ── Boucle d'animation ────────────────────────────
// t est un compteur de temps qui grandit à chaque frame.
// On multiplie t par speed pour que chaque planète aille à sa vitesse.
let t = 0;

startLoop(() => {
  // N'avance le temps que si pas en pause
  if (!sim.paused) {
    t += 0.005 * sim.speedFactor;
  }

  // Fade des étoiles selon distance caméra
  const camDist = camera.position.length(); // distance au centre

  starSystems.forEach(({ points, isNebula, baseOpacity }) => {
    const mat = points.material;
    if (isNebula) {
      const fade = THREE.MathUtils.clamp((camDist - 2) / 15, 0, 1);
      mat.opacity = fade * baseOpacity;
    } else {
      // Commence à disparaître à dist 3, complètement invisible à dist 8
      const fade = THREE.MathUtils.clamp((camDist - 1) / 15, 0, 1);
      mat.opacity = fade * baseOpacity;
    }
  });

  pivots.forEach(({ pivot, speed, rotSpeed, mesh, moonPivot, moonMesh }) => {
    pivot.rotation.y = t * speed;
    mesh.rotation.y = t * rotSpeed;
    // La Lune tourne ~13× plus vite que la Terre autour du Soleil
    if (moonPivot) {
      moonPivot.rotation.y = t * moonData.orbitalSpeed;
    }
    if (moonMesh) {
      moonMesh.rotation.y = t * moonData.rotSpeed; // rotation synchrone
    }
  });

  sunMesh.rotation.y = t * 0.037;

  updateCamera();
});

// Lance la sidebar — le callback sera complété à l'étape infobulles
buildSidebar((obj) => {
  showTooltip(obj);
  const mesh = meshById.get(obj.id);
  if (mesh) {
    zoomTo(mesh);
    showBackButton();
  }
});

buildBackButton(() => {
  zoomToSystem();
  hideTooltip(); // cache l'infobulle au retour
});

buildSimControls();
